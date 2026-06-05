# ========================
# app/routes/project_routes.py
# Step 3 — Projects + Sessions REST API
#
# CONCEPT: RESTful Resource Design
# Projects own Sessions. Sessions own Messages.
# All routes are user-scoped — you can only see your own data.
# Cascade deletes handle cleanup automatically.
# ========================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
import uuid
import structlog

from app.database.db import get_db
from app.database import crud
from app.database.models import User
from app.auth.dependencies import get_current_user

router = APIRouter()
logger = structlog.get_logger()


# ─────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    color: Optional[str] = "#6366f1"
    icon: Optional[str] = "🧠"

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    color: Optional[str]
    icon: Optional[str]
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

class SessionCreate(BaseModel):
    title: Optional[str] = "New Chat"
    mode: Optional[str] = "text"

class SessionUpdate(BaseModel):
    title: Optional[str] = None
    is_pinned: Optional[bool] = None

class SessionResponse(BaseModel):
    id: str
    project_id: str
    title: str
    mode: str
    is_pinned: bool
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


# ─────────────────────────────────────────
# PROJECT ROUTES
# ─────────────────────────────────────────

@router.get("/", response_model=list[ProjectResponse])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get all projects for the current user (for sidebar)."""
    projects = await crud.get_projects_by_user(db, user.id)
    return [
        ProjectResponse(
            id=str(p.id), name=p.name, description=p.description,
            color=p.color, icon=p.icon,
            created_at=str(p.created_at), updated_at=str(p.updated_at),
        )
        for p in projects
    ]


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a new workspace project."""
    project = await crud.create_project(
        db, user_id=user.id, name=body.name,
        description=body.description or "",
    )
    # Set optional fields
    if body.color:
        project.color = body.color
    if body.icon:
        project.icon = body.icon
    await db.flush()

    return ProjectResponse(
        id=str(project.id), name=project.name, description=project.description,
        color=project.color, icon=project.icon,
        created_at=str(project.created_at), updated_at=str(project.updated_at),
    )


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    body: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Rename or update a project."""
    pid = uuid.UUID(project_id)
    project = await crud.get_project_by_id(db, pid, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if body.name is not None:
        project.name = body.name
    if body.description is not None:
        project.description = body.description
    if body.color is not None:
        project.color = body.color
    if body.icon is not None:
        project.icon = body.icon
    await db.flush()
    await db.refresh(project)

    return ProjectResponse(
        id=str(project.id), name=project.name, description=project.description,
        color=project.color, icon=project.icon,
        created_at=str(project.created_at), updated_at=str(project.updated_at),
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a project and all its sessions/messages."""
    pid = uuid.UUID(project_id)
    deleted = await crud.delete_project(db, pid, user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")


# ─────────────────────────────────────────
# SESSION ROUTES  (nested under projects)
# ─────────────────────────────────────────

@router.get("/{project_id}/sessions", response_model=list[SessionResponse])
async def list_sessions(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get all sessions for a project (chat history sidebar)."""
    pid = uuid.UUID(project_id)
    sessions = await crud.get_sessions_by_project(db, pid, user.id)
    return [
        SessionResponse(
            id=str(s.id), project_id=str(s.project_id),
            title=s.title, mode=s.mode, is_pinned=s.is_pinned,
            created_at=str(s.created_at), updated_at=str(s.updated_at),
        )
        for s in sessions
    ]


@router.post("/{project_id}/sessions", response_model=SessionResponse, status_code=201)
async def create_session(
    project_id: str,
    body: SessionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a new chat session inside a project."""
    pid = uuid.UUID(project_id)
    project = await crud.get_project_by_id(db, pid, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    session = await crud.create_session(
        db, project_id=pid, user_id=user.id, title=body.title or "New Chat"
    )
    if body.mode:
        session.mode = body.mode
    await db.flush()

    return SessionResponse(
        id=str(session.id), project_id=str(session.project_id),
        title=session.title, mode=session.mode, is_pinned=session.is_pinned,
        created_at=str(session.created_at), updated_at=str(session.updated_at),
    )


@router.patch("/{project_id}/sessions/{session_id}", response_model=SessionResponse)
async def update_session(
    project_id: str,
    session_id: str,
    body: SessionUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Rename or pin a session."""
    sid = uuid.UUID(session_id)
    session = await crud.get_session_by_id(db, sid, user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if body.title is not None:
        session.title = body.title
    if body.is_pinned is not None:
        session.is_pinned = body.is_pinned
    await db.flush()
    await db.refresh(session)

    return SessionResponse(
        id=str(session.id), project_id=str(session.project_id),
        title=session.title, mode=session.mode, is_pinned=session.is_pinned,
        created_at=str(session.created_at), updated_at=str(session.updated_at),
    )


@router.delete("/{project_id}/sessions/{session_id}", status_code=204)
async def delete_session(
    project_id: str,
    session_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a session and all its messages."""
    sid = uuid.UUID(session_id)
    deleted = await crud.delete_session(db, sid, user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")


@router.get("/{project_id}/sessions/{session_id}/messages")
async def get_messages(
    project_id: str,
    session_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Load full message history for a session."""
    sid = uuid.UUID(session_id)
    session = await crud.get_session_by_id(db, sid, user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = await crud.get_messages_by_session(db, sid)
    return [
        {
            "id": str(m.id),
            "role": m.role,
            "content": m.content,
            "input_mode": getattr(m, "input_mode", "text"),
            "agent_outputs": m.agent_outputs,
            "agents_used": getattr(m, "agents_used", None),
            "created_at": str(m.created_at),
        }
        for m in messages
    ]
