"""Sale schemas for request/response validation."""

from pydantic import BaseModel, Field, validator, ConfigDict
from typing import List, Optional
from datetime import datetime
from decimal import Decimal
from uuid import UUID

class SaleItemCreate(BaseModel):
    """Sale item creation request."""
    product_id: str
    quantity: int = Field(..., gt=0)
    
    @validator('quantity')
    def validate_quantity(cls, v):
        if v <= 0:
            raise ValueError('Quantity must be greater than 0')
        return v

class SaleCreate(BaseModel):
    """Sale creation request."""
    items: List[SaleItemCreate] = Field(..., min_items=1)
    payment_method: str = "CASH"
    
    @validator('payment_method')
    def validate_payment_method(cls, v):
        allowed = ["CASH", "MPESA", "CARD", "BANK"]
        if v.upper() not in allowed:
            raise ValueError(f'Payment method must be one of: {", ".join(allowed)}')
        return v.upper()

class SaleItemResponse(BaseModel):
    """Sale item response."""
    id: str
    product_id: str
    product_name: str
    sku: str
    quantity: int
    unit_price: Decimal
    subtotal: Decimal
    
    model_config = ConfigDict(from_attributes=True)
    
    @validator('id', 'product_id', pre=True)
    def convert_uuid_to_str(cls, v):
        if isinstance(v, UUID):
            return str(v)
        return v

class SaleResponse(BaseModel):
    """Sale response."""
    id: str
    receipt_number: str
    cashier_name: str
    cashier_id: str
    items: List[SaleItemResponse]
    total_amount: Decimal
    payment_method: str
    payment_status: str
    sale_date: datetime
    
    model_config = ConfigDict(from_attributes=True)
    
    @validator('id', 'cashier_id', pre=True)
    def convert_uuid_to_str(cls, v):
        if isinstance(v, UUID):
            return str(v)
        return v

class SaleReceiptResponse(SaleResponse):
    """Sale response with receipt HTML."""
    receipt_html: str

class SaleListResponse(BaseModel):
    """Sale list response with pagination."""
    items: List[SaleResponse]
    total: int
    page: int
    pages: int
    per_page: int
