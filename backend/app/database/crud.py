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
from datetime import datetime, timezone

from app.database.models import User, Project, Session, Message, UserMemory, SessionMemory, ProjectRoadmap, RoadmapTask


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
    await db.flush()   # flush to get the generated ID
    await db.refresh(user)
    # Note: commit is handled by get_db dependency, not here
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


# ─────────────────────────────────────────
# ROADMAP CRUD
# ─────────────────────────────────────────

async def create_or_update_roadmap(db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID, roadmap_data: dict, session_id: uuid.UUID = None) -> Optional[ProjectRoadmap]:
    """
    Create a new roadmap or update the existing one for a project.
    This is an "upsert" operation that also syncs the child tasks.
    """
    # First, safely delete the old roadmap using the ORM to ensure cascades work.
    # get_roadmap_by_project_id includes the user_id check, making this secure.
    existing_roadmap = await get_roadmap_by_project_id(db, project_id, user_id)
    if existing_roadmap:
        await db.delete(existing_roadmap)
        await db.flush()

    # Create the new roadmap
    new_roadmap = ProjectRoadmap(
        project_id=project_id,
        user_id=user_id,
        session_id=session_id,
        project_title=roadmap_data.get("project_title", "Untitled Roadmap"),
        total_phases=roadmap_data.get("total_phases", 0),
        estimated_weeks=roadmap_data.get("estimated_weeks", 0),
        phases_json=roadmap_data, # Store the full original JSON
        progress_percent=0 # Starts at 0
    )
    db.add(new_roadmap)
    await db.flush()

    # Create the individual tasks from the JSON
    tasks = []
    total_tasks = 0
    completed_tasks = 0
    for i, phase in enumerate(roadmap_data.get("phases", [])):
        for j, task_data in enumerate(phase.get("tasks", [])):
            total_tasks += 1
            if task_data.get("completed", False):
                completed_tasks += 1
            
            task = RoadmapTask(
                roadmap_id=new_roadmap.id,
                phase_id=phase.get("id"),
                task_id=task_data.get("id"),
                title=task_data.get("title"),
                description=task_data.get("description"),
                estimated_hours=task_data.get("estimated_hours"),
                priority=task_data.get("priority"),
                tags=task_data.get("tags"),
                phase_index=i,
                task_index=j,
                completed=task_data.get("completed", False)
            )
            tasks.append(task)
    
    if tasks:
        db.add_all(tasks)

    # Update progress percent
    if total_tasks > 0:
        new_roadmap.progress_percent = int((completed_tasks / total_tasks) * 100)
    
    await db.flush()
    await db.refresh(new_roadmap)
    
    # Eagerly load tasks for the returned object
    return await get_roadmap_by_project_id(db, project_id, user_id)


async def get_roadmap_by_project_id(db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID) -> Optional[ProjectRoadmap]:
    """Get the roadmap for a project, including all its tasks, ordered correctly."""
    result = await db.execute(
        select(ProjectRoadmap)
        .options(selectinload(ProjectRoadmap.tasks))
        .where(ProjectRoadmap.project_id == project_id, ProjectRoadmap.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def update_task_completion(db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID, task_id: uuid.UUID, completed: bool) -> Optional[ProjectRoadmap]:
    """Update a single task's completion status and recalculate roadmap progress."""
    roadmap = await get_roadmap_by_project_id(db, project_id, user_id)
    if not roadmap:
        return None

    # Update the specific task
    task_to_update = None
    for task in roadmap.tasks:
        if task.id == task_id:
            task.completed = completed
            task.completed_at = datetime.now(timezone.utc) if completed else None
            task_to_update = task
            break
            
    if not task_to_update:
        return None # Task not found

    # Recalculate progress
    total_tasks = len(roadmap.tasks)
    completed_tasks = sum(1 for t in roadmap.tasks if t.completed)
    
    if total_tasks > 0:
        roadmap.progress_percent = int((completed_tasks / total_tasks) * 100)
    else:
        roadmap.progress_percent = 0

    await db.flush()
    await db.refresh(roadmap)
    
    # Re-fetch to get the updated state correctly, especially after the flush
    return await get_roadmap_by_project_id(db, project_id, user_id)


async def delete_roadmap(db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    """
    Deletes the roadmap for a given project and user.
    """
    roadmap = await get_roadmap_by_project_id(db, project_id, user_id)
    if not roadmap:
        return False
        
    await db.delete(roadmap)
    await db.flush()
    return True
