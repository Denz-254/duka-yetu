"""Request and response schemas for authentication."""

import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class BusinessRegistrationRequest(BaseModel):
    """Create a business and its owner account."""

    business_name: str = Field(..., min_length=2, max_length=100)
    owner_name: str = Field(..., min_length=2, max_length=100)
    username: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=20)
    password: str = Field(..., min_length=8)
    business_type: Optional[str] = "retail"

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = re.sub(r'\D', '', v)
        if len(cleaned) < 10 or len(cleaned) > 15:
            raise ValueError('Phone number must be between 10 and 15 digits')
        return v

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one number')
        return v


class LoginRequest(BaseModel):
    """Authenticate using the username created at registration."""

    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    username: str
    role: str
    business_id: Optional[str] = None
    is_active: bool = True


class BusinessResponse(BaseModel):
    id: str
    name: str
    owner_name: str
    phone: str
    email: str
    package: str
    is_active: bool
    approval_status: str = "APPROVED"
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class AuthResponse(BaseModel):
    user: UserResponse
    business: Optional[BusinessResponse] = None
    token: TokenResponse
    message: Optional[str] = None
