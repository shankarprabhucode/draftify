"""Password hashing, session tokens and the current-user dependency.

Sessions are a signed JWT carried in an HTTP-only cookie. The browser never
reads it, the API is same-origin (dev proxy and Vercel rewrite), and SameSite
keeps cross-site requests from carrying it.
"""

from __future__ import annotations

import os
import time
from collections import defaultdict, deque
from datetime import timedelta
from threading import Lock
from typing import Annotated

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Depends, HTTPException, Request, Response, status

from models import User, utcnow
from store import ensure_store

COOKIE_NAME = "draftify_session"
SESSION_TTL = timedelta(days=7)
_DEV_SECRET = "dev-only-secret-not-for-production-use-0123456789"

_hasher = PasswordHasher()


def secret_key() -> str:
    key = os.getenv("SECRET_KEY")
    if key:
        return key
    if os.getenv("VERCEL"):
        raise RuntimeError("SECRET_KEY must be set in production")
    return _DEV_SECRET


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False
    except Exception:  # malformed hash
        return False


def create_token(user_id: int) -> str:
    now = utcnow()
    return jwt.encode(
        {"sub": str(user_id), "iat": now, "exp": now + SESSION_TTL},
        secret_key(),
        algorithm="HS256",
    )


def read_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, secret_key(), algorithms=["HS256"])
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None


def set_session_cookie(response: Response, request: Request, user_id: int) -> None:
    response.set_cookie(
        COOKIE_NAME,
        create_token(user_id),
        max_age=int(SESSION_TTL.total_seconds()),
        httponly=True,
        samesite="lax",
        secure=request.url.scheme == "https" or bool(os.getenv("VERCEL")),
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME, path="/")


def unauthorized() -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Not signed in")


def current_user(request: Request) -> User:
    """Resolve the session cookie to a user, or 401."""
    token = request.cookies.get(COOKIE_NAME)
    user_id = read_token(token) if token else None
    if user_id is None:
        raise unauthorized()
    user = ensure_store(request.app).get_user(user_id)
    if user is None:
        raise unauthorized()
    return user


CurrentUser = Annotated[User, Depends(current_user)]


class LoginRateLimiter:
    """Allow a handful of failed logins per key (client + email) per window."""

    def __init__(self, limit: int = 10, window_seconds: int = 300) -> None:
        self._limit = limit
        self._window = window_seconds
        self._failures: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def _prune(self, key: str, now: float) -> deque[float]:
        q = self._failures[key]
        while q and q[0] < now - self._window:
            q.popleft()
        return q

    def blocked(self, key: str) -> bool:
        with self._lock:
            return len(self._prune(key, time.monotonic())) >= self._limit

    def record_failure(self, key: str) -> None:
        with self._lock:
            self._prune(key, time.monotonic()).append(time.monotonic())

    def reset(self, key: str) -> None:
        with self._lock:
            self._failures.pop(key, None)


login_limiter = LoginRateLimiter()
