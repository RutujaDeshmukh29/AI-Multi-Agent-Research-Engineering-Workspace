# ========================
# app/services/embeddings.py
# Step 3 — Embedding service using sentence-transformers
#
# CONCEPT: Vector Embeddings & Semantic Search
# Text → numbers (384-dim vector).
# Similar texts have similar vectors (cosine similarity).
# "I built a drone" and "aerial robotics project" → close vectors.
# pgvector lets us do: SELECT * FROM user_memory ORDER BY embedding <-> query_vector LIMIT 5
# That's semantic search — finding memories by MEANING not keywords.
#
# This replaces ChromaDB entirely.
# Same capability, but lives in your PostgreSQL (persistent after redeploy).
# ========================

from sentence_transformers import SentenceTransformer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from typing import Optional
import numpy as np
import uuid
import structlog

from app.config import settings
from app.database.models import UserMemory

logger = structlog.get_logger()

# ─────────────────────────────────────────
# LOAD MODEL (once at import time)
# Model downloads ~90MB on first run, cached after that.
# "all-MiniLM-L6-v2" is fast, small, and very good for semantic search.
# ─────────────────────────────────────────
_model: Optional[SentenceTransformer] = None

def get_embedding_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info("Loading embedding model", model=settings.EMBEDDING_MODEL)
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
        logger.info("✅ Embedding model loaded")
    return _model


def embed_text(text: str) -> list[float]:
    """
    Convert text to a 384-dimensional vector.
    Returns a plain Python list (pgvector accepts this).
    """
    model = get_embedding_model()
    vector = model.encode(text, normalize_embeddings=True)
    return vector.tolist()


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Batch embed multiple texts at once (more efficient)."""
    model = get_embedding_model()
    vectors = model.encode(texts, normalize_embeddings=True, batch_size=32)
    return [v.tolist() for v in vectors]


# ─────────────────────────────────────────
# STORE A MEMORY
# ─────────────────────────────────────────
async def store_memory(
    db: AsyncSession,
    user_id: uuid.UUID,
    content: str,
    memory_type: str = "session_summary",
    metadata: dict | None = None,
    source_session_id: uuid.UUID | None = None,
    source_voice_session_id: uuid.UUID | None = None,
) -> UserMemory:
    """
    Embed content and store it as a user memory in PostgreSQL.
    Called when:
    - A chat session ends (session summary)
    - A voice session ends (voice summary)
    - User states a preference ("I prefer Python over JS")
    """
    embedding = embed_text(content)

    memory = UserMemory(
        user_id=user_id,
        content=content,
        memory_type=memory_type,
        embedding=embedding,
        metadata_=metadata or {},
        source_session_id=source_session_id,
        source_voice_session_id=source_voice_session_id,
    )
    db.add(memory)
    await db.flush()
    await db.refresh(memory)

    logger.info("Memory stored", user_id=str(user_id), type=memory_type, chars=len(content))
    return memory


# ─────────────────────────────────────────
# SEMANTIC SEARCH
# Find the most relevant memories for a query
# ─────────────────────────────────────────
async def search_memories(
    db: AsyncSession,
    user_id: uuid.UUID,
    query: str,
    top_k: int = 5,
    memory_type: str | None = None,
) -> list[UserMemory]:
    """
    Semantic similarity search over a user's memories.

    Flow:
    1. Embed the query text
    2. Use pgvector <-> operator (cosine distance) to find closest memories
    3. Return top_k most relevant memories

    The <-> operator is the cosine distance — lower = more similar.
    pgvector index makes this fast even with thousands of memories.
    """
    query_vector = embed_text(query)

    # Build the pgvector cosine distance query
    # <-> = L2 distance, <=> = cosine distance
    base_query = (
        select(UserMemory)
        .where(UserMemory.user_id == user_id)
        .order_by(UserMemory.embedding.cosine_distance(query_vector))
        .limit(top_k)
    )

    if memory_type:
        base_query = base_query.where(UserMemory.memory_type == memory_type)

    result = await db.execute(base_query)
    memories = list(result.scalars().all())

    logger.info(
        "Memory search",
        user_id=str(user_id),
        query=query[:50],
        results=len(memories),
    )
    return memories


# ─────────────────────────────────────────
# FORMAT MEMORIES FOR PROMPT INJECTION
# ─────────────────────────────────────────
def format_memories_for_prompt(memories: list[UserMemory]) -> str:
    """
    Convert retrieved memories into a system prompt section.
    This gets injected at the start of every AI call so the agent
    "remembers" what it knows about this user.
    """
    if not memories:
        return ""

    lines = ["## What I Remember About You\n"]
    for i, mem in enumerate(memories, 1):
        mem_type = mem.memory_type.replace("_", " ").title()
        lines.append(f"{i}. [{mem_type}] {mem.content}")

    return "\n".join(lines)
