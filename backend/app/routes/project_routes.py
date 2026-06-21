# ========================
# app/routes/project_routes.py
# Step 3 — Projects + Sessions REST API
#
# CONCEPT: RESTful Resource Design
# Projects own Sessions. Sessions own Messages.
# All routes are user-scoped — you can only see your own data.
# Cascade deletes handle cleanup automatically.
# ========================

from app.config import settings
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid
import structlog
from pathlib import Path
import json
from app.services.groq_service import call_groq_async

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
    id: uuid.UUID
    name: str
    description: Optional[str]
    color: Optional[str]
    icon: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SessionCreate(BaseModel):
    title: Optional[str] = "New Chat"
    mode: Optional[str] = "text"

class SessionUpdate(BaseModel):
    title: Optional[str] = None
    is_pinned: Optional[bool] = None

class SessionResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    mode: str
    is_pinned: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class RoadmapTaskResponse(BaseModel):
    id: uuid.UUID
    roadmap_id: uuid.UUID
    phase_id: str
    task_id: str
    title: str
    description: Optional[str]
    estimated_hours: Optional[int]
    priority: Optional[str]
    tags: Optional[List[str]]
    completed: bool
    completed_at: Optional[datetime]
    phase_index: int

    class Config:
        from_attributes = True

class RoadmapResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    project_title: str
    total_phases: int
    estimated_weeks: int
    progress_percent: int
    phases: List[dict]
    tasks: List[RoadmapTaskResponse]
    created_at: datetime
    updated_at: datetime

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
    return await crud.get_projects_by_user(db, user.id)


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
    return project


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
    return project


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
    return await crud.get_sessions_by_project(db, pid, user.id)


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
    return session


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
    return session


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
    
    return RoadmapResponse(
        **roadmap.__dict__,
        phases=roadmap.phases_json.get("phases", []) if roadmap.phases_json else []
    )

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
            raise HTTPException(status_code=500, detail="The AI agent returned an empty or invalid response. Please try again.")

        new_roadmap = await crud.create_or_update_roadmap(db, pid, user.id, roadmap_json)

        if not new_roadmap:
            raise HTTPException(status_code=500, detail="Failed to save roadmap to database.")

        return RoadmapResponse(
            **new_roadmap.__dict__,
            phases=new_roadmap.phases_json.get("phases", []) if new_roadmap.phases_json else []
        )
    except Exception as e:
        logger.error("Roadmap generation failed at the route level", error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred while generating the roadmap.")
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
    tid = uuid.UUID(task_id)
    
    updated_roadmap = await crud.update_task_completion(
        db, project_id=pid, user_id=user.id, task_id=tid, completed=body.completed
    )
    if not updated_roadmap:
        raise HTTPException(status_code=404, detail="Roadmap or task not found.")
    
    return RoadmapResponse(
        **updated_roadmap.__dict__,
        phases=updated_roadmap.phases_json.get("phases", []) if updated_roadmap.phases_json else []
    )

@router.delete("/{project_id}/roadmap", status_code=status.HTTP_204_NO_CONTENT)
async def delete_roadmap_endpoint(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Deletes the roadmap for a project."""
    pid = uuid.UUID(project_id)
    success = await crud.delete_roadmap(db, project_id=pid, user_id=user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Roadmap not found.")
    return None


class ProjectSummaryResponse(BaseModel):
    goals: str
    roadmap: str
    decisions: str
    architecture: str
    risks: str
    next_steps: str

UPLOADS_DIR = Path("backend/uploads")

@router.get("/{project_id}/summary", response_model=Optional[ProjectSummaryResponse])
async def get_project_summary(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get the cached AI project summary if it exists."""
    pid = uuid.UUID(project_id)
    project = await crud.get_project_by_id(db, pid, user.id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    summary_file = UPLOADS_DIR / str(pid) / "summary.json"
    if not summary_file.exists():
        return None
        
    try:
        with summary_file.open("r", encoding="utf-8") as f:
            data = json.load(f)
            return ProjectSummaryResponse(**data)
    except Exception as e:
        logger.error("Failed to read project summary file", error=str(e))
        return None


@router.post("/{project_id}/summary", response_model=ProjectSummaryResponse)
async def generate_project_summary(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generate an AI Project Summary based on project sessions, chat logs, and roadmap."""
    pid = uuid.UUID(project_id)
    project = await crud.get_project_by_id(db, pid, user.id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # 1. Fetch project sessions and their messages to summarize context
    sessions = await crud.get_project_sessions(db, pid, user.id)
    chat_history_summary = []
    
    for s in sessions[:5]: # look at last 5 chat sessions
        messages = await crud.get_session_messages(db, s.id)
        chat_history_summary.append(f"Chat: {s.title}")
        for m in messages[-10:]: # summarize last 10 messages of each chat
            chat_history_summary.append(f"  {m.role}: {m.content[:200]}")
            
    chat_logs = "\n".join(chat_history_summary)

    # 2. Fetch project roadmap checklist
    roadmap = await crud.get_project_roadmap(db, pid, user.id)
    roadmap_tasks = []
    if roadmap:
        phases = roadmap.phases_json.get("phases", []) if roadmap.phases_json else []
        for phase in phases:
            tasks = phase.get("tasks", [])
            for task in tasks:
                status_str = "completed" if task.get("completed") else "pending"
                roadmap_tasks.append(f"- {task.get('title')} ({status_str})")
    
    roadmap_checklist = "\n".join(roadmap_tasks)

    # 3. Formulate Prompt for Groq
    system_prompt = (
        "You are an elite software product manager agent. Your job is to write a comprehensive AI Project Summary.\n"
        "Given the recent chat logs and roadmap task completion statuses, generate a clear product summary.\n"
        "Respond STRICTLY in JSON format with these exact keys:\n"
        "{\n"
        '  "goals": "High-level goals of this project...",\n'
        '  "roadmap": "Milestone progression status...",\n'
        '  "decisions": "Key architectural and product decisions aligned...",\n'
        '  "architecture": "Overview of the project stack and layout...",\n'
        '  "risks": "Identified security, rate limit, complexity, or design risks...",\n'
        '  "next_steps": "Actionable immediate tasks to build next..."\n'
        "}\n"
        "Do NOT return markdown fences or conversational wrappers. Provide ONLY valid raw JSON."
    )
    
    user_prompt = (
        f"Project Name: {project.name}\n"
        f"Project Description: {project.description}\n\n"
        f"Recent Chat logs context:\n{chat_logs[:4000]}\n\n"
        f"Roadmap items status:\n{roadmap_checklist[:2000]}\n"
    )

    try:
        response_text = await call_groq_async(
            messages=[{"role": "user", "content": user_prompt}],
            system_prompt=system_prompt,
            max_tokens=2500,
            temperature=0.3
        )
        
        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_text)
        
        # Save to uploads directory for caching
        project_dir = UPLOADS_DIR / str(pid)
        project_dir.mkdir(parents=True, exist_ok=True)
        summary_file = project_dir / "summary.json"
        
        with summary_file.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
        return ProjectSummaryResponse(**data)
        
    except Exception as e:
        logger.error("AI project summary generation failed", error=str(e))
        # Provide fallback content in case of error
        fallback_data = {
            "goals": f"Develop and build '{project.name}' to solve the user's design requirements.",
            "roadmap": "Currently in design and initialization phase.",
            "decisions": "Adopted decoupled client-server architecture using FastAPI and Next.js.",
            "architecture": "Next.js React frontend talking to a Python FastAPI backend.",
            "risks": "Third-party API rate limits and token availability.",
            "next_steps": "1. Initialize core workspace chats\n2. Populate roadmap backlog checklists."
        }
        return ProjectSummaryResponse(**fallback_data)
