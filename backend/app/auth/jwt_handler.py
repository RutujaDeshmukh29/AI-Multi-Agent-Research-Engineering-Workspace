# ========================
# app/auth/jwt_handler.py
# JWT token creation and verification
#
# CONCEPT: JSON Web Tokens (JWT)
# JWT is a stateless auth mechanism.
# When a user logs in, the server signs a token with a secret key.
# The token contains the user's ID encoded inside it.
# Every future request sends this token in the Authorization header.
# The server verifies the signature — no DB lookup needed to check auth.
#
# Structure:  header.payload.signature
# Payload contains: user_id, expiry time
# Signature ensures nobody tampered with the payload
# ========================

from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status

from app.config import settings


# ─────────────────────────────────────────
# PASSWORD HASHING
# CONCEPT: bcrypt one-way hashing
# We never store plain passwords — only hashes.
# bcrypt is slow by design — makes brute-force attacks expensive.
# ─────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Hash a plain password. Call this at signup."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its hash. Call this at login."""
    return pwd_context.verify(plain_password, hashed_password)


# ─────────────────────────────────────────
# ACCESS TOKEN  (short-lived, 60 minutes)
# Used for: every API request header
# ─────────────────────────────────────────
def create_access_token(user_id: str) -> str:
    """
    Create a JWT access token.
    Expires in JWT_ACCESS_TOKEN_EXPIRE_MINUTES (default: 60 min).
    """
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": str(user_id),   # "sub" = subject (standard JWT claim)
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


# ─────────────────────────────────────────
# REFRESH TOKEN  (long-lived, 30 days)
# Used for: getting a new access token when old one expires
# Stored in the frontend, sent to /api/auth/refresh
# ─────────────────────────────────────────
def create_refresh_token(user_id: str) -> str:
    """
    Create a JWT refresh token.
    Expires in JWT_REFRESH_TOKEN_EXPIRE_DAYS (default: 30 days).
    """
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "type": "refresh",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


# ─────────────────────────────────────────
# TOKEN VERIFICATION
# ─────────────────────────────────────────
def verify_token(token: str, expected_type: str = "access") -> str:
    """
    Verify a JWT token.
    Returns user_id (str) if valid.
    Raises HTTP 401 if invalid or expired.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id: Optional[str] = payload.get("sub")
        token_type: Optional[str] = payload.get("type")

        if user_id is None:
            raise credentials_exception
        if token_type != expected_type:
            raise credentials_exception

        return user_id

    except JWTError:
        raise credentials_exception
