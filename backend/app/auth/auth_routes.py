# ========================
# app/auth/auth_routes.py
# Authentication endpoints
#
# CONCEPT: REST Auth Flow
# POST /signup  → create user, return tokens
# POST /login   → verify password, return tokens
# POST /refresh → swap refresh token for new access token
# GET  /me      → return current user profile
#
# Tokens are returned in JSON response body.
# Frontend stores them in localStorage / Zustand.
# Every subsequent request sends: Authorization: Bearer <access_token>
# ========================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr
import structlog

from app.database.db import get_db
from app.database import crud
from app.auth.jwt_handler import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token,
)
from app.auth.dependencies import get_current_user
from app.database.models import User

router = APIRouter()
logger = structlog.get_logger()


# ─────────────────────────────────────────
# REQUEST / RESPONSE SCHEMAS
# CONCEPT: Pydantic models validate request body automatically.
# If a required field is missing → FastAPI returns 422 before your code runs.
# ─────────────────────────────────────────

class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    created_at: str

    class Config:
        from_attributes = True


# ─────────────────────────────────────────
# POST /api/auth/signup
# ─────────────────────────────────────────
@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    """
    Create a new user account.
    Passwords are bcrypt-hashed before storage.
    Returns access + refresh tokens on success.
    """
    # Check if email already registered
    existing = await crud.get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    # Validate password length
    if len(body.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters",
        )

    # Hash password and create user
    hashed = hash_password(body.password)
    user = await crud.create_user(db, email=body.email, name=body.name, hashed_password=hashed)

    logger.info("New user created", user_id=str(user.id), email=user.email)

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


# ─────────────────────────────────────────
# POST /api/auth/login
# ─────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticate a user with email + password.
    Returns new access + refresh tokens.
    """
    user = await crud.get_user_by_email(db, body.email)

    # IMPORTANT: same error for wrong email AND wrong password
    # This prevents user enumeration attacks
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    logger.info("User logged in", user_id=str(user.id))

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


# ─────────────────────────────────────────
# POST /api/auth/refresh
# ─────────────────────────────────────────
@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """
    Exchange a valid refresh token for a new access token.
    Frontend calls this automatically when a 401 is returned.
    (The Axios interceptor in services/api.ts handles this.)
    """
    import uuid
    user_id_str = verify_token(body.refresh_token, expected_type="refresh")

    user = await crud.get_user_by_id(db, uuid.UUID(user_id_str))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


# ─────────────────────────────────────────
# GET /api/auth/me
# ─────────────────────────────────────────
@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Return the currently authenticated user's profile.
    Protected route — requires valid Bearer token.
    Frontend calls this on load to restore session.
    """
    return UserResponse(
        id=str(current_user.id),
        name=current_user.name,
        email=current_user.email,
        created_at=str(current_user.created_at),
    )
