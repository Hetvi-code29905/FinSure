# app/utils/rate_limit.py
"""
Rate limiting helpers using slowapi.
Import `limiter` in main.py and route decorators.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

# Global limiter instance — attached to app.state in main.py
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"],
)

# Reusable limit strings for specific routes
AUTH_LIMIT    = f"{settings.LOGIN_RATE_LIMIT_PER_MINUTE}/minute"
DEFAULT_LIMIT = f"{settings.RATE_LIMIT_PER_MINUTE}/minute"

rate_limiter = limiter