# ========================
# app/memory/session_memory.py
# Step 3 — In-session memory manager
#
# CONCEPT: Context Window Management
# LLMs have a fixed context window (token limit).
# You can't pass ALL past messages forever — it gets too big.
# Strategy:
#   1. Keep last 10 messages in full (recent context)
#   2. Summarize older messages into a compact summary
#   3. Pass: [system prompt + memory] + [summary] + [last 10 messages]
# This gives the AI both recent context AND historical awareness
# without blowing up the token count.
# ========================

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
import uuid
import structlog

from app.database.models import Session, SessionMemory, Message
from app.database import crud

logger = structlog.get_logger()

# How many recent messages to keep in full
RECENT_MESSAGES_WINDOW = 10

# After how many messages to regenerate the summary
SUMMARY_UPDATE_FREQUENCY = 5


async def get_or_create_session_memory(
    db: AsyncSession, session_id: uuid.UUID
) -> SessionMemory:
    """Get existing session memory or create a blank one."""
    result = await db.execute(
        select(SessionMemory).where(SessionMemory.session_id == session_id)
    )
    memory = result.scalar_one_or_none()

    if memory is None:
        memory = SessionMemory(session_id=session_id)
        db.add(memory)
        await db.flush()
        await db.refresh(memory)

    return memory


async def update_session_memory(
    db: AsyncSession,
    session_id: uuid.UUID,
    all_messages: list[Message],
    groq_client=None,   # injected in Phase 2 for summarization
) -> SessionMemory:
    """
    Update the session memory after each exchange.
    - Stores last N messages as context JSON
    - Triggers summary regeneration every SUMMARY_UPDATE_FREQUENCY messages
    """
    memory = await get_or_create_session_memory(db, session_id)

    # Store last N messages as context
    recent = all_messages[-RECENT_MESSAGES_WINDOW:]
    memory.context = [
        {
            "role": msg.role,
            "content": msg.content,
            "created_at": str(msg.created_at),
            "input_mode": getattr(msg, "input_mode", "text"),
        }
        for msg in recent
    ]
    memory.message_count = len(all_messages)

    # Detect topics (simple keyword extraction — Phase 2 will use LLM)
    all_text = " ".join(m.content for m in all_messages)
    memory.topics = extract_topics(all_text)

    # Trigger LLM summarization every N messages (Phase 2 wires this up)
    should_summarize = (
        len(all_messages) % SUMMARY_UPDATE_FREQUENCY == 0
        and len(all_messages) > 0
        and groq_client is not None
    )

    if should_summarize:
        memory.summary = await generate_summary(all_messages, groq_client)

    await db.flush()
    return memory


def extract_topics(text: str) -> list[str]:
    """
    Simple keyword extraction — Phase 2 replaces this with LLM.
    Looks for tech keywords to tag sessions.
    """
    tech_keywords = [
        "Python", "FastAPI", "React", "Next.js", "LangChain", "LangGraph",
        "PostgreSQL", "Docker", "API", "machine learning", "AI", "GPT",
        "neural network", "drone", "robotics", "embedding", "vector",
        "authentication", "deployment", "database", "agent",
    ]
    found = []
    text_lower = text.lower()
    for kw in tech_keywords:
        if kw.lower() in text_lower and kw not in found:
            found.append(kw)
    return found[:10]   # max 10 topics


async def generate_summary(messages: list[Message], groq_client) -> str:
    """
    Use LLM to compress conversation history into a summary.
    Called every 5 messages. Phase 2 fully implements this.
    """
    # Build a condensed version of the conversation
    conversation = "\n".join(
        f"{msg.role.upper()}: {msg.content[:300]}"
        for msg in messages[:-RECENT_MESSAGES_WINDOW]  # summarize older ones
    )
    if not conversation:
        return ""

    prompt = f"""Summarize this conversation in 2-3 sentences, focusing on:
- What the user is working on
- Key decisions made
- Technologies discussed

Conversation:
{conversation}

Summary:"""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error("Summary generation failed", error=str(e))
        return ""


def build_context_for_llm(
    session_memory: Optional[SessionMemory],
    user_memories: list,
    new_message: str,
) -> list[dict]:
    """
    Assemble the full message list to send to the LLM.
    Order:
    1. System message with user memories (long-term context)
    2. Session summary (medium-term context)
    3. Recent messages (short-term context)
    4. New user message
    """
    messages = []

    # Build system prompt with long-term memory
    system_content = "You are an intelligent AI engineering workspace assistant."
    if user_memories:
        from app.services.embeddings import format_memories_for_prompt
        memory_text = format_memories_for_prompt(user_memories)
        system_content += f"\n\n{memory_text}"

    messages.append({"role": "system", "content": system_content})

    # Add session summary as context
    if session_memory and session_memory.summary:
        messages.append({
            "role": "system",
            "content": f"## Previous conversation summary:\n{session_memory.summary}"
        })

    # Add recent messages
    if session_memory and session_memory.context:
        for msg in session_memory.context:
            messages.append({
                "role": msg["role"],
                "content": msg["content"],
            })

    # Add the new user message
    messages.append({"role": "user", "content": new_message})

    return messages
