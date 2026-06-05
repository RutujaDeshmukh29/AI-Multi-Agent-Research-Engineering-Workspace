# ========================
# app/database/models.py
# All SQLAlchemy ORM models
# pgvector replaces ChromaDB — vectors stored here
# ========================

from sqlalchemy import (
    Column, String, Text, Boolean, DateTime,
    ForeignKey, Integer, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
import uuid

from app.database.db import Base
from app.config import settings


# ─────────────────────────────────────────
# USER
# ─────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    memories = relationship("UserMemory", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.email}>"


# ─────────────────────────────────────────
# PROJECT (like a "workspace" folder)
# ─────────────────────────────────────────
class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="projects")
    sessions = relationship("Session", back_populates="project", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Project {self.name}>"


# ─────────────────────────────────────────
# SESSION (one chat conversation inside a project)
# ─────────────────────────────────────────
class Session(Base):
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), default="New Chat")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    project = relationship("Project", back_populates="sessions")
    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")
    memory = relationship("SessionMemory", back_populates="session", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Session {self.title}>"


# ─────────────────────────────────────────
# MESSAGE (single message in a session)
# ─────────────────────────────────────────
class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)

    # "user" or "assistant"
    role = Column(String(20), nullable=False)

    # The final combined response text
    content = Column(Text, nullable=False)

    # JSON blob storing each agent's individual output
    # e.g. {"research": "...", "engineering": "...", "planner": "..."}
    agent_outputs = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    session = relationship("Session", back_populates="messages")

    def __repr__(self):
        return f"<Message {self.role[:4]} in session {self.session_id}>"


# ─────────────────────────────────────────
# USER MEMORY  — replaces ChromaDB entirely
#
# Each row = one memory chunk for a user
# embedding column = pgvector VECTOR type
# Persists forever in PostgreSQL (survives deploys)
# ─────────────────────────────────────────
class UserMemory(Base):
    __tablename__ = "user_memory"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # The text that was embedded (e.g. a summary of past work)
    content = Column(Text, nullable=False)

    # pgvector column — 384 dimensions (all-MiniLM-L6-v2)
    # This IS your vector database. No ChromaDB needed.
    embedding = Column(Vector(settings.EMBEDDING_DIMENSIONS), nullable=True)

    # Flexible metadata — store project context, timestamps, tags
    metadata_ = Column("metadata", JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="memories")

    def __repr__(self):
        return f"<UserMemory user={self.user_id}>"


# ─────────────────────────────────────────
# SESSION MEMORY  — running summary of a chat
#
# One row per session — updated as conversation grows
# The AI reads this to stay in context across turns
# ─────────────────────────────────────────
class SessionMemory(Base):
    __tablename__ = "session_memory"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, unique=True)

    # Running summary — updated after every few messages
    summary = Column(Text, nullable=True)

    # Full context window — last N messages as JSON
    context = Column(JSON, nullable=True)

    # How many messages this summary covers
    message_count = Column(Integer, default=0)

    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    session = relationship("Session", back_populates="memory")

    def __repr__(self):
        return f"<SessionMemory session={self.session_id}>"
