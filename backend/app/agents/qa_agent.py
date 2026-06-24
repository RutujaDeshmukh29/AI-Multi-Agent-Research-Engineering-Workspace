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

from app.services.groq_service import call_groq_async, call_groq_json, call_groq_json_async
import json
import structlog

logger = structlog.get_logger()

INTENT_SYSTEM_PROMPT = """You are an expert AI intent classifier for a multi-agent AI engineering workspace. Your task is to analyze the user's request and provide a detailed JSON object to orchestrate a team of specialized AI agents.

Analyze the user's message and the conversation history, then return a JSON object with the following schema:
{
  "intents": ["research" | "engineering" | "planning" | "critique" | "innovation" | "simple_qa"],
  "complexity": "low" | "medium" | "high",
  "summary": "A one-sentence summary of the user's core request."
}

**Agent Specializations & Routing Rules:**

*   **`research`**:
    *   **Use for:** Requests that require gathering, summarizing, or analyzing information from external sources. Look for keywords like "research," "find," "what are the latest trends," "compare," "summarize."
    *   **Examples:** "Research the latest trends in AI agents.", "Compare React and Vue for a new project.", "Find tutorials on FastAPI authentication."

*   **`engineering`**:
    *   **Use for:** Requests involving specific code, architecture design, implementation steps, or technical guidance. Look for keywords like "write code," "implement," "build," "refactor," "architecture," "how to," "debug," "fix."
    *   **Examples:** "Write a Python script to process a CSV.", "My roadmap generation is broken, can you fix it?", "How do I deploy a Next.js app to Vercel?"

*   **`planning`**:
    *   **Use for:** Requests that involve creating a project plan, roadmap, or a sequence of steps to build something. Look for keywords like "plan," "roadmap," "develop a plan for," "outline the steps to create."
    *   **Examples:** "Plan a full-stack AI project.", "Create a roadmap for building an e-commerce site.", "Outline the development phases for a new mobile app."

*   **`critique`**:
    *   **Use for:** Requests to review, audit, analyze, or find flaws in code, a plan, or an architecture. Look for keywords like "critique," "review," "find issues," "what are the cons," "improve this," "is this a good approach."
    *   **Examples:** "Critique my project plan.", "Review this code for security vulnerabilities.", "My agent routing seems inefficient, can you analyze and improve it?"

*   **`innovation`**:
    *   **Use for:** Requests that involve brainstorming new ideas, suggesting novel features, or finding creative solutions. This is for open-ended, ideation-focused queries.
    *   **Examples:** "Brainstorm innovative features for a fitness app.", "Suggest a novel application of LLMs in education.", "What are some creative ways to improve my agent's routing logic?"

*   **`simple_qa`**:
    *   **USE AS A LAST RESORT.** Only use for simple, factual questions that can be answered directly and do not require any of the specialized analysis from the agents above.
    *   **Examples:** "What is a vector database?", "What's the difference between AI and ML?", "Who created Python?".
    *   **Decision:** If a query is a `simple_qa`, the `intents` array should contain ONLY `"simple_qa"`.

**Multi-Intent & Complexity Rules:**

*   **CRITICAL RULE: A user request can and often will have multiple intents.** Your primary goal is to identify ALL relevant intents.
*   **Example 1:** "Plan a new AI app and write the starter code" has `["planning", "engineering"]` intents.
*   **Example 2:** "My agent routing isn't working well, it just defaults to QA. I want it to use the planner for roadmaps and the critic for analysis. Also, my roadmap generation is broken." This is a high-complexity request that should have `["critique", "planning", "engineering"]` in the `intents` array.
*   The `"complexity"` field should reflect the scope of the request. "What is AI?" is `low` complexity. "Build a social media app from scratch" is `high` complexity.

Your output must be ONLY the JSON object, with no other text or markdown.
"""

COMBINE_SYSTEM_PROMPT = """You are the final synthesis agent for an AI engineering workspace.

You receive outputs from multiple specialized AI agents. Your job is to:
1. Synthesize all outputs into ONE cohesive, well-structured response
2. Remove redundancy — don't repeat the same point from multiple agents
3. Use clear markdown formatting (headers, bullets, code blocks)
4. Lead with the most actionable information
5. End with a clear "Next Steps" section
6. Keep a conversational but expert tone — like a senior engineer mentoring a colleague

Be comprehensive but not verbose. Quality over quantity."""


async def classify_intent(user_message: str, conversation_history: list[dict]) -> dict:
    """
    Step 1: Classify what the user wants and which agents to activate.
    Returns structured JSON with routing decisions.
    """
    messages = conversation_history[-4:] + [{"role": "user", "content": user_message}]

    try:
        result = await call_groq_json_async(
            messages=messages,
            system_prompt=INTENT_SYSTEM_PROMPT,
            max_tokens=500,
        )
        # Clean potential markdown wrappers
        clean_text = result.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        elif clean_text.startswith("```"):
            clean_text = clean_text[3:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
        clean_text = clean_text.strip()

        data = json.loads(clean_text)
        # Ensure 'intents' is always a list
        if "intents" not in data or not isinstance(data["intents"], list):
            data["intents"] = ["simple_qa"]
            
        logger.info("Intent classified", intents=data.get("intents"))
        return data
    except Exception as e:
        logger.error("Intent classification failed", error=str(e))
        # Safe fallback
        return {
            "intents": ["simple_qa"],
            "complexity": "low",
            "summary": user_message[:100],
        }


async def combine_agent_outputs(
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
        return await call_groq_async(
            messages=synthesis_messages,
            system_prompt=COMBINE_SYSTEM_PROMPT,
            max_tokens=2000,
        )
    except Exception as e:
        logger.error("Combination failed", error=str(e))
        # Fallback: return all agent outputs concatenated
        return "\n\n".join(f"**{k.title()} Agent:**\n{v}" for k, v in agent_outputs.items())

