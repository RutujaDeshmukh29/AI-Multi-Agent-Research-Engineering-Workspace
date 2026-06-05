# ========================
# app/memory/user_memory.py
# Step 3 — Persistent User Memory Manager
#
# CONCEPT: Long-Term AI Memory
# Unlike session memory (resets each chat),
# user memory persists FOREVER in PostgreSQL.
# Uses pgvector for semantic similarity search.
#
# Lifecycle:
# 1. Session/voice session ends
# 2. LLM generates a summary of what happened
# 3. Summary is embedded → stored in user_memory table
# 4. Next session: query embedding finds relevant past memories
# 5. Memories injected into system prompt
# Result: AI "knows" the user across all sessions
# ========================

from sqlalchemy.ext.asyncio import AsyncSession
import uuid
import structlog

from app.services.embeddings import store_memory, search_memories, format_memories_for_prompt
from app.database.models import UserMemory

logger = structlog.get_logger()


async def save_session_to_memory(
    db: AsyncSession,
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    summary: str,
    topics: list[str] | None = None,
) -> UserMemory:
    """
    Called when a text session ends.
    Embeds the session summary and stores it as a persistent memory.
    """
    if not summary or len(summary.strip()) < 20:
        logger.info("Summary too short to store", user_id=str(user_id))
        return None  # type: ignore

    metadata = {
        "topics": topics or [],
        "session_id": str(session_id),
        "type": "session_summary",
    }

    memory = await store_memory(
        db=db,
        user_id=user_id,
        content=summary,
        memory_type="session_summary",
        metadata=metadata,
        source_session_id=session_id,
    )

    logger.info("Session saved to memory", user_id=str(user_id), session_id=str(session_id))
    return memory


async def save_voice_session_to_memory(
    db: AsyncSession,
    user_id: uuid.UUID,
    voice_session_id: uuid.UUID,
    summary: str,
    transcript_excerpt: str | None = None,
) -> UserMemory:
    """
    Called when a voice session ends.
    Embeds the voice session summary for future recall.
    """
    if not summary or len(summary.strip()) < 20:
        return None  # type: ignore

    metadata = {
        "voice_session_id": str(voice_session_id),
        "type": "voice_summary",
        "has_transcript": transcript_excerpt is not None,
    }

    memory = await store_memory(
        db=db,
        user_id=user_id,
        content=summary,
        memory_type="voice_summary",
        metadata=metadata,
        source_voice_session_id=voice_session_id,
    )

    logger.info("Voice session saved to memory", voice_session_id=str(voice_session_id))
    return memory


async def save_user_preference(
    db: AsyncSession,
    user_id: uuid.UUID,
    preference: str,
) -> UserMemory:
    """
    Save a detected user preference.
    e.g. "Prefers Python over JavaScript"
         "Always wants deployment on Vercel"
         "Uses dark mode"
    """
    return await store_memory(
        db=db,
        user_id=user_id,
        content=preference,
        memory_type="preference",
        metadata={"auto_detected": True},
    )


async def get_relevant_memories(
    db: AsyncSession,
    user_id: uuid.UUID,
    query: str,
    top_k: int = 5,
) -> list[UserMemory]:
    """
    Semantic search over all user memories.
    Called at the start of every chat turn to retrieve relevant context.
    """
    return await search_memories(db, user_id, query, top_k=top_k)


async def get_memory_context_for_prompt(
    db: AsyncSession,
    user_id: uuid.UUID,
    query: str,
) -> str:
    """
    One-stop function: search memories + format for prompt injection.
    Returns a string ready to include in the system message.
    """
    memories = await get_relevant_memories(db, user_id, query)
    return format_memories_for_prompt(memories)
