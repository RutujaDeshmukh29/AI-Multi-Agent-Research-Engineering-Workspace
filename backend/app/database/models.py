# ========================
# app/database/models.py
# Step 3 — Updated with Voice Support
#
# CONCEPT: Why separate VoiceSession?
# Voice conversations have different properties:
# - They're transcribed from audio (STT)
# - They get summarized into text memories
# - They produce audio output (TTS)
# - They have a "mode" (voice vs text)
# Keeping them separate keeps the schema clean and queryable.
# ========================

from sqlalchemy import (
    Column, String, Text, Boolean, DateTime,
    ForeignKey, Integer, JSON, Float, Enum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
import uuid
import enum

from app.database.db import Base
from app.config import settings


# ── Enums ─────────────────────────────────
class SessionMode(str, enum.Enum):
    text = "text"
    voice = "voice"
    mixed = "mixed"       # started as text, switched to voice mid-session

class MessageRole(str, enum.Enum):
    user = "user"
    assistant = "assistant"
    system = "system"

class MessageInputMode(str, enum.Enum):
    text = "text"
    voice = "voice"       # input came from voice transcription


# ─────────────────────────────────────────
# USER
# ─────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email           = Column(String(255), unique=True, nullable=False, index=True)
    name            = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active       = Column(Boolean, default=True)

    # User preferences — stored as JSON for flexibility
    # e.g. {"voice_enabled": true, "tts_voice": "alloy", "preferred_agents": ["research"]}
    preferences     = Column(JSON, nullable=True, default=dict)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    projects       = relationship("Project",       back_populates="user", cascade="all, delete-orphan")
    memories       = relationship("UserMemory",    back_populates="user", cascade="all, delete-orphan")
    voice_sessions = relationship("VoiceSession",  back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.email}>"


# ─────────────────────────────────────────
# PROJECT
# ─────────────────────────────────────────
class Project(Base):
    __tablename__ = "projects"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name        = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    color       = Column(String(20), nullable=True, default="#6366f1")   # sidebar accent color
    icon        = Column(String(10), nullable=True, default="🧠")

    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    user     = relationship("User",    back_populates="projects")
    sessions = relationship("Session", back_populates="project", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Project {self.name}>"


# ─────────────────────────────────────────
# SESSION (text chat)
# ─────────────────────────────────────────
class Session(Base):
    __tablename__ = "sessions"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id",    ondelete="CASCADE"), nullable=False)
    title      = Column(String(500), default="New Chat")

    # Session mode — text, voice, or mixed
    mode       = Column(String(20), default=SessionMode.text)

    # Is this session currently pinned in sidebar?
    is_pinned  = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    project  = relationship("Project",       back_populates="sessions")
    messages = relationship("Message",       back_populates="session", cascade="all, delete-orphan",
                            order_by="Message.created_at")
    memory   = relationship("SessionMemory", back_populates="session", uselist=False,
                            cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Session {self.title}>"


# ─────────────────────────────────────────
# MESSAGE
# ─────────────────────────────────────────
class Message(Base):
    __tablename__ = "messages"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)

    role       = Column(String(20), nullable=False)          # user | assistant
    content    = Column(Text, nullable=False)                 # final text

    # How the user sent this message
    input_mode = Column(String(20), default=MessageInputMode.text)

    # If voice input — store the original transcript separately
    # (content = processed/cleaned version, transcript = raw STT output)
    transcript = Column(Text, nullable=True)

    # Each agent's individual output stored here
    # {"research": "...", "engineering": "...", "planner": "..."}
    agent_outputs = Column(JSON, nullable=True)

    # Which agents were activated for this message
    agents_used   = Column(JSON, nullable=True)   # ["research", "engineering"]

    # Response time in seconds (for analytics)
    response_time = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    session = relationship("Session", back_populates="messages")

    def __repr__(self):
        return f"<Message {self.role} in {self.session_id}>"


# ─────────────────────────────────────────
# VOICE SESSION
# CONCEPT: Dedicated Voice Chat
# A VoiceSession is a standalone voice conversation.
# It transcribes everything said, stores the full transcript,
# and at the end generates a summary stored in UserMemory (pgvector).
# This summary persists — so future sessions can remember
# "last time we talked about X via voice".
#
# Think of it like a meeting recording → meeting notes → stored in memory.
# ─────────────────────────────────────────
class VoiceSession(Base):
    __tablename__ = "voice_sessions"

    id      = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Optional link to a project
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)

    title     = Column(String(500), default="Voice Chat")
    is_active = Column(Boolean, default=True)    # False = session ended

    # Full transcript of the entire voice session
    # Accumulated as the conversation goes on
    full_transcript = Column(Text, nullable=True)

    # AI-generated summary created when session ends
    # Stored in UserMemory as an embedding for future recall
    summary = Column(Text, nullable=True)

    # Duration in seconds
    duration_seconds = Column(Integer, nullable=True)

    # TTS voice preference for this session
    tts_voice = Column(String(50), default="alloy")   # OpenAI-compatible voice names

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at   = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user     = relationship("User",    back_populates="voice_sessions")
    messages = relationship("VoiceMessage", back_populates="voice_session",
                            cascade="all, delete-orphan", order_by="VoiceMessage.created_at")

    def __repr__(self):
        return f"<VoiceSession {self.title}>"


# ─────────────────────────────────────────
# VOICE MESSAGE
# Each turn in a voice conversation.
# STT = Speech-to-Text (user input)
# TTS = Text-to-Speech (AI output, read aloud)
# ─────────────────────────────────────────
class VoiceMessage(Base):
    __tablename__ = "voice_messages"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    voice_session_id = Column(UUID(as_uuid=True), ForeignKey("voice_sessions.id", ondelete="CASCADE"), nullable=False)

    role             = Column(String(20), nullable=False)     # user | assistant

    # Raw STT transcript (what the user said)
    transcript       = Column(Text, nullable=False)

    # AI response text (gets converted to speech)
    response_text    = Column(Text, nullable=True)

    # Agent outputs for this voice turn
    agent_outputs    = Column(JSON, nullable=True)

    # Audio metadata
    audio_duration   = Column(Float, nullable=True)           # seconds of audio
    confidence_score = Column(Float, nullable=True)           # STT confidence 0-1

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    voice_session = relationship("VoiceSession", back_populates="messages")

    def __repr__(self):
        return f"<VoiceMessage {self.role} in {self.voice_session_id}>"


# ─────────────────────────────────────────
# USER MEMORY — pgvector (replaces ChromaDB)
#
# CONCEPT: Semantic Memory
# Every important thing a user discusses gets embedded as a vector.
# When a new session starts, we do a similarity search to find
# relevant past memories and inject them into the system prompt.
# This gives the AI "long-term memory" across sessions.
#
# Example: User worked on a drone project in session 1.
# In session 5, they ask about sensors.
# Similarity search finds the drone memory → injected as context.
# AI knows about the drone without being told again.
# ─────────────────────────────────────────
class UserMemory(Base):
    __tablename__ = "user_memory"

    id      = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
                     nullable=False, index=True)

    # The memory text (session summary, key fact, preference, etc.)
    content   = Column(Text, nullable=False)

    # Memory type for filtering
    # "session_summary" | "voice_summary" | "preference" | "project_context"
    memory_type = Column(String(50), default="session_summary")

    # pgvector 384-dim embedding — THIS is the vector database
    embedding = Column(Vector(settings.EMBEDDING_DIMENSIONS), nullable=True)

    # Flexible metadata
    metadata_ = Column("metadata", JSON, nullable=True)

    # Optional source references
    source_session_id      = Column(UUID(as_uuid=True), nullable=True)
    source_voice_session_id = Column(UUID(as_uuid=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="memories")

    def __repr__(self):
        return f"<UserMemory [{self.memory_type}] user={self.user_id}>"


# ─────────────────────────────────────────
# SESSION MEMORY — running context summary
# ─────────────────────────────────────────
class SessionMemory(Base):
    __tablename__ = "session_memory"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"),
                        nullable=False, unique=True)

    # Rolling summary — updated every 5 messages
    summary       = Column(Text, nullable=True)

    # Last N messages as JSON for immediate context window
    context       = Column(JSON, nullable=True)

    # Topics detected in this session (for search/filter)
    topics        = Column(JSON, nullable=True)   # ["LangGraph", "drone", "Python"]

    message_count = Column(Integer, default=0)

    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    session = relationship("Session", back_populates="memory")

    def __repr__(self):
        return f"<SessionMemory session={self.session_id}>"


# ─────────────────────────────────────────
# PROJECT ROADMAP — AI-generated, stored per project
# ─────────────────────────────────────────
class ProjectRoadmap(Base):
    __tablename__ = "project_roadmaps"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id     = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id        = Column(UUID(as_uuid=True), ForeignKey("users.id",    ondelete="CASCADE"), nullable=False)
    session_id     = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True)
    project_title  = Column(String(500), nullable=False)
    total_phases   = Column(Integer, default=0)
    estimated_weeks= Column(Integer, default=0)
    phases_json    = Column(JSON, nullable=True)      # full phase/task structure
    progress_percent = Column(Integer, default=0)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    tasks = relationship("RoadmapTask", back_populates="roadmap", cascade="all, delete-orphan")


# ─────────────────────────────────────────
# ROADMAP TASK — individual checkbox item
# Each task is a row — completed state tracked here
# ─────────────────────────────────────────
class RoadmapTask(Base):
    __tablename__ = "roadmap_tasks"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    roadmap_id     = Column(UUID(as_uuid=True), ForeignKey("project_roadmaps.id", ondelete="CASCADE"), nullable=False)
    phase_id       = Column(String(100), nullable=False)
    task_id        = Column(String(100), nullable=False)
    title          = Column(String(500), nullable=False)
    description    = Column(Text, nullable=True)
    estimated_hours= Column(Integer, default=2)
    priority       = Column(String(20), default="medium")
    tags           = Column(JSON, nullable=True)
    phase_index    = Column(Integer, default=0)
    task_index     = Column(Integer, default=0)
    completed      = Column(Boolean, default=False)
    completed_at   = Column(DateTime(timezone=True), nullable=True)

    roadmap = relationship("ProjectRoadmap", back_populates="tasks")
