# ========================
# app/routes/user_routes.py
# Step 3 — User profile + memory retrieval
# ========================

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
import uuid
import structlog

from app.database.db import get_db
from app.database.models import User, UserMemory, Project, Session
from app.auth.dependencies import get_current_user
from app.services.embeddings import search_memories

router = APIRouter()
logger = structlog.get_logger()


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    preferences: Optional[dict] = None


@router.get("/me")
async def get_profile(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return current user profile with stats."""
    # Count projects and sessions
    project_count = await db.scalar(
        select(func.count()).where(Project.user_id == user.id)
    )
    session_count = await db.scalar(
        select(func.count()).where(Session.user_id == user.id)
    )
    memory_count = await db.scalar(
        select(func.count()).where(UserMemory.user_id == user.id)
    )

    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "preferences": user.preferences or {},
        "stats": {
            "projects": project_count or 0,
            "sessions": session_count or 0,
            "memories": memory_count or 0,
        },
        "created_at": str(user.created_at),
    }


@router.patch("/me")
async def update_profile(
    body: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update user name or preferences."""
    if body.name:
        user.name = body.name
    if body.preferences:
        user.preferences = {**(user.preferences or {}), **body.preferences}
    await db.flush()
    await db.refresh(user)

    return {"id": str(user.id), "name": user.name, "preferences": user.preferences}


@router.get("/me/memories")
async def get_my_memories(
    query: Optional[str] = None,
    memory_type: Optional[str] = None,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Retrieve user memories.
    If query provided: semantic search.
    Otherwise: return most recent memories.
    """
    if query:
        memories = await search_memories(db, user.id, query, top_k=limit, memory_type=memory_type)
    else:
        stmt = (
            select(UserMemory)
            .where(UserMemory.user_id == user.id)
            .order_by(UserMemory.created_at.desc())
            .limit(limit)
        )
        if memory_type:
            stmt = stmt.where(UserMemory.memory_type == memory_type)
        result = await db.execute(stmt)
        memories = list(result.scalars().all())

    return [
        {
            "id": str(m.id),
            "content": m.content,
            "memory_type": m.memory_type,
            "metadata": m.metadata_,
            "created_at": str(m.created_at),
        }
        for m in memories
    ]


@router.delete("/me/memories/{memory_id}", status_code=204)
async def delete_memory(
    memory_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a specific memory."""
    result = await db.execute(
        select(UserMemory).where(
            UserMemory.id == uuid.UUID(memory_id),
            UserMemory.user_id == user.id,
        )
    )
    memory = result.scalar_one_or_none()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    await db.delete(memory)
