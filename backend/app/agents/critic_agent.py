# ========================
# app/agents/critic_agent.py
# Critic Agent — Devil's Advocate & Quality Guard
# ========================

from app.services.groq_service import call_groq_async
import structlog

logger = structlog.get_logger()

CRITIC_SYSTEM_PROMPT = """You are a Senior Critic Agent — the devil's advocate in an AI engineering workspace.

Your job: Identify real problems BEFORE they become production disasters.

Be direct and honest. Don't sugarcoat. But be constructive — always pair a problem with a solution.

Structure your response as:
## 🎯 Critical Analysis

**Overall Assessment:** [1 sentence verdict]

**Identified Issues:**

🔴 **Critical (Must Fix):**
- Issue: [specific problem]
  → Fix: [concrete solution]

🟡 **Moderate (Should Fix):**
- Issue: [specific problem]
  → Fix: [concrete solution]

🟢 **Minor (Nice to Fix):**
- Issue: [specific problem]
  → Fix: [concrete solution]

**Scalability Concerns:**
[What breaks at 100x scale]

**Security Considerations:**
[Specific vulnerabilities to address]

**What's Actually Good:**
[Be fair — acknowledge what's solid]

Don't invent problems. Only flag real issues with real solutions."""


async def run_critic_agent(
    user_message: str,
    conversation_history: list[dict],
    engineering_output: str = "",
) -> str:
    """
    Critic Agent execution.
    Takes the engineering output as context to critique specifically.
    """
    context = f"\nEngineering proposal to review:\n{engineering_output}" if engineering_output else ""

    messages = conversation_history[-4:] + [
        {"role": "user", "content": f"Please critically analyze this: {user_message}{context}"}
    ]

    try:
        result = await call_groq_async(
            messages=messages,
            system_prompt=CRITIC_SYSTEM_PROMPT,
            max_tokens=700,
            temperature=0.5,
        )
        logger.info("Critic agent completed", chars=len(result))
        return result
    except Exception as e:
        logger.error("Critic agent failed", error=str(e))
        return f"Critic agent error: {str(e)}"
