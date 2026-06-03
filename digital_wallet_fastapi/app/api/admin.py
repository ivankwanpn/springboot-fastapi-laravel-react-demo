from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_admin
from app.database import get_db
from app.schemas.admin import PaginatedResponse, UserDetailResponse, AdminTransactionResponse, TransactionStatsResponse
from app.schemas.common import ApiResponse
from app.services import admin_service

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/users", response_model=PaginatedResponse)
async def list_users(
    search: str = Query(default=""),
    page: int = Query(default=1),
    size: int = Query(default=20),
    _: None = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    return await admin_service.list_users(session, search, page, size)


@router.get("/users/{user_id}", response_model=UserDetailResponse)
async def get_user_detail(
    user_id: int,
    _: None = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    result = await admin_service.get_user_detail(session, user_id)
    return UserDetailResponse(**result)


@router.put("/users/{user_id}/disable", response_model=ApiResponse)
async def disable_user(
    user_id: int,
    _: None = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    async with session.begin():
        await admin_service.disable_user(session, user_id)
    return ApiResponse.success("User disabled successfully")


@router.put("/users/{user_id}/enable", response_model=ApiResponse)
async def enable_user(
    user_id: int,
    _: None = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    async with session.begin():
        await admin_service.enable_user(session, user_id)
    return ApiResponse.success("User enabled successfully")


@router.get("/transactions", response_model=PaginatedResponse[AdminTransactionResponse])
async def list_transactions(
    username: str | None = Query(default=None),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    page: int = Query(default=1),
    size: int = Query(default=20),
    _: None = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    return await admin_service.list_transactions(session, username, from_date, to_date, page, size)


@router.get("/transactions/stats", response_model=TransactionStatsResponse)
async def get_transaction_stats(
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    _: None = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    result = await admin_service.get_transaction_stats(session, from_date, to_date)
    return TransactionStatsResponse(**result)
