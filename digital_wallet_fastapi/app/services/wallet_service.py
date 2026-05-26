from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.handlers import WalletNotFoundException
from app.models.wallet import Wallet
from app.schemas.wallet import WalletResponse


async def get_wallet_by_user_id(session: AsyncSession, user_id: int) -> WalletResponse:
    stmt = select(Wallet).where(Wallet.user_id == user_id)
    result = await session.execute(stmt)
    wallet = result.scalar_one_or_none()

    if wallet is None:
        raise WalletNotFoundException(f"Wallet not found for userId: {user_id}")

    return WalletResponse(
        id=wallet.id,
        userId=wallet.user_id,
        currency=wallet.currency,
        balance=wallet.balance,
        version=wallet.version,
        updatedAt=wallet.updated_at,
    )
