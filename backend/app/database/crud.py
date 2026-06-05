# ========================
# app/database/crud.py
# All database operations (Create Read Update Delete)
#
# CONCEPT: Repository Pattern
# Instead of writing raw SQL queries inside routes,
# all DB logic lives here. Routes stay clean.
# Routes call crud functions → crud talks to DB.
# ========================

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import selectinload
from typing import Optional
import uuid

from app.database.models import User, Project, Session, Message, UserMemory, SessionMemory


# ─────────────────────────────────────────
# USER CRUD
# ─────────────────────────────────────────

async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """Fetch a user by email. Used during login."""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
    """Fetch user by ID. Used in JWT auth dependency."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, email: str, name: str, hashed_password: str) -> User:
    """Create a new user. Called during signup."""
    user = User(email=email, name=name, hashed_password=hashed_password)
    db.add(user)
    await db.flush()   # flush to get the generated ID without committing
    await db.refresh(user)
    return user


# ─────────────────────────────────────────
# PROJECT CRUD
# ─────────────────────────────────────────

async def get_projects_by_user(db: AsyncSession, user_id: uuid.UUID) -> list[Project]:
    """Get all projects for a user (for sidebar list)."""
    result = await db.execute(
        select(Project)
        .where(Project.user_id == user_id)
        .order_by(Project.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_project_by_id(db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Project]:
    """Get one project — ensures it belongs to the requesting user."""
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id, Project.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def create_project(db: AsyncSession, user_id: uuid.UUID, name: str, description: str = "") -> Project:
    """Create a new project workspace."""
    project = Project(user_id=user_id, name=name, description=description)
    db.add(project)
    await db.flush()
    await db.refresh(project)
    return project


async def update_project(db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID, name: str) -> Optional[Project]:
    """Rename a project."""
    await db.execute(
        update(Project)
        .where(Project.id == project_id, Project.user_id == user_id)
        .values(name=name)
    )
    return await get_project_by_id(db, project_id, user_id)


async def delete_project(db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    """Delete a project and all its sessions/messages (cascade)."""
    result = await db.execute(
        delete(Project)
        .where(Project.id == project_id, Project.user_id == user_id)
    )
    return result.rowcount > 0


# ─────────────────────────────────────────
# SESSION CRUD
# ─────────────────────────────────────────

async def get_sessions_by_project(db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID) -> list[Session]:
    """Get all sessions for a project (sidebar chat history)."""
    result = await db.execute(
        select(Session)
        .where(Session.project_id == project_id, Session.user_id == user_id)
        .order_by(Session.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_session_by_id(db: AsyncSession, session_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Session]:
    """Get one session with its messages loaded."""
    result = await db.execute(
        select(Session)
        .options(selectinload(Session.messages))
        .where(Session.id == session_id, Session.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def create_session(db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID, title: str = "New Chat") -> Session:
    """Create a new chat session inside a project."""
    session = Session(project_id=project_id, user_id=user_id, title=title)
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


async def update_session_title(db: AsyncSession, session_id: uuid.UUID, user_id: uuid.UUID, title: str) -> Optional[Session]:
    """Rename a session."""
    await db.execute(
        update(Session)
        .where(Session.id == session_id, Session.user_id == user_id)
        .values(title=title)
    )
    return await get_session_by_id(db, session_id, user_id)


async def delete_session(db: AsyncSession, session_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    """Delete a session and all its messages."""
    result = await db.execute(
        delete(Session)
        .where(Session.id == session_id, Session.user_id == user_id)
    )
    return result.rowcount > 0


# ─────────────────────────────────────────
# MESSAGE CRUD
# ─────────────────────────────────────────

async def get_messages_by_session(db: AsyncSession, session_id: uuid.UUID) -> list[Message]:
    """Load full message history for a session."""
    result = await db.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at.asc())
    )
    return list(result.scalars().all())


async def create_message(
    db: AsyncSession,
    session_id: uuid.UUID,
    role: str,
    content: str,
    agent_outputs: dict | None = None,
) -> Message:
    """
    Save a message to the database.
    agent_outputs = {"research": "...", "engineering": "..."} or None for user messages.
    """
    message = Message(
        session_id=session_id,
        role=role,
        content=content,
        agent_outputs=agent_outputs,
    )
    db.add(message)
    await db.flush()
    await db.refresh(message)
    return message
