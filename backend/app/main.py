# app/main.py — Final Step 3 with all routes
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import structlog, time

from app.config import settings
logger = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[STARTING] Starting", version=settings.APP_VERSION)
    from app.database.db import init_db
    await init_db()
    logger.info("[SUCCESS] DB ready")
    yield
    logger.info("[SHUTDOWN] Shutdown")

app = FastAPI(
    title=settings.APP_NAME, version=settings.APP_VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

@app.middleware("http")
async def timing(request: Request, call_next):
    t = time.time()
    resp = await call_next(request)
    resp.headers["X-Process-Time"] = f"{round((time.time()-t)*1000,2)}ms"
    return resp

@app.exception_handler(Exception)
async def err_handler(request: Request, exc: Exception):
    logger.error("Error", path=request.url.path, error=str(exc))
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

from app.auth.auth_routes      import router as auth_router
from app.routes.project_routes import router as project_router
from app.routes.user_routes    import router as user_router
from app.routes.voice_routes   import router as voice_router
from app.routes.chat_routes    import router as chat_router
from app.routes.file_routes    import router as file_router
from app.routes.github_routes  import router as github_router

app.include_router(auth_router,    prefix="/api/auth",     tags=["Auth"])
app.include_router(project_router, prefix="/api/projects", tags=["Projects"])
app.include_router(file_router,    prefix="/api",          tags=["Files"])
app.include_router(user_router,    prefix="/api/users",    tags=["Users"])
app.include_router(voice_router,   prefix="/api/voice",    tags=["Voice"])
app.include_router(chat_router,    prefix="/api/chat",     tags=["Chat"])
app.include_router(github_router,  prefix="/api/github",   tags=["GitHub"])

@app.get("/")
async def root():
    return {"status": "online", "app": settings.APP_NAME, "version": settings.APP_VERSION}

@app.get("/health")
async def health():
    from app.database.db import check_db_connection
    db_ok = await check_db_connection()
    return {"status": "healthy" if db_ok else "degraded", "database": "connected" if db_ok else "unreachable"}
