# ========================
# app/database/db.py
# Async database engine, session factory, init_db
# Uses SQLAlchemy 2.0 async with asyncpg driver
# ========================

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    AsyncEngine,
    create_async_engine,
    async_sessionmaker,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
import structlog

from app.config import settings

logger = structlog.get_logger()


# ─────────────────────────────────────────
# BASE CLASS  — all models inherit from this
# ─────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ─────────────────────────────────────────
# ENGINE  — one shared async engine
# ─────────────────────────────────────────
engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,          # logs every SQL query in debug mode
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,           # test connection before using from pool
)


# ─────────────────────────────────────────
# SESSION FACTORY
# ─────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,       # don't expire objects after commit
    autoflush=False,
    autocommit=False,
)


# ─────────────────────────────────────────
# DEPENDENCY — use in every route that needs DB
# Usage:  async def my_route(db: AsyncSession = Depends(get_db))
# ─────────────────────────────────────────
async def get_db() -> AsyncSession:  # type: ignore[return]
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ─────────────────────────────────────────
# INIT DB  — called on startup
# Creates all tables + enables pgvector
# ─────────────────────────────────────────
async def init_db() -> None:
    """
    On startup:
    1. Enable pgvector extension (if using PostgreSQL)
    2. Create all tables from SQLAlchemy models
    """
    async with engine.begin() as conn:
        # For PostgreSQL, enable pgvector extension
        if settings.DATABASE_URL.startswith("postgresql"):
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            logger.info("✅ pgvector extension enabled")
        else:
            logger.info("ⓘ Skipping pgvector setup (not using PostgreSQL)")

        # Import all models so Base knows about them before create_all
        from app.database.models import User, Project, Session, Message, UserMemory, SessionMemory  # noqa: F401

        # Create tables (won't overwrite existing ones)
        await conn.run_sync(Base.metadata.create_all)
        logger.info("✅ Tables created/verified")


# ─────────────────────────────────────────
# HEALTH CHECK  — used in /health endpoint
# ─────────────────────────────────────────
async def check_db_connection() -> bool:
    """
    Returns True if we can reach the database, False otherwise.
    Used in the /health endpoint so frontend knows if DB is up.
    """
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error("Database connection check failed", error=str(e))
        return False
