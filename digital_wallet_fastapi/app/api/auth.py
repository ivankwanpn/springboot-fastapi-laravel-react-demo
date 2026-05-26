from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.auth import UserCreate, LoginRequest, LoginResponse
from app.schemas.common import ApiResponse
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register", status_code=201, response_model=ApiResponse)
async def register(data: UserCreate, session: AsyncSession = Depends(get_db)):
    async with session.begin():
        await auth_service.register(session, data.username, data.password)
    return ApiResponse.success("User registered successfully")


@router.post("/login", response_model=LoginResponse)
async def login(data: LoginRequest, session: AsyncSession = Depends(get_db)):
    return await auth_service.login(session, data.username, data.password)
