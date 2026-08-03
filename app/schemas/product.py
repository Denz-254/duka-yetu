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
    image_url: Optional[str] = Field(None, max_length=500)
    category_id: Optional[str] = None
    
    @validator('selling_price')
    def validate_selling_price(cls, v):
        if v <= 0:
            raise ValueError('Selling price must be greater than 0')
        return round(v, 2)
    
    @validator('cost_price')
    def validate_cost_price(cls, v):
        if v is not None:
            if v < 0:
                raise ValueError('Cost price cannot be negative')
            return round(v, 2)
        return v

    @validator('category_id', pre=True)
    def empty_category_to_none(cls, v):
        if v == "" or v is None:
            return None
        return str(v)


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
    image_url: Optional[str] = Field(None, max_length=500)
    category_id: Optional[str] = None
    is_active: Optional[bool] = None
    
    @validator('selling_price')
    def validate_selling_price(cls, v):
        if v is not None:
            if v <= 0:
                raise ValueError('Selling price must be greater than 0')
            return round(v, 2)
        return v
    
    @validator('cost_price')
    def validate_cost_price(cls, v):
        if v is not None:
            if v < 0:
                raise ValueError('Cost price cannot be negative')
            return round(v, 2)
        return v

    @validator('category_id', pre=True)
    def empty_category_to_none(cls, v):
        if v == "":
            return None
        if v is None:
            return None
        return str(v)


class ProductResponse(ProductBase):
    """Product response."""
    id: str
    is_active: bool
    category_name: Optional[str] = None
    is_featured: bool = False
    featured_until: Optional[datetime] = None
    featured_badge: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
    
    @validator('id', 'category_id', pre=True)
    def convert_uuid_to_str(cls, v):
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
