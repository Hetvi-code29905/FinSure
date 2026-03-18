# app/core/security.py
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from uuid import uuid4

from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

TOKEN_TYPE_ACCESS  = "access"
TOKEN_TYPE_REFRESH = "refresh"

CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials.",
    headers={"WWW-Authenticate": "Bearer"},
)


# ── Password ──────────────────────────────────────────────────
def get_password_hash(password: str) -> str:
    """Hash a password for storing it."""
    return pwd_context.hash(password)

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def validate_password_strength(password: str) -> tuple[bool, str]:
    if len(password) < 8:
        return False, "Password must be at least 8 characters."
    if not any(c.isupper() for c in password):
        return False, "Must contain at least one uppercase letter."
    if not any(c.isdigit() for c in password):
        return False, "Must contain at least one digit."
    if not any(c in "!@#$%^&*()_+-=[]{}|;':\",./<>?" for c in password):
        return False, "Must contain at least one special character."
    return True, ""


# ── Tokens ────────────────────────────────────────────────────
def create_access_token(subject: str, extra: Optional[dict] = None) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub":  subject,
        "iat":  now,
        "exp":  now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "jti":  str(uuid4()),
        "type": TOKEN_TYPE_ACCESS,
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(subject: str) -> Tuple[str, datetime]:
    now    = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub":  subject,
        "iat":  now,
        "exp":  expire,
        "jti":  str(uuid4()),
        "type": TOKEN_TYPE_REFRESH,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM), expire


def hash_refresh_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def create_token_pair(user_id: str) -> dict:
    access               = create_access_token(subject=user_id)
    refresh, refresh_exp = create_refresh_token(subject=user_id)
    return {
        "access_token":             access,
        "refresh_token":            refresh,
        "token_type":               "bearer",
        "expires_in":               settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "refresh_token_expires_at": refresh_exp.isoformat(),
    }


def decode_token(token: str, expected_type: str = TOKEN_TYPE_ACCESS) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError as e:
        logger.warning("JWT decode failed", extra={"error": str(e)})
        raise CREDENTIALS_EXCEPTION
    if payload.get("type") != expected_type:
        raise CREDENTIALS_EXCEPTION
    if not payload.get("sub"):
        raise CREDENTIALS_EXCEPTION
    return payload


def extract_user_id(token: str) -> str:
    return decode_token(token, TOKEN_TYPE_ACCESS)["sub"]