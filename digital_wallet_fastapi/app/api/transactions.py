from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id
from app.database import get_db
from app.schemas.common import ApiResponse
from app.schemas.transaction import TransferRequest, TransactionResponse
from app.services import transaction_service

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])


@router.post("/transfer", response_model=ApiResponse)
async def transfer(
    data: TransferRequest,
    user_id: int = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
):
    async with session.begin():
        await transaction_service.transfer(
            session, user_id, data.to_username, data.amount
        )
    return ApiResponse.success("Transfer completed successfully")


@router.get("", response_model=list[TransactionResponse])
async def get_transaction_history(
    user_id: int = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
):
    return await transaction_service.get_transaction_history(session, user_id)
