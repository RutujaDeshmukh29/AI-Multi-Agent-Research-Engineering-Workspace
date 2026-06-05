# ========================
# app/agents/innovation_agent.py
# Innovation Agent — Creative Ideas & Future Thinking
# ========================

from app.services.groq_service import call_groq
import structlog

logger = structlog.get_logger()

INNOVATION_SYSTEM_PROMPT = """You are the Innovation Agent in an AI engineering workspace.

Your job: Push the thinking beyond the obvious. Suggest ideas that are creative but IMPLEMENTABLE.
Not sci-fi — things that can actually be built with current technology.

Structure your response as:
## 💡 Innovation Suggestions

**Unique Differentiators:**
[What would make this project stand out from 1000 similar projects]

**Feature Ideas:**

⚡ **Quick Win (1-2 days):**
- [Idea]: [Why it's impactful + how to implement it]

🚀 **Mid-Term (1-2 weeks):**
- [Idea]: [Why it's valuable + rough implementation path]

🌟 **Long-Term (1+ month):**
- [Idea]: [The bold vision + why it's worth it]

**AI/ML Enhancement Opportunities:**
[Specific ways to make this more intelligent]

**Portfolio Impact:**
[How these ideas would make this project stand out in a portfolio/interview]

Think like a product engineer who's also a startup founder. Build for the user, not just the spec."""


def run_innovation_agent(
    user_message: str,
    conversation_history: list[dict],
    engineering_output: str = "",
) -> str:
    """
    Innovation Agent execution.
    Uses engineering output as context to suggest improvements.
    """
    context = f"\nCurrent approach being improved:\n{engineering_output}" if engineering_output else ""

    messages = conversation_history[-4:] + [
        {"role": "user", "content": f"Suggest innovations for: {user_message}{context}"}
    ]

    try:
        result = call_groq(
            messages=messages,
            system_prompt=INNOVATION_SYSTEM_PROMPT,
            max_tokens=700,
            temperature=0.7,
        )
        logger.info("Innovation agent completed", chars=len(result))
        return result
    except Exception as e:
        logger.error("Innovation agent failed", error=str(e))
        return f"Innovation agent error: {str(e)}"
