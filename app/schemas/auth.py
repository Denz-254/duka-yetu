"""Authentication schemas."""

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
import re

class BusinessRegistration(BaseModel):
    """Business registration request."""
    business_name: str = Field(..., min_length=2, max_length=100)
    owner_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=15)
    password: str = Field(..., min_length=8)
    business_type: Optional[str] = "retail"

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        """Validate phone number format."""
        # Remove any non-digit characters
        cleaned = re.sub(r'\D', '', v)
        if len(cleaned) < 10 or len(cleaned) > 15:
            raise ValueError('Phone number must be between 10 and 15 digits')
        return v

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one number')
        return v

class UserLogin(BaseModel):
    """User login request."""
    email: EmailStr
    password: str = Field(..., min_length=1)

    @field_validator('password')
    @classmethod
    def validate_password_not_empty(cls, v: str) -> str:
        """Validate password is not empty."""
        if not v or len(v.strip()) == 0:
            raise ValueError('Password cannot be empty')
        return v

class TokenResponse(BaseModel):
    """Token response."""
    access_token: str
    token_type: str = "bearer"
    user: dict

class UserResponse(BaseModel):
    """User response."""
    id: str
    name: str
    email: str
    phone: Optional[str]
    role: str
    business_id: str
    is_active: bool
