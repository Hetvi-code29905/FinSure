# app/services/auth_service.py
from datetime import datetime, timedelta, timezone
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import Collections
from app.core.exceptions import AuthException, ConflictException, ValidationException
from app.core.logging import get_logger
from app.core.security import (
    TOKEN_TYPE_REFRESH, create_token_pair, decode_token,
    hash_password, hash_refresh_token, validate_password_strength, verify_password,
)
from app.models.audit_log import AuditEvent
from app.models.user import new_user_doc, serialize_user
from app.repositories.user_repository import UserRepository
from app.services.audit_service import AuditService

logger            = get_logger(__name__)
MAX_ATTEMPTS      = 5
LOCKOUT_MINUTES   = 15


class AuthService:

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db      = db
        self.users   = UserRepository(db)
        self.tokens  = db[Collections.REFRESH_TOKENS]
        self.audit   = AuditService(db)

    # ── Register ──────────────────────────────────────────────

    async def register(self, email: str, password: str, full_name: str,
                       currency: str = "INR", monthly_income_range: str = "Not specified",
                       pay_cycle: str = "Monthly", basic_goal: str = "Just track",
                       ip: Optional[str] = None) -> dict:
        valid, msg = validate_password_strength(password)
        if not valid:
            raise ValidationException(msg)

        if await self.users.email_exists(email):
            raise ConflictException("An account with this email already exists.")

        doc    = new_user_doc(email, hash_password(password), full_name, 
                              currency=currency, monthly_income_range=monthly_income_range, 
                              pay_cycle=pay_cycle, basic_goal=basic_goal)
        uid    = await self.users.insert_one(doc)
        tokens = create_token_pair(uid)
        await self._store_refresh(uid, tokens["refresh_token"], tokens["refresh_token_expires_at"])
        await self.audit.log(AuditEvent.REGISTER, uid, ip, {"email": email})
        logger.info("User registered", extra={"user_id": uid})
        return {"user": serialize_user({**doc, "_id": doc.get("_id", uid)}), "tokens": tokens}

    # ── Login ─────────────────────────────────────────────────

    async def login(self, email: str, password: str, ip: Optional[str] = None) -> dict:
        user = await self.users.find_by_email(email)
        if not user:
            verify_password(password, "$2b$12$dummy.hash.prevents.timing.attack.xxxxxxxx")
            await self.audit.log(AuditEvent.LOGIN_FAILED, None, ip,
                                 {"email": email, "reason": "not_found"}, success=False)
            raise AuthException("Invalid email or password.")

        uid = str(user["_id"])

        # Lockout check
        locked = user.get("locked_until")
        if locked and locked > datetime.now(timezone.utc):
            mins = int((locked - datetime.now(timezone.utc)).total_seconds() / 60) + 1
            raise AuthException(f"Account locked. Try again in {mins} minute(s).")

        if not verify_password(password, user["hashed_password"]):
            attempts = (user.get("failed_login_attempts") or 0) + 1
            lock_until = (
                datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
                if attempts >= MAX_ATTEMPTS else None
            )
            await self.users.increment_failed_attempts(uid, lock_until)
            await self.audit.log(AuditEvent.LOGIN_FAILED, uid, ip,
                                 {"attempts": attempts}, success=False)
            raise AuthException("Invalid email or password.")

        if not user.get("is_active", True):
            raise AuthException("Account deactivated. Contact support.")

        await self.users.reset_login_state(uid)
        tokens = create_token_pair(uid)
        await self._store_refresh(uid, tokens["refresh_token"], tokens["refresh_token_expires_at"])
        await self.audit.log(AuditEvent.LOGIN, uid, ip)
        logger.info("User logged in", extra={"user_id": uid})
        return {"user": serialize_user(user), "tokens": tokens}

    # ── Refresh ───────────────────────────────────────────────

    async def refresh(self, raw_token: str, ip: Optional[str] = None) -> dict:
        payload  = decode_token(raw_token, TOKEN_TYPE_REFRESH)
        uid      = payload["sub"]
        th       = hash_refresh_token(raw_token)
        stored   = await self.tokens.find_one({"token_hash": th, "user_id": uid})

        if not stored:
            # Token reuse — nuke all sessions for this user
            await self.tokens.delete_many({"user_id": uid})
            logger.warning("Refresh token reuse detected", extra={"user_id": uid})
            raise AuthException("Refresh token invalid or already used.")

        await self.tokens.delete_one({"token_hash": th})
        tokens = create_token_pair(uid)
        await self._store_refresh(uid, tokens["refresh_token"], tokens["refresh_token_expires_at"])
        await self.audit.log(AuditEvent.TOKEN_REFRESH, uid, ip)
        return tokens

    # ── Logout ────────────────────────────────────────────────

    async def logout(self, uid: str, raw_token: Optional[str] = None,
                     ip: Optional[str] = None) -> None:
        if raw_token:
            await self.tokens.delete_one({"token_hash": hash_refresh_token(raw_token)})
        else:
            await self.tokens.delete_many({"user_id": uid})
        await self.audit.log(AuditEvent.LOGOUT, uid, ip)

    # ── Change password ───────────────────────────────────────

    async def change_password(self, uid: str, current: str, new: str,
                               ip: Optional[str] = None) -> None:
        from bson import ObjectId
        user = await self.users.find_by_id(uid)
        if not user or not verify_password(current, user["hashed_password"]):
            raise AuthException("Current password is incorrect.")
        valid, msg = validate_password_strength(new)
        if not valid:
            raise ValidationException(msg)
        await self.users.collection.update_one(
            {"_id": ObjectId(uid)},
            {"$set": {"hashed_password": hash_password(new),
                      "updated_at": datetime.now(timezone.utc)}},
        )
        await self.tokens.delete_many({"user_id": uid})
        await self.audit.log(AuditEvent.PASSWORD_CHANGE, uid, ip)

    # ── Internal ──────────────────────────────────────────────

    async def _store_refresh(self, uid: str, raw: str, expires_iso: str) -> None:
        exp = datetime.fromisoformat(expires_iso.replace("Z", "+00:00"))
        await self.tokens.insert_one({
            "user_id":    uid,
            "token_hash": hash_refresh_token(raw),
            "expires_at": exp,
            "created_at": datetime.now(timezone.utc),
        })