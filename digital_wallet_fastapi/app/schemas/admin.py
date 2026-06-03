from datetime import datetime
from decimal import Decimal
from typing import TypeVar, Generic

from pydantic import BaseModel, Field, ConfigDict

T = TypeVar('T')


class PaginatedResponse(BaseModel, Generic[T]):
    model_config = ConfigDict(populate_by_name=True)
    data: list[T]
    page: int
    size: int
    total: int


class UserDetailResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: int
    username: str
    role: str
    created_at: datetime = Field(alias="createdAt")
    wallet: dict | None = None
    recent_transactions: list[dict] = Field(alias="recentTransactions", default_factory=list)


class AdminTransactionResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: int
    from_wallet_id: int | None = Field(alias="fromWalletId", default=None)
    to_wallet_id: int | None = Field(alias="toWalletId", default=None)
    amount: Decimal
    tx_type: str = Field(alias="txType")
    status: str
    created_at: datetime = Field(alias="createdAt")
    from_username: str | None = Field(alias="fromUsername", default=None)
    to_username: str | None = Field(alias="toUsername", default=None)


class DailyVolumeItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    date: str
    count: int
    amount: Decimal


class TransactionStatsResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    total_transactions: int = Field(alias="totalTransactions")
    total_amount: Decimal = Field(alias="totalAmount")
    daily_volume: list[DailyVolumeItem] = Field(alias="dailyVolume")
