from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, ConfigDict


class WalletResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    user_id: int = Field(alias="userId")
    currency: str
    balance: Decimal
    version: int
    updated_at: datetime = Field(alias="updatedAt")
