from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict


class WalletResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    user_id: int = Field(alias="userId")
    currency: str
    balance: float
    version: int
    updated_at: datetime = Field(alias="updatedAt")
