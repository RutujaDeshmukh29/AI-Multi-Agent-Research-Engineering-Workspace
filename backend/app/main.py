# ========================
# app/main.py
# FastAPI application entry point
# Step 2 — fully wired backend
# ========================

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import structlog
import time

from app.config import settings

logger = structlog.get_logger()


# ─────────────────────────────────────────
# LIFESPAN  (startup / shutdown)
# ─────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── STARTUP ──────────────────────────
    logger.info(
        "🚀 Starting AI Multi-Agent Workspace",
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
    )

    from app.database.db import init_db
    await init_db()
    logger.info("✅ Database ready")

    yield  # ← app runs here

    # ── SHUTDOWN ─────────────────────────
    logger.info("👋 Shutting down AI Multi-Agent Workspace")


# ─────────────────────────────────────────
# APP INSTANCE
# ─────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI Multi-Agent Research & Engineering Workspace API",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)


# ─────────────────────────────────────────
# MIDDLEWARE
# ─────────────────────────────────────────

# CORS — allows the Next.js frontend (localhost:3000) to call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request timing — shows how long each request took in the response header
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = round((time.time() - start) * 1000, 2)
    response.headers["X-Process-Time"] = f"{duration}ms"
    return response


# ─────────────────────────────────────────
# GLOBAL ERROR HANDLER
# ─────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception", path=request.url.path, error=str(exc))
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "path": str(request.url.path)},
    )


# ─────────────────────────────────────────
# ROUTERS  — add as each phase is built
# ─────────────────────────────────────────
from app.auth.auth_routes import router as auth_router  # noqa: E402

app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])

# Phase 2+ (uncomment as we build each step)
# from app.routes.chat_routes    import router as chat_router
# from app.routes.project_routes import router as project_router
# from app.routes.user_routes    import router as user_router
# app.include_router(chat_router,    prefix="/api/chat",     tags=["Chat"])
# app.include_router(project_router, prefix="/api/projects", tags=["Projects"])
# app.include_router(user_router,    prefix="/api/users",    tags=["Users"])


# ─────────────────────────────────────────
# HEALTH ENDPOINTS
# ─────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "online",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "docs": "/docs" if settings.DEBUG else "disabled in production",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """
    Live health check — frontend calls this on load to confirm backend is up.
    Returns 'degraded' if DB is unreachable but app is still running.
    """
    from app.database.db import check_db_connection
    db_ok = await check_db_connection()

    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "unreachable",
        "agents": "ready",
        "version": settings.APP_VERSION,
    }


@app.get("/api/v1/status", tags=["Health"])
async def api_status():
    """Detailed status — frontend reads this on load to show agent availability."""
    return {
        "api_version": "v1",
        "status": "operational",
        "agents": {
            "qa":          {"status": "ready", "icon": "🧠"},
            "research":    {"status": "ready", "icon": "🔍"},
            "engineering": {"status": "ready", "icon": "⚙️"},
            "innovation":  {"status": "ready", "icon": "💡"},
            "critic":      {"status": "ready", "icon": "🎯"},
            "planner":     {"status": "ready", "icon": "🗺️"},
        },
        "features": {
            "streaming":         True,
            "persistent_memory": True,
            "workspace":         True,
            "auth":              True,
        },
    }
