"""Product schemas for request/response validation."""

from pydantic import BaseModel, Field, validator, ConfigDict
from typing import Optional
from datetime import datetime
from decimal import Decimal
from uuid import UUID

class ProductBase(BaseModel):
    """Base product schema."""
    name: str = Field(..., min_length=1, max_length=255)
    sku: str = Field(..., min_length=1, max_length=100)
    selling_price: Decimal = Field(..., gt=0)
    cost_price: Optional[Decimal] = Field(None, ge=0)
    stock_quantity: int = Field(0, ge=0)
    description: Optional[str] = Field(None, max_length=500)
    
    @validator('selling_price')
    def validate_selling_price(cls, v):
        """Validate selling price."""
        if v <= 0:
            raise ValueError('Selling price must be greater than 0')
        return round(v, 2)
    
    @validator('cost_price')
    def validate_cost_price(cls, v):
        """Validate cost price."""
        if v is not None:
            if v < 0:
                raise ValueError('Cost price cannot be negative')
            return round(v, 2)
        return v

class ProductCreate(ProductBase):
    """Product creation request."""
    pass

class ProductUpdate(BaseModel):
    """Product update request."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    sku: Optional[str] = Field(None, min_length=1, max_length=100)
    selling_price: Optional[Decimal] = Field(None, gt=0)
    cost_price: Optional[Decimal] = Field(None, ge=0)
    stock_quantity: Optional[int] = Field(None, ge=0)
    description: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    
    @validator('selling_price')
    def validate_selling_price(cls, v):
        """Validate selling price."""
        if v is not None:
            if v <= 0:
                raise ValueError('Selling price must be greater than 0')
            return round(v, 2)
        return v
    
    @validator('cost_price')
    def validate_cost_price(cls, v):
        """Validate cost price."""
        if v is not None:
            if v < 0:
                raise ValueError('Cost price cannot be negative')
            return round(v, 2)
        return v

class ProductResponse(BaseModel):
    """Product response."""
    id: str  # Changed to str
    name: str
    sku: str
    selling_price: Decimal
    cost_price: Optional[Decimal]
    stock_quantity: int
    description: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
    
    @validator('id', pre=True)
    def convert_uuid_to_str(cls, v):
        """Convert UUID to string."""
        if isinstance(v, UUID):
            return str(v)
        return v

class ProductListResponse(BaseModel):
    """Product list response with pagination."""
    items: list[ProductResponse]
    total: int
    page: int
    pages: int
    per_page: int
