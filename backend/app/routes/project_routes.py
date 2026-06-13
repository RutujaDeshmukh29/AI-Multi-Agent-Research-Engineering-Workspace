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

class RoadmapTaskResponse(BaseModel):
    id: str
    roadmap_id: str
    phase_id: str
    task_id: str
    title: str
    description: Optional[str]
    estimated_hours: Optional[int]
    priority: Optional[str]
    tags: Optional[list[str]]
    completed: bool
    completed_at: Optional[str]

    class Config:
        from_attributes = True

class RoadmapResponse(BaseModel):
    id: str
    project_id: str
    project_title: str
    total_phases: int
    estimated_weeks: int
    progress_percent: int
    phases_json: dict
    tasks: list[RoadmapTaskResponse]
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
        
class TaskUpdate(BaseModel):
    completed: bool


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
    await db.refresh(project) # Refresh the project object to load all attributes

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


# ─────────────────────────────────────────
# ROADMAP ROUTES (nested under projects)
# ─────────────────────────────────────────

@router.get("/{project_id}/roadmap", response_model=Optional[RoadmapResponse])
async def get_roadmap(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get the current roadmap for a project."""
    pid = uuid.UUID(project_id)
    roadmap = await crud.get_roadmap_by_project_id(db, pid, user.id)
    if not roadmap:
        return None
    return roadmap

@router.post("/{project_id}/roadmap/generate", response_model=RoadmapResponse)
async def generate_roadmap(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Generates a new roadmap for a project using the planner agent.
    This replaces any existing roadmap.
    """
    try:
        pid = uuid.UUID(project_id)
        project = await crud.get_project_by_id(db, pid, user.id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        from app.agents.planner_agent import generate_roadmap_json

        # We need a conversation history to generate a roadmap.
        # For now, we'll create a simple one based on the project name and description.
        fake_history = [{"role": "user", "content": f"Create a roadmap for the project: {project.name}. Description: {project.description}"}]
        
        roadmap_json = await generate_roadmap_json(project.name, fake_history)

        if not roadmap_json:
            raise HTTPException(status_code=500, detail="Failed to generate roadmap from AI agent after self-correction.")

        new_roadmap = await crud.create_or_update_roadmap(db, pid, user.id, roadmap_json)

        if not new_roadmap:
            raise HTTPException(status_code=500, detail="Failed to save roadmap to database.")

        return new_roadmap
    except Exception as e:
        logger.error("Roadmap generation failed at the route level", error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred while generating the roadmap.")


@router.put("/{project_id}/roadmap/tasks/{task_id}", response_model=RoadmapResponse)
async def update_roadmap_task(
    project_id: str,
    task_id: str,
    body: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Mark a roadmap task as complete or incomplete."""
    pid = uuid.UUID(project_id)
    updated_roadmap = await crud.update_task_completion(
        db, project_id=pid, user_id=user.id, task_id=task_id, completed=body.completed
    )
    if not updated_roadmap:
        raise HTTPException(status_code=404, detail="Roadmap or task not found.")
    
    return updated_roadmap
