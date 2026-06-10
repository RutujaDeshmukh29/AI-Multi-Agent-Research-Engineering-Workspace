# ========================
# app/config.py
# Central configuration — reads .env file
# All env vars live here, nowhere else
# ========================

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):

    # ── Application ──────────────────────
    APP_NAME: str = "AI Multi-Agent Workspace"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"

    # ── Server ───────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Comma-separated allowed origins for CORS
    # e.g. "http://localhost:3000,https://your-app.vercel.app"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]


    # ── Database (Supabase / Neon PostgreSQL) ──
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/ai_workspace"
    DATABASE_URL_SYNC: str = "postgresql://postgres:postgres@localhost:5432/ai_workspace"

    # ── JWT ──────────────────────────────
    JWT_SECRET_KEY: str = "change-this-secret-in-production-use-openssl-rand-hex-32"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── Groq API ─────────────────────────
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_MAX_TOKENS: int = 4096
    GROQ_TEMPERATURE: float = 0.7

    # ── Embeddings (sentence-transformers) ──
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSIONS: int = 384

    # ── Optional services ────────────────
    REDIS_URL: str | None = None
    SERPER_API_KEY: str | None = None
    TAVILY_API_KEY: str | None = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"          # ignore unknown vars in .env


# Single shared instance — import this everywhere
settings = Settings()
