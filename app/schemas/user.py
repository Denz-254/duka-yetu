"""User schemas for staff management."""

from pydantic import BaseModel, EmailStr, Field, validator, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID
import re

class UserCreate(BaseModel):
    """Create staff request."""
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    phone: Optional[str] = None
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=8, max_length=72)
    role: str = Field(..., pattern="^(OWNER|ADMIN|MANAGER|CASHIER)$")
    branch_id: Optional[str] = None
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        return v

class UserUpdate(BaseModel):
    """Update staff request."""
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    role: Optional[str] = Field(None, pattern="^(OWNER|ADMIN|MANAGER|CASHIER)$")
    is_active: Optional[bool] = None
    branch_id: Optional[str] = None

class UserPasswordReset(BaseModel):
    """Reset password request."""
    new_password: str = Field(..., min_length=8, max_length=72)
    
    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        return v

class UserResponse(BaseModel):
    """User response with UUID conversion."""
    id: str
    name: str
    email: str
    phone: Optional[str]
    username: str
    role: str
    is_active: bool
    login_time: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]
    business_id: str
    branch_id: Optional[str]
    
    model_config = ConfigDict(from_attributes=True)
    
    @validator('id', 'business_id', 'branch_id', pre=True)
    def convert_uuid_to_str(cls, v):
        """Convert UUID to string."""
        if isinstance(v, UUID):
            return str(v)
        return v

class UserListResponse(BaseModel):
    """User list response with pagination."""
    items: list[UserResponse]
    total: int
    page: int
    pages: int
    per_page: int
