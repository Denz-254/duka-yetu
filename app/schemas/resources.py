"""Schemas for tenant management resources."""

from datetime import datetime
from decimal import Decimal
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ResourceResponse(BaseModel):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class CategoryData(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    color: str = Field("#059669", max_length=20)


class CategoryCreate(CategoryData):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    color: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None


class CategoryResponse(CategoryData, ResourceResponse):
    is_active: bool
    count: int = 0


class SupplierData(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    contact_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: str = "Kenya"
    tax_id: Optional[str] = None
    payment_terms: int = Field(30, ge=0)
    status: str = "active"
    notes: Optional[str] = None
    products: list[str] = Field(default_factory=list)


class SupplierCreate(SupplierData):
    pass


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    tax_id: Optional[str] = None
    payment_terms: Optional[int] = Field(None, ge=0)
    status: Optional[str] = None
    notes: Optional[str] = None
    products: Optional[list[str]] = None


class SupplierResponse(SupplierData, ResourceResponse):
    total_purchases: Decimal
    total_orders: int
    last_order: Optional[datetime] = None


class CustomerData(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    status: str = "active"
    notes: Optional[str] = None


class CustomerCreate(CustomerData):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class CustomerResponse(CustomerData, ResourceResponse):
    total_orders: int
    total_spent: Decimal
    last_order: Optional[datetime] = None
    orders: list[Any] = Field(default_factory=list)


class BranchData(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    location: str = Field(..., min_length=1, max_length=500)
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    manager: Optional[str] = None
    status: str = "active"


class BranchCreate(BranchData):
    pass


class BranchUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    manager: Optional[str] = None
    status: Optional[str] = None


class BranchResponse(BranchData, ResourceResponse):
    staff: int
    sales: int
    revenue: Decimal


class BusinessProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    logo: Optional[str] = None
    tax_id: Optional[str] = None
    description: Optional[str] = None


class SettingsUpdate(BaseModel):
    section: str = Field(..., pattern="^(payment|receipt|tax|security)$")
    values: dict[str, Any]
