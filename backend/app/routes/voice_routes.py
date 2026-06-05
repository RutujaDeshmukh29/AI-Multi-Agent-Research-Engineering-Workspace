# ========================
# app/routes/voice_routes.py
# Step 3 — Voice Session API
#
# CONCEPT: Browser Web Speech API + Backend Storage
# The actual STT (speech-to-text) happens in the BROWSER
# using the Web Speech API (free, no API key needed).
# The BACKEND receives the transcript text and processes it.
# TTS (text-to-speech) also happens in the browser via SpeechSynthesis API.
#
# So the voice pipeline is:
# Browser mic → Web Speech API (STT) → transcript text
#     → POST /voice/message → AI agents process
#     → response text returned
#     → Browser SpeechSynthesis (TTS) reads it aloud
#
# Why this approach?
# - Zero extra API costs (no Whisper/ElevenLabs needed)
# - Works on all modern browsers
# - Fast (no audio upload/download)
# - Privacy-friendly
# ========================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid
import structlog

from app.database.db import get_db
from app.database.models import User, VoiceSession, VoiceMessage
from app.auth.dependencies import get_current_user
from app.memory.user_memory import save_voice_session_to_memory

router = APIRouter()
logger = structlog.get_logger()


# ─────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────
class StartVoiceSessionRequest(BaseModel):
    project_id: Optional[str] = None
    title: Optional[str] = "Voice Chat"
    tts_voice: Optional[str] = "alloy"

class VoiceMessageRequest(BaseModel):
    voice_session_id: str
    transcript: str          # STT output from browser
    audio_duration: Optional[float] = None
    confidence_score: Optional[float] = None

class EndVoiceSessionRequest(BaseModel):
    voice_session_id: str
    duration_seconds: Optional[int] = None

class VoiceSessionResponse(BaseModel):
    id: str
    title: str
    is_active: bool
    tts_voice: str
    created_at: str

class VoiceMessageResponse(BaseModel):
    id: str
    role: str
    transcript: str
    response_text: Optional[str]
    agent_outputs: Optional[dict]
    created_at: str


# ─────────────────────────────────────────
# START VOICE SESSION
# ─────────────────────────────────────────
@router.post("/start", response_model=VoiceSessionResponse, status_code=201)
async def start_voice_session(
    body: StartVoiceSessionRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Start a new voice chat session.
    Frontend calls this when user clicks the mic button.
    Returns a voice_session_id to use for all subsequent messages.
    """
    project_id = uuid.UUID(body.project_id) if body.project_id else None

    voice_session = VoiceSession(
        user_id=user.id,
        project_id=project_id,
        title=body.title or "Voice Chat",
        tts_voice=body.tts_voice or "alloy",
        is_active=True,
    )
    db.add(voice_session)
    await db.flush()
    await db.refresh(voice_session)

    logger.info("Voice session started", session_id=str(voice_session.id), user_id=str(user.id))

    return VoiceSessionResponse(
        id=str(voice_session.id),
        title=voice_session.title,
        is_active=voice_session.is_active,
        tts_voice=voice_session.tts_voice,
        created_at=str(voice_session.created_at),
    )


# ─────────────────────────────────────────
# SEND VOICE MESSAGE
# Browser sends transcript → AI processes → returns response text
# ─────────────────────────────────────────
@router.post("/message", response_model=VoiceMessageResponse)
async def send_voice_message(
    body: VoiceMessageRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Process a voice message turn.
    Receives STT transcript from browser.
    Returns AI response text (browser converts to speech).

    Full agent pipeline wired in Phase 2 — for now returns structured response.
    """
    # Validate session
    result = await db.execute(
        select(VoiceSession).where(
            VoiceSession.id == uuid.UUID(body.voice_session_id),
            VoiceSession.user_id == user.id,
            VoiceSession.is_active == True,
        )
    )
    voice_session = result.scalar_one_or_none()
    if not voice_session:
        raise HTTPException(status_code=404, detail="Voice session not found or already ended")

    # Save user message
    user_msg = VoiceMessage(
        voice_session_id=voice_session.id,
        role="user",
        transcript=body.transcript,
        audio_duration=body.audio_duration,
        confidence_score=body.confidence_score,
    )
    db.add(user_msg)

    # Append to full transcript
    transcript_line = f"User: {body.transcript}\n"
    voice_session.full_transcript = (voice_session.full_transcript or "") + transcript_line

    # ── AI Response (Phase 2 wires in full agents) ──────
    # For now: placeholder response that confirms the pipeline works
    response_text = (
        f"I heard you say: '{body.transcript}'. "
        "The full multi-agent pipeline will be connected in Phase 2. "
        "Your voice session is being recorded and will be summarized when you end the session."
    )
    agent_outputs = {"qa": response_text}

    # Save assistant message
    assistant_msg = VoiceMessage(
        voice_session_id=voice_session.id,
        role="assistant",
        transcript=body.transcript,
        response_text=response_text,
        agent_outputs=agent_outputs,
    )
    db.add(assistant_msg)

    # Append to transcript
    voice_session.full_transcript += f"Assistant: {response_text}\n"
    await db.flush()
    await db.refresh(assistant_msg)

    return VoiceMessageResponse(
        id=str(assistant_msg.id),
        role="assistant",
        transcript=body.transcript,
        response_text=response_text,
        agent_outputs=agent_outputs,
        created_at=str(assistant_msg.created_at),
    )


# ─────────────────────────────────────────
# END VOICE SESSION + AUTO-SUMMARIZE
# ─────────────────────────────────────────
@router.post("/end")
async def end_voice_session(
    body: EndVoiceSessionRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    End a voice session.
    - Marks session as inactive
    - Generates a summary from the full transcript
    - Stores summary in user_memory (pgvector) for future recall
    """
    result = await db.execute(
        select(VoiceSession).where(
            VoiceSession.id == uuid.UUID(body.voice_session_id),
            VoiceSession.user_id == user.id,
        )
    )
    voice_session = result.scalar_one_or_none()
    if not voice_session:
        raise HTTPException(status_code=404, detail="Voice session not found")

    voice_session.is_active = False
    voice_session.ended_at = datetime.now(timezone.utc)
    voice_session.duration_seconds = body.duration_seconds

    # Generate summary from transcript
    summary = generate_voice_summary(voice_session.full_transcript or "")
    voice_session.summary = summary

    # Save to persistent memory (pgvector)
    if summary:
        await save_voice_session_to_memory(
            db=db,
            user_id=user.id,
            voice_session_id=voice_session.id,
            summary=summary,
            transcript_excerpt=voice_session.full_transcript[:500] if voice_session.full_transcript else None,
        )

    await db.flush()

    logger.info("Voice session ended", session_id=str(voice_session.id), summary_len=len(summary))

    return {
        "status": "ended",
        "voice_session_id": str(voice_session.id),
        "summary": summary,
        "duration_seconds": body.duration_seconds,
        "memory_stored": bool(summary),
    }


# ─────────────────────────────────────────
# GET VOICE SESSION HISTORY
# ─────────────────────────────────────────
@router.get("/history")
async def get_voice_history(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get all past voice sessions for the user."""
    result = await db.execute(
        select(VoiceSession)
        .where(VoiceSession.user_id == user.id)
        .order_by(VoiceSession.created_at.desc())
        .limit(50)
    )
    sessions = result.scalars().all()
    return [
        {
            "id": str(s.id),
            "title": s.title,
            "is_active": s.is_active,
            "summary": s.summary,
            "duration_seconds": s.duration_seconds,
            "created_at": str(s.created_at),
            "ended_at": str(s.ended_at) if s.ended_at else None,
        }
        for s in sessions
    ]


# ─────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────
def generate_voice_summary(transcript: str) -> str:
    """
    Generate a summary from a voice session transcript.
    Phase 2 replaces this with LLM summarization.
    For now: extract the first meaningful sentences.
    """
    if not transcript or len(transcript) < 50:
        return ""

    lines = [l.strip() for l in transcript.strip().split("\n") if l.strip()]
    # Take first 5 meaningful exchanges
    summary_lines = lines[:10]
    excerpt = " ".join(summary_lines)[:600]

    return f"Voice session covering: {excerpt}"
