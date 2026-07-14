"""Authentication schemas for request/response validation."""

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime
import re

# Request schemas

class BusinessRegistrationRequest(BaseModel):
    """Business registration request."""
    business_name: str = Field(..., min_length=2, max_length=255)
    owner_name: str = Field(..., min_length=2, max_length=255)
    phone: str = Field(..., min_length=10, max_length=20)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)  # ← Added max_length=72
    username: str = Field(..., min_length=3, max_length=100)
    
    @validator('phone')
    def validate_phone(cls, v):
        """Validate phone number format."""
        if not re.match(r'^\+?[\d\s\-()]{10,20}$', v):
            raise ValueError('Invalid phone number format')
        return v
    
    @validator('password')
    def validate_password(cls, v):
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if len(v) > 72:
            raise ValueError('Password must be less than 72 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        return v

class LoginRequest(BaseModel):
    """Login request."""
    username: str
    password: str
    
    @validator('password')
    def validate_password_length(cls, v):
        """Validate password length for login."""
        if len(v) > 72:
            # Truncate silently for login (will be handled by security)
            return v[:72]
        return v

# Response schemas

class TokenResponse(BaseModel):
    """Token response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class UserResponse(BaseModel):
    """User response."""
    id: str
    name: str
    email: str
    phone: Optional[str]
    username: str
    role: str
    business_id: str
    
    class Config:
        from_attributes = True

class BusinessResponse(BaseModel):
    """Business response."""
    id: str
    name: str
    owner_name: str
    phone: str
    email: str
    package: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    """Authentication response with user and business data."""
    user: UserResponse
    business: BusinessResponse
    token: TokenResponse
