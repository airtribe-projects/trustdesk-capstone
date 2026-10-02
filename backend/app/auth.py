"""Minimal configuration-based authentication for application endpoints."""

import secrets

from fastapi import Header, HTTPException, status

from .config import get_settings


def require_api_token(authorization: str | None = Header(default=None)) -> None:
    """Require the configured bearer token for protected API routes."""

    expected_token = get_settings().api_token
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not secrets.compare_digest(token, expected_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
