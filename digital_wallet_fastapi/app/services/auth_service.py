from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password, create_access_token
from app.exceptions.handlers import AuthenticationException, DuplicateUsernameException
from app.models.user import User
from app.models.wallet import Wallet
from app.schemas.auth import LoginResponse, UserResponse


async def register(session: AsyncSession, username: str, password: str) -> User:
    # role is always ROLE_USER, ignored from client input
    user = User(username=username, password_hash=hash_password(password), role="ROLE_USER")
    session.add(user)
    try:
        await session.flush()
    except IntegrityError:
        raise DuplicateUsernameException(f"Username '{username}' is already taken")

    # create wallet
    wallet = Wallet(user_id=user.id, currency="USDT", balance=0, version=0)
    session.add(wallet)

    return user


async def login(session: AsyncSession, username: str, password: str) -> LoginResponse:
    stmt = select(User).where(User.username == username)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise AuthenticationException("Invalid username or password")

    if not verify_password(password, user.password_hash):
        raise AuthenticationException("Invalid username or password")

    token = create_access_token(user.id, user.username)

    user_response = UserResponse(
        id=user.id,
        username=user.username,
        role=user.role,
        createdAt=user.created_at,
    )

    return LoginResponse(token=token, user=user_response)
