"""M-Pesa request/response schemas."""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from app.schemas.sale import SaleItemCreate, SaleReceiptResponse


class StkPushRequest(BaseModel):
    items: List[SaleItemCreate] = Field(..., min_length=1)
    phone_number: str = Field(..., min_length=9, max_length=20)

    @field_validator("phone_number")
    @classmethod
    def strip_phone(cls, value: str) -> str:
        return value.strip()


class StkPushResponse(BaseModel):
    payment_id: str
    checkout_request_id: Optional[str] = None
    merchant_request_id: Optional[str] = None
    phone_number: str
    amount: Decimal
    status: str
    customer_message: str


class StkStatusResponse(BaseModel):
    payment_id: str
    status: str
    phone_number: str
    amount: Decimal
    result_desc: Optional[str] = None
    mpesa_receipt_number: Optional[str] = None
    sale: Optional[SaleReceiptResponse] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class PaymentSettingsPublic(BaseModel):
    cash_enabled: bool = True
    mpesa_enabled: bool = True
    card_enabled: bool = False
    bank_enabled: bool = False
    mpesa_account_type: str = "paybill"
    mpesa_shortcode: str = ""
    mpesa_consumer_key_set: bool = False
    mpesa_consumer_secret_set: bool = False
    mpesa_passkey_set: bool = False
    currency: str = "KES"
    tax_rate: float = 16
    # Optional write-only fields accepted on update (never returned)
    mpesa_consumer_key: Optional[str] = None
    mpesa_consumer_secret: Optional[str] = None
    mpesa_passkey: Optional[str] = None
