from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer

from app.core.security import decode_token
from app.exceptions.handlers import AppException, AuthenticationException

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


async def get_current_user_id(request: Request, token: str | None = Depends(oauth2_scheme)) -> int:
    if token is None:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
        else:
            raise AuthenticationException("Invalid username or password")

    try:
        payload = decode_token(token)
        return int(payload["sub"])
    except Exception:
        raise AuthenticationException("Invalid username or password")


async def require_admin(request: Request, token: str | None = Depends(oauth2_scheme)) -> None:
    if token is None:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
        else:
            raise AuthenticationException("Invalid username or password")

    try:
        payload = decode_token(token)
        role = payload.get("role", "ROLE_USER")
        if role != "ROLE_ADMIN":
            raise AppException(403, "Access denied")
    except AppException:
        raise
    except Exception:
        raise AuthenticationException("Invalid username or password")
