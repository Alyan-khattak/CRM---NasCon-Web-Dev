"""
slowapi rate limiting setup.
Rule: auth routes 5/minute, all others 60/minute.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings

limiter = Limiter(key_func=get_remote_address, default_limits=[settings.RATE_LIMIT_DEFAULT])

# Convenience decorators — apply on route functions
auth_limit = limiter.limit(settings.RATE_LIMIT_AUTH)
default_limit = limiter.limit(settings.RATE_LIMIT_DEFAULT)
