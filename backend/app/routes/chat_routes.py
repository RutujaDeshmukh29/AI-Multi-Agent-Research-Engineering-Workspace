# ========================
# app/routes/chat_routes.py
# Chat API — SSE streaming endpoint
# ========================

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
import uuid, json
import structlog

from app.database.db import get_db
from app.database.models import User
from app.auth.dependencies import get_current_user
from app.database import crud
from app.memory.session_memory import update_session_memory, get_or_create_session_memory
from app.memory.user_memory import get_memory_context_for_prompt, save_session_to_memory
from app.memory.file_memory import get_file_context_for_prompt
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
    
    # Get context from both user memory and uploaded files
    user_memory_context = await get_memory_context_for_prompt(db, user.id, body.message)
    file_context = await get_file_context_for_prompt(db, project_id, body.message)
    combined_context = f"{user_memory_context}\n\n{file_context}".strip()


    await crud.create_message(db, session_id=session_id, role="user", content=body.message)

    if len(messages) == 0 and session.title == "New Chat":
        title = body.message[:60] + ("..." if len(body.message) > 60 else "")
        await crud.update_session_title(db, session_id, user.id, title)

    await db.commit()

    async def event_generator():
        agent_outputs_collected = {}
        final_content = ""
        roadmap_data = None
        assistant_msg = None

        try:
            async for sse_chunk in run_agent_pipeline(
                user_message=body.message,
                conversation_history=conversation_history,
                user_memory_context=combined_context,
                user_id=str(user.id),
                session_id=str(session_id),
                project_id=str(project_id), # Pass project_id to the workflow
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
                await db.commit()
                await db.refresh(assistant_msg)

                # Roadmap saving is now handled by the workflow.
                # Memory saving logic remains.
                try:
                    all_messages = await crud.get_messages_by_session(db, session_id)
                    await update_session_memory(db, session_id, all_messages)

                    if len(all_messages) % 10 == 0:
                        mem = await get_or_create_session_memory(db, session_id)
                        if mem.summary:
                            await save_session_to_memory(db, user.id, session_id, mem.summary, mem.topics)
                    await db.commit()
                except Exception as e:
                    await db.rollback()
                    logger.error("Session memory update failed", error=str(e))

            yield f"data: {json.dumps({'type': 'done', 'message_id': str(assistant_msg.id) if assistant_msg else None, 'roadmap': roadmap_data})}\n\n"

        except Exception as e:
            logger.error("Stream error", error=str(e), exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )
