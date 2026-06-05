# ========================
# app/auth/dependencies.py
# FastAPI dependency injection for auth
#
# CONCEPT: Dependency Injection in FastAPI
# Instead of repeating auth logic in every route,
# you declare it as a dependency:
#   async def my_route(current_user: User = Depends(get_current_user))
# FastAPI automatically calls get_current_user() before your route runs.
# If auth fails → 401 returned before your route code even executes.
# ========================

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.db import get_db
from app.database.models import User
from app.database import crud
from app.auth.jwt_handler import verify_token
import uuid

# HTTPBearer reads the "Authorization: Bearer <token>" header automatically
bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Core auth dependency.
    1. Extracts Bearer token from Authorization header
    2. Verifies JWT signature and expiry
    3. Loads user from DB
    4. Returns User object to the route

    Usage in any protected route:
        async def my_route(user: User = Depends(get_current_user)):
    """
    token = credentials.credentials
    user_id_str = verify_token(token, expected_type="access")

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format",
        )

    user = await crud.get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )
    return user
