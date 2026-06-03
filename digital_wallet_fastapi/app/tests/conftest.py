import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool
from app.main import app
from app.database import get_db
from app.core.security import create_access_token

TEST_DATABASE_URL = "postgresql+asyncpg://postgres:root@localhost:5433/digital_wallet"

engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
TestSession = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

cleanup_ids = []

async def override_get_db():
    async with TestSession() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db

@pytest_asyncio.fixture(autouse=True)
async def cleanup():
    yield
    for user_id in reversed(cleanup_ids):
        try:
            async with engine.begin() as conn:
                await conn.execute(text("DELETE FROM transactions WHERE from_wallet_id IN (SELECT id FROM wallets WHERE user_id = :uid) OR to_wallet_id IN (SELECT id FROM wallets WHERE user_id = :uid)"), {"uid": user_id})
                await conn.execute(text("DELETE FROM wallets WHERE user_id = :uid"), {"uid": user_id})
                await conn.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": user_id})
        except Exception:
            pass
    cleanup_ids.clear()

@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

async def _create_user_db(username, role, balance):
    password_hash = "$2b$12$LJ3m4ys3Lk0TSwHCpNqrAuLMkGkQJ3qP4RNry0sI2hF1N3FqE0HWa"
    async with engine.begin() as conn:
        result = await conn.execute(
            text("INSERT INTO users (username, password_hash, role) VALUES (:username, :ph, :role) RETURNING id"),
            {"username": username, "ph": password_hash, "role": role}
        )
        user_id = result.scalar_one()
        cleanup_ids.append(user_id)
        await conn.execute(
            text("INSERT INTO wallets (user_id, currency, balance, version) VALUES (:uid, 'USDT', :bal, 0)"),
            {"uid": user_id, "bal": balance}
        )
    return user_id

@pytest_asyncio.fixture
async def admin_headers():
    username = f"admin_{uuid.uuid4().hex[:8]}"
    await _create_user_db(username, "ROLE_ADMIN", 10000)
    token = create_access_token(999, username, "ROLE_ADMIN")  # user_id doesn't matter, we use the token
    return {"Authorization": f"Bearer {token}"}

@pytest_asyncio.fixture
async def user_token():
    """Returns auth headers dict (use ['headers'] for HTTP) and metadata."""
    username = f"user_{uuid.uuid4().hex[:8]}"
    user_id = await _create_user_db(username, "ROLE_USER", 1000)
    token = create_access_token(user_id, username, "ROLE_USER")
    return {"headers": {"Authorization": f"Bearer {token}"}, "username": username, "user_id": user_id}
