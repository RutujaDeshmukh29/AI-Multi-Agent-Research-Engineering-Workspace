# ========================
# app/agents/qa_agent.py
# QA Agent — Central Orchestration Controller
#
# CONCEPT: Intent Classification + Routing
# This agent is the "brain" of the system.
# Step 1: Classify what the user actually wants
# Step 2: Decide which agents should handle it
# Step 3: After all agents run, combine their outputs
#         into ONE coherent, well-structured response
#
# Think of it as the conductor of an orchestra.
# It doesn't play any instrument — it coordinates all of them.
# ========================

from app.services.groq_service import call_groq, call_groq_json
import json
import structlog

logger = structlog.get_logger()

INTENT_SYSTEM_PROMPT = """You are an AI intent classifier for a multi-agent engineering workspace.

Analyze the user's message and return a JSON object with:
{
  "intent": "research|engineering|planning|critique|innovation|general",
  "complexity": "low|medium|high",
  "requires_roadmap": true/false,
  "requires_checklist": true/false,
  "summary": "one sentence of what the user wants"
}

Rules for choosing intent:
- Use "planning" for requests to build, create, develop, or plan a project.
- Use "critique" for requests to review, audit, or find flaws in a plan or code.
- Use "innovation" for requests to brainstorm, improve, or optimize something.
- Use "engineering" for specific technical questions about architecture, code, or implementation.
- Use "research" for questions that require searching for information.
- Use "general" for conversational questions or when no other category fits.

- Set requires_roadmap=true when the user wants to build something end-to-end.
- Set requires_checklist=true when the user asks for steps, tasks, or a detailed plan."""

COMBINE_SYSTEM_PROMPT = """You are the final synthesis agent for an AI engineering workspace.

You receive outputs from multiple specialized AI agents. Your job is to:
1. Synthesize all outputs into ONE cohesive, well-structured response
2. Remove redundancy — don't repeat the same point from multiple agents
3. Use clear markdown formatting (headers, bullets, code blocks)
4. Lead with the most actionable information
5. End with a clear "Next Steps" section
6. Keep a conversational but expert tone — like a senior engineer mentoring a colleague

Be comprehensive but not verbose. Quality over quantity."""


def classify_intent(user_message: str, conversation_history: list[dict]) -> dict:
    """
    Step 1: Classify what the user wants and which agents to activate.
    Returns structured JSON with routing decisions.
    """
    messages = conversation_history[-4:] + [{"role": "user", "content": user_message}]

    try:
        result = call_groq_json(
            messages=messages,
            system_prompt=INTENT_SYSTEM_PROMPT,
            max_tokens=300,
        )
        data = json.loads(result)
        logger.info("Intent classified", intent=data.get("intent"))
        return data
    except Exception as e:
        logger.error("Intent classification failed", error=str(e))
        # Safe fallback
        return {
            "intent": "general",
            "complexity": "medium",
            "requires_roadmap": False,
            "requires_checklist": False,
            "summary": user_message[:100],
        }


def combine_agent_outputs(
    user_message: str,
    agent_outputs: dict[str, str],
    conversation_history: list[dict],
    user_memory_context: str = "",
) -> str:
    """
    Step 2: Combine all agent outputs into one final response.
    This is where the magic happens — turning 4 separate outputs
    into one coherent, useful answer.
    """
    # Build the synthesis prompt
    agents_text = "\n\n".join(
        f"### {agent.upper()} AGENT OUTPUT:\n{output}"
        for agent, output in agent_outputs.items()
        if output and output.strip()
    )

    memory_section = f"\n\nUser Context from Memory:\n{user_memory_context}" if user_memory_context else ""

    synthesis_messages = [
        {
            "role": "user",
            "content": f"""User asked: "{user_message}"
{memory_section}

Agent outputs to synthesize:
{agents_text}

Create a unified, expert response that incorporates the best insights from all agents."""
        }
    ]

    try:
        return call_groq(
            messages=synthesis_messages,
            system_prompt=COMBINE_SYSTEM_PROMPT,
            max_tokens=2000,
        )
    except Exception as e:
        logger.error("Combination failed", error=str(e))
        # Fallback: return all agent outputs concatenated
        return "\n\n".join(f"**{k.title()} Agent:**\n{v}" for k, v in agent_outputs.items())
