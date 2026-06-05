# ========================
# app/services/groq_service.py
# Groq LLM client — all AI calls go through here
#
# CONCEPT: Groq vs OpenAI
# Groq runs open-source LLMs (Llama 3.3) on custom LPU hardware.
# Result: ~10x faster inference than OpenAI GPT-4 at a fraction of cost.
# Free tier: 14,400 requests/day, 500K tokens/min.
# API is 100% OpenAI-compatible — same SDK, just different base_url.
# We use langchain-groq which wraps this cleanly for LangGraph.
# ========================

from groq import Groq, AsyncGroq
from app.config import settings
import structlog

logger = structlog.get_logger()

# Sync client (for simple one-shot calls)
groq_client = Groq(api_key=settings.GROQ_API_KEY)

# Async client (for FastAPI routes — never block the event loop)
async_groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)


def call_groq(
    messages: list[dict],
    model: str | None = None,
    max_tokens: int = 2048,
    temperature: float | None = None,
    system_prompt: str | None = None,
) -> str:
    """
    Single synchronous Groq call.
    Used inside LangGraph nodes (which run in threads).
    Returns the response text directly.
    """
    if system_prompt:
        messages = [{"role": "system", "content": system_prompt}] + messages

    response = groq_client.chat.completions.create(
        model=model or settings.GROQ_MODEL,
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature if temperature is not None else settings.GROQ_TEMPERATURE,
    )
    return response.choices[0].message.content.strip()


async def call_groq_async(
    messages: list[dict],
    model: str | None = None,
    max_tokens: int = 2048,
    temperature: float | None = None,
    system_prompt: str | None = None,
) -> str:
    """
    Async Groq call for FastAPI endpoints.
    Does not block the event loop.
    """
    if system_prompt:
        messages = [{"role": "system", "content": system_prompt}] + messages

    response = await async_groq_client.chat.completions.create(
        model=model or settings.GROQ_MODEL,
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature if temperature is not None else settings.GROQ_TEMPERATURE,
    )
    return response.choices[0].message.content.strip()


async def call_groq_streaming(
    messages: list[dict],
    system_prompt: str | None = None,
):
    """
    Streaming async Groq call.
    Yields text chunks as they arrive.
    Used with SSE (Server-Sent Events) for live streaming in chat.

    CONCEPT: Streaming vs Blocking
    Without streaming: user waits 3-5s then gets full response.
    With streaming: user sees first word in ~200ms, rest trickles in.
    Massively better perceived performance — ChatGPT effect.
    """
    if system_prompt:
        messages = [{"role": "system", "content": system_prompt}] + messages

    stream = await async_groq_client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=messages,
        max_tokens=settings.GROQ_MAX_TOKENS,
        temperature=settings.GROQ_TEMPERATURE,
        stream=True,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


def call_groq_json(
    messages: list[dict],
    system_prompt: str,
    max_tokens: int = 1024,
) -> str:
    """
    Force JSON output from Groq.
    Used when agents need structured data (roadmap tasks, checklist items).
    System prompt MUST instruct the model to output only valid JSON.
    """
    full_system = system_prompt + "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation."
    return call_groq(messages, system_prompt=full_system, max_tokens=max_tokens, temperature=0.2)
