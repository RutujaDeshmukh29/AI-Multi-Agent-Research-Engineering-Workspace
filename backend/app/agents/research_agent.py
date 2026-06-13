# ========================
# app/agents/research_agent.py
# Research Agent — Concept gatherer & explainer
# ========================

from app.services.groq_service import call_groq_async
import structlog

logger = structlog.get_logger()

RESEARCH_SYSTEM_PROMPT = """You are an expert Research Agent in an AI engineering workspace.

Your job: Provide deep, accurate research on any technical topic.

Always structure your response as:
## 🔍 Research Findings

**Core Concept:**
[2-3 sentence explanation of what this is]

**Key Technologies & Tools:**
- [tool]: [why it's relevant]
- ...

**Real-World Context:**
[How this is used in production/industry]

**Useful Resources:**
- [Category]: [What to look for / search term]
- ...

Be precise, technical, and practical. Avoid fluff. Focus on what an engineer needs to know."""


async def run_research_agent(
    user_message: str,
    conversation_history: list[dict],
    user_memory_context: str = "",
) -> str:
    """
    Research Agent execution.
    Gathers concepts, explains technologies, provides resources.
    """
    context = f"\nRelevant user history:\n{user_memory_context}" if user_memory_context else ""

    messages = conversation_history[-6:] + [
        {"role": "user", "content": f"{user_message}{context}"}
    ]

    try:
        result = await call_groq_async(
            messages=messages,
            system_prompt=RESEARCH_SYSTEM_PROMPT,
            max_tokens=800,
            temperature=0.4,
        )
        logger.info("Research agent completed", chars=len(result))
        return result
    except Exception as e:
        logger.error("Research agent failed", error=str(e))
        return f"Research agent encountered an error: {str(e)}"
