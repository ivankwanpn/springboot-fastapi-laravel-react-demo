from decimal import Decimal

from sqlalchemy import select, update, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.handlers import (
    AppException,
    WalletNotFoundException,
    InsufficientBalanceException,
    ConcurrentModificationException,
)
from app.models.user import User
from app.models.wallet import Wallet
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionResponse


async def transfer(
    session: AsyncSession,
    from_user_id: int,
    to_username: str,
    amount: Decimal,
) -> None:
    if amount <= 0:
        raise AppException(400, "Transfer amount must be greater than zero")

    # lookup recipient by username
    stmt = select(User).where(User.username == to_username)
    result = await session.execute(stmt)
    to_user = result.scalar_one_or_none()
    if to_user is None:
        raise AppException(400, f"Recipient not found: {to_username}")
    to_user_id = to_user.id
    if from_user_id == to_user_id:
        raise AppException(400, "Cannot transfer to yourself")

    # read wallets
    stmt = select(Wallet).where(Wallet.user_id == from_user_id)
    result = await session.execute(stmt)
    from_wallet = result.scalar_one_or_none()
    if from_wallet is None:
        raise WalletNotFoundException(f"Wallet not found for userId: {from_user_id}")

    stmt = select(Wallet).where(Wallet.user_id == to_user_id)
    result = await session.execute(stmt)
    to_wallet = result.scalar_one_or_none()
    if to_wallet is None:
        raise WalletNotFoundException(f"Wallet not found for userId: {to_user_id}")

    # balance check (fail-fast)
    if from_wallet.balance < amount:
        raise InsufficientBalanceException(
            f"Insufficient balance: {from_wallet.balance} < {amount}"
        )

    # optimistic lock deduct
    deduct_stmt = (
        update(Wallet)
        .where(Wallet.user_id == from_user_id, Wallet.version == from_wallet.version)
        .values(
            balance=Wallet.balance - amount,
            version=Wallet.version + 1,
            updated_at=func.now(),
        )
    )
    result = await session.execute(deduct_stmt)
    if result.rowcount == 0:
        raise ConcurrentModificationException(
            f"Concurrent modification detected for userId: {from_user_id}"
        )

    # add balance
    add_stmt = (
        update(Wallet)
        .where(Wallet.user_id == to_user_id)
        .values(
            balance=Wallet.balance + amount,
            version=Wallet.version + 1,
            updated_at=func.now(),
        )
    )
    await session.execute(add_stmt)

    # record transaction
    tx = Transaction(
        from_wallet_id=from_wallet.id,
        to_wallet_id=to_wallet.id,
        amount=amount,
        tx_type="TRANSFER",
        status="SUCCESS",
    )
    session.add(tx)


async def get_transaction_history(
    session: AsyncSession, user_id: int
) -> list[TransactionResponse]:
    # get wallet id
    stmt = select(Wallet).where(Wallet.user_id == user_id)
    result = await session.execute(stmt)
    wallet = result.scalar_one_or_none()
    if wallet is None:
        raise WalletNotFoundException(f"Wallet not found for userId: {user_id}")

    # query transactions
    stmt = (
        select(Transaction)
        .where(
            or_(
                Transaction.from_wallet_id == wallet.id,
                Transaction.to_wallet_id == wallet.id,
            )
        )
        .order_by(Transaction.created_at.desc())
    )
    result = await session.execute(stmt)
    transactions = result.scalars().all()

    return [
        TransactionResponse(
            id=tx.id,
            fromWalletId=tx.from_wallet_id,
            toWalletId=tx.to_wallet_id,
            amount=tx.amount,
            txType=tx.tx_type,
            status=tx.status,
            createdAt=tx.created_at,
        )
        for tx in transactions
    ]
