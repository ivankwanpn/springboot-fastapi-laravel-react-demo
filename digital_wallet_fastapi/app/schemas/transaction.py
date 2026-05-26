from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, ConfigDict


class TransferRequest(BaseModel):
    to_username: str = Field(alias="toUsername")
    amount: Decimal

    model_config = ConfigDict(populate_by_name=True)


class TransactionResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    from_wallet_id: int | None = Field(alias="fromWalletId", default=None)
    to_wallet_id: int | None = Field(alias="toWalletId", default=None)
    amount: Decimal
    tx_type: str = Field(alias="txType")
    status: str
    created_at: datetime = Field(alias="createdAt")
