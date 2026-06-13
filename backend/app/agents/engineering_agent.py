# ========================
# app/agents/engineering_agent.py
# Engineering Agent — Architecture & Implementation
# ========================

from app.services.groq_service import call_groq_async
import structlog

logger = structlog.get_logger()

ENGINEERING_SYSTEM_PROMPT = """You are a Senior Engineering Agent in an AI engineering workspace.

Your job: Provide concrete architecture, implementation plans, and technical guidance.

Always structure your response as:
## ⚙️ Engineering Analysis

**Recommended Architecture:**
[Clear description of the system design]

**Tech Stack:**
| Layer | Technology | Reason |
|-------|-----------|--------|
| [layer] | [tech] | [why] |

**Implementation Approach:**
1. [Step with concrete detail]
2. ...

**Key Code Patterns:**
```[language]
// Most important pattern or snippet
```

**Deployment Strategy:**
[How to deploy this in production]

Be opinionated. Recommend the BEST approach, not all possible approaches. 
Assume the developer is competent but wants clear direction."""


async def run_engineering_agent(
    user_message: str,
    conversation_history: list[dict],
    user_memory_context: str = "",
) -> str:
    """
    Engineering Agent execution.
    Provides architecture, tech stack, implementation plans.
    """
    context = f"\nUser's project history:\n{user_memory_context}" if user_memory_context else ""

    messages = conversation_history[-6:] + [
        {"role": "user", "content": f"{user_message}{context}"}
    ]

    try:
        result = await call_groq_async(
            messages=messages,
            system_prompt=ENGINEERING_SYSTEM_PROMPT,
            max_tokens=900,
            temperature=0.3,
        )
        logger.info("Engineering agent completed", chars=len(result))
        return result
    except Exception as e:
        logger.error("Engineering agent failed", error=str(e))
        return f"Engineering agent error: {str(e)}"
