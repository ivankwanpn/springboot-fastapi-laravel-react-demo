from datetime import date
from decimal import Decimal

from sqlalchemy import select, func, text, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.exceptions.handlers import AppException
from app.models.user import User
from app.models.wallet import Wallet
from app.models.transaction import Transaction


async def list_users(session: AsyncSession, search: str, page: int, size: int) -> dict:
    page = max(page, 1)
    size = max(min(size, 100), 1)
    offset = (page - 1) * size

    if search:
        stmt = select(User).where(User.username.ilike(f"%{search}%"))
        count_stmt = select(func.count()).select_from(User).where(User.username.ilike(f"%{search}%"))
    else:
        stmt = select(User)
        count_stmt = select(func.count()).select_from(User)

    stmt = stmt.order_by(User.id).offset(offset).limit(size)
    result = await session.execute(stmt)
    users = result.scalars().all()

    count_result = await session.execute(count_stmt)
    total = count_result.scalar()

    return {
        "data": [{"id": u.id, "username": u.username, "role": u.role, "createdAt": u.created_at} for u in users],
        "page": page,
        "size": size,
        "total": total,
    }


async def get_user_detail(session: AsyncSession, user_id: int) -> dict:
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    if user is None:
        raise AppException(404, f"User not found: {user_id}")

    stmt = select(Wallet).where(Wallet.user_id == user_id)
    result = await session.execute(stmt)
    wallet = result.scalar_one_or_none()

    wallet_dict = None
    recent_tx_list = []

    if wallet is not None:
        wallet_dict = {
            "id": wallet.id, "userId": wallet.user_id, "currency": wallet.currency,
            "balance": str(wallet.balance), "version": wallet.version,
            "updatedAt": wallet.updated_at.isoformat() if wallet.updated_at else None,
        }

        stmt = (
            select(Transaction)
            .where((Transaction.from_wallet_id == wallet.id) | (Transaction.to_wallet_id == wallet.id))
            .order_by(Transaction.created_at.desc())
            .limit(5)
        )
        result = await session.execute(stmt)
        txs = result.scalars().all()
        recent_tx_list = [{
            "id": tx.id, "fromWalletId": tx.from_wallet_id, "toWalletId": tx.to_wallet_id,
            "amount": str(tx.amount), "txType": tx.tx_type, "status": tx.status,
            "createdAt": tx.created_at.isoformat() if tx.created_at else None,
        } for tx in txs]

    return {
        "id": user.id, "username": user.username, "role": user.role,
        "createdAt": user.created_at,
        "wallet": wallet_dict, "recentTransactions": recent_tx_list,
    }


async def disable_user(session: AsyncSession, user_id: int) -> None:
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    if user is None:
        raise AppException(404, f"User not found: {user_id}")
    user.role = "ROLE_DISABLED"
    await session.flush()


async def enable_user(session: AsyncSession, user_id: int) -> None:
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    if user is None:
        raise AppException(404, f"User not found: {user_id}")
    user.role = "ROLE_USER"
    await session.flush()


async def list_transactions(session: AsyncSession, username: str | None, from_date: date | None, to_date: date | None, page: int, size: int) -> dict:
    page = max(page, 1)
    size = max(min(size, 100), 1)
    offset = (page - 1) * size

    FromWallet = aliased(Wallet)
    ToWallet = aliased(Wallet)
    FromUser = aliased(User)
    ToUser = aliased(User)

    cols = (
        Transaction.id, Transaction.from_wallet_id, Transaction.to_wallet_id,
        Transaction.amount, Transaction.tx_type, Transaction.status, Transaction.created_at,
        FromUser.username.label("from_username"), ToUser.username.label("to_username"),
    )

    stmt = (
        select(*cols).select_from(Transaction)
        .outerjoin(FromWallet, Transaction.from_wallet_id == FromWallet.id)
        .outerjoin(ToWallet, Transaction.to_wallet_id == ToWallet.id)
        .outerjoin(FromUser, FromWallet.user_id == FromUser.id)
        .outerjoin(ToUser, ToWallet.user_id == ToUser.id)
    )

    conditions = []
    if username:
        conditions.append(or_(FromUser.username == username, ToUser.username == username))
    if from_date:
        conditions.append(Transaction.created_at >= from_date)
    if to_date:
        conditions.append(Transaction.created_at < to_date)

    if conditions:
        combined = and_(*conditions)
        stmt = stmt.where(combined)

    stmt = stmt.order_by(Transaction.created_at.desc()).offset(offset).limit(size)
    result = await session.execute(stmt)
    rows = result.all()

    # count
    count_stmt = (
        select(func.count()).select_from(Transaction)
        .outerjoin(FromWallet, Transaction.from_wallet_id == FromWallet.id)
        .outerjoin(ToWallet, Transaction.to_wallet_id == ToWallet.id)
        .outerjoin(FromUser, FromWallet.user_id == FromUser.id)
        .outerjoin(ToUser, ToWallet.user_id == ToUser.id)
    )
    if conditions:
        count_stmt = count_stmt.where(and_(*conditions))

    count_result = await session.execute(count_stmt)
    total = count_result.scalar()

    data = [{
        "id": row.id, "fromWalletId": row.from_wallet_id, "toWalletId": row.to_wallet_id,
        "amount": row.amount, "txType": row.tx_type, "status": row.status,
        "createdAt": row.created_at,
        "fromUsername": row.from_username, "toUsername": row.to_username,
    } for row in rows]

    return {"data": data, "page": page, "size": size, "total": total}


async def get_transaction_stats(session: AsyncSession, from_date: date | None, to_date: date | None) -> dict:
    conditions = []
    params = {}

    if from_date:
        conditions.append("created_at >= :from_date")
        params["from_date"] = from_date
    if to_date:
        conditions.append("created_at < :to_date")
        params["to_date"] = to_date

    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

    count_sql = f"SELECT COUNT(*)::bigint FROM transactions {where_clause}"
    amount_sql = f"SELECT COALESCE(SUM(amount), 0) FROM transactions {where_clause}"
    daily_sql = f"SELECT DATE(created_at) AS date, COUNT(*)::bigint AS count, COALESCE(SUM(amount), 0) AS amount FROM transactions {where_clause} GROUP BY DATE(created_at) ORDER BY date"

    total_tx = (await session.execute(text(count_sql), params)).scalar()
    total_amt = (await session.execute(text(amount_sql), params)).scalar()
    daily_result = await session.execute(text(daily_sql), params)
    daily_rows = daily_result.all()

    return {
        "totalTransactions": total_tx,
        "totalAmount": total_amt,
        "dailyVolume": [{"date": str(r.date), "count": r.count, "amount": r.amount} for r in daily_rows],
    }
