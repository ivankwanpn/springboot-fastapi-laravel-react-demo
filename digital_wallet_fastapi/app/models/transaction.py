from datetime import datetime
from decimal import Decimal

from sqlalchemy import BigInteger, Numeric, String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    from_wallet_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    to_wallet_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    tx_type: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="SUCCESS")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now())
