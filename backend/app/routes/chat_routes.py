# ========================
# app/routes/chat_routes.py
# Chat API — SSE streaming endpoint
# ========================

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid, json
import structlog

from app.database.db import get_db
from app.database.models import User, ProjectRoadmap, RoadmapTask
from app.auth.dependencies import get_current_user
from app.database import crud
from app.memory.session_memory import update_session_memory, get_or_create_session_memory
from app.memory.user_memory import get_memory_context_for_prompt, save_session_to_memory
from app.workflows.langgraph_flow import run_agent_pipeline

router = APIRouter()
logger = structlog.get_logger()


class ChatRequest(BaseModel):
    message: str
    session_id: str
    project_id: str


@router.post("/stream")
async def chat_stream(
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    session_id = uuid.UUID(body.session_id)
    project_id = uuid.UUID(body.project_id)

    session = await crud.get_session_by_id(db, session_id, user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = await crud.get_messages_by_session(db, session_id)
    conversation_history = [{"role": m.role, "content": m.content} for m in messages[-10:]]
    user_memory_context = await get_memory_context_for_prompt(db, user.id, body.message)

    await crud.create_message(db, session_id=session_id, role="user", content=body.message)

    if len(messages) == 0 and session.title == "New Chat":
        title = body.message[:60] + ("..." if len(body.message) > 60 else "")
        await crud.update_session_title(db, session_id, user.id, title)

    async def event_generator():
        agent_outputs_collected = {}
        final_content = ""
        roadmap_data = None
        assistant_msg = None

        try:
            async for sse_chunk in run_agent_pipeline(
                user_message=body.message,
                conversation_history=conversation_history,
                user_memory_context=user_memory_context,
                user_id=str(user.id),
                session_id=str(session_id),
            ):
                if sse_chunk.startswith("data: "):
                    raw = sse_chunk[6:].strip()
                    try:
                        event = json.loads(raw)
                        if event["type"] == "final":
                            final_content = event.get("content", "")
                            agent_outputs_collected = event.get("agent_outputs", {})
                            roadmap_data = event.get("roadmap")
                    except Exception:
                        pass
                yield sse_chunk

            if final_content:
                assistant_msg = await crud.create_message(
                    db, session_id=session_id, role="assistant",
                    content=final_content, agent_outputs=agent_outputs_collected,
                )
                if roadmap_data:
                    await _save_roadmap(db, project_id, user.id, roadmap_data, session_id)

                all_messages = await crud.get_messages_by_session(db, session_id)
                await update_session_memory(db, session_id, all_messages)

                if len(all_messages) % 10 == 0:
                    mem = await get_or_create_session_memory(db, session_id)
                    if mem.summary:
                        await save_session_to_memory(db, user.id, session_id, mem.summary, mem.topics)

            yield f"data: {json.dumps({'type': 'done', 'message_id': str(assistant_msg.id) if assistant_msg else None, 'roadmap': roadmap_data})}\n\n"

        except Exception as e:
            logger.error("Stream error", error=str(e))
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


class TaskUpdate(BaseModel):
    completed: bool


@router.get("/roadmap/{project_id}")
async def get_roadmap(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pid = uuid.UUID(project_id)
    result = await db.execute(
        select(ProjectRoadmap)
        .where(ProjectRoadmap.project_id == pid, ProjectRoadmap.user_id == user.id)
        .order_by(ProjectRoadmap.created_at.desc()).limit(1)
    )
    roadmap = result.scalar_one_or_none()
    if not roadmap:
        return {"roadmap": None}

    tasks_result = await db.execute(
        select(RoadmapTask).where(RoadmapTask.roadmap_id == roadmap.id)
        .order_by(RoadmapTask.phase_index, RoadmapTask.task_index)
    )
    tasks = tasks_result.scalars().all()
    total = len(tasks)
    done = sum(1 for t in tasks if t.completed)

    return {
        "roadmap": {
            "id": str(roadmap.id),
            "project_title": roadmap.project_title,
            "total_phases": roadmap.total_phases,
            "estimated_weeks": roadmap.estimated_weeks,
            "progress_percent": round(done / total * 100) if total else 0,
            "tasks_completed": done,
            "tasks_total": total,
            "phases": roadmap.phases_json,
            "tasks": [
                {"id": str(t.id), "phase_id": t.phase_id, "title": t.title,
                 "description": t.description, "estimated_hours": t.estimated_hours,
                 "priority": t.priority, "completed": t.completed,
                 "completed_at": str(t.completed_at) if t.completed_at else None,
                 "tags": t.tags, "phase_index": t.phase_index, "task_index": t.task_index}
                for t in tasks
            ],
        }
    }


@router.patch("/roadmap/task/{task_id}")
async def update_task(
    task_id: str,
    body: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(RoadmapTask).where(RoadmapTask.id == uuid.UUID(task_id)))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.completed = body.completed
    task.completed_at = datetime.now(timezone.utc) if body.completed else None
    await db.flush()

    all_result = await db.execute(select(RoadmapTask).where(RoadmapTask.roadmap_id == task.roadmap_id))
    all_tasks = all_result.scalars().all()
    total = len(all_tasks)
    done = sum(1 for t in all_tasks if t.completed)
    pct = round(done / total * 100) if total else 0

    roadmap_result = await db.execute(select(ProjectRoadmap).where(ProjectRoadmap.id == task.roadmap_id))
    roadmap = roadmap_result.scalar_one_or_none()
    if roadmap:
        roadmap.progress_percent = pct
        await db.flush()

    return {"task_id": task_id, "completed": task.completed, "progress_percent": pct}


async def _save_roadmap(db, project_id, user_id, roadmap_data, session_id):
    roadmap = ProjectRoadmap(
        project_id=project_id, user_id=user_id, session_id=session_id,
        project_title=roadmap_data.get("project_title", "Project Roadmap"),
        total_phases=roadmap_data.get("total_phases", 0),
        estimated_weeks=roadmap_data.get("estimated_weeks", 0),
        phases_json=roadmap_data.get("phases", []),
        progress_percent=0,
    )
    db.add(roadmap)
    await db.flush()

    for pi, phase in enumerate(roadmap_data.get("phases", [])):
        for ti, task in enumerate(phase.get("tasks", [])):
            db.add(RoadmapTask(
                roadmap_id=roadmap.id,
                phase_id=phase.get("id", f"phase_{pi}"),
                task_id=task.get("id", f"task_{pi}_{ti}"),
                title=task.get("title", ""),
                description=task.get("description", ""),
                estimated_hours=task.get("estimated_hours", 2),
                priority=task.get("priority", "medium"),
                tags=task.get("tags", []),
                phase_index=pi, task_index=ti, completed=False,
            ))
