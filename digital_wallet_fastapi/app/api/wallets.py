from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id
from app.database import get_db
from app.schemas.wallet import WalletResponse
from app.services import wallet_service

router = APIRouter(prefix="/api/wallets", tags=["Wallets"])


@router.get("", response_model=WalletResponse)
async def get_wallet(
    user_id: int = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
):
    return await wallet_service.get_wallet_by_user_id(session, user_id)
