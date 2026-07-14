"""Authentication routes for Duka Yetu."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    verify_password,
    get_password_hash,
    decode_token,
)
from app.models.business import Business
from app.models.user import User
from app.schemas.auth import (
    BusinessRegistrationRequest,
    LoginRequest,
    AuthResponse,
    UserResponse,
    BusinessResponse,
    TokenResponse,
)

router = APIRouter()
security = HTTPBearer()

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: BusinessRegistrationRequest,
    db: Session = Depends(get_db)
):
    """
    Register a new business and owner account.
    
    Creates:
    - Business profile
    - Owner user account
    - JWT token for immediate access
    """
    # Check if business email already exists
    existing_business = db.query(Business).filter(
        Business.email == request.email
    ).first()
    if existing_business:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business with this email already exists"
        )
    
    # Check if username is taken
    existing_user = db.query(User).filter(
        User.username == request.username
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create business
    business = Business(
        name=request.business_name,
        owner_name=request.owner_name,
        phone=request.phone,
        email=request.email,
        password_hash=get_password_hash(request.password),
        package="BASIC",
        is_active=True,
    )
    db.add(business)
    db.flush()  # Get business ID without committing
    
    # Create owner user
    owner = User(
        business_id=business.id,
        name=request.owner_name,
        email=request.email,
        phone=request.phone,
        username=request.username,
        password_hash=get_password_hash(request.password),
        role="OWNER",
        is_active=True,
        login_time=datetime.utcnow(),
    )
    db.add(owner)
    db.commit()
    db.refresh(business)
    db.refresh(owner)
    
    # Create JWT token
    token_data = {
        "sub": str(owner.id),
        "business_id": str(business.id),
        "role": owner.role,
        "username": owner.username,
    }
    access_token = create_access_token(token_data)
    
    return AuthResponse(
        user=UserResponse(
            id=str(owner.id),
            name=owner.name,
            email=owner.email,
            phone=owner.phone,
            username=owner.username,
            role=owner.role,
            business_id=str(business.id),
        ),
        business=BusinessResponse(
            id=str(business.id),
            name=business.name,
            owner_name=business.owner_name,
            phone=business.phone,
            email=business.email,
            package=business.package,
            is_active=business.is_active,
            created_at=business.created_at,
        ),
        token=TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=1440,  # 24 hours in minutes
        ),
    )

@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login with username and password.
    """
    # Find user by username
    user = db.query(User).filter(User.username == request.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    
    # Verify password
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    
    # Update login time
    user.login_time = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    # Get business
    business = db.query(Business).filter(Business.id == user.business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found",
        )
    
    # Create JWT token
    token_data = {
        "sub": str(user.id),
        "business_id": str(business.id),
        "role": user.role,
        "username": user.username,
    }
    access_token = create_access_token(token_data)
    
    return AuthResponse(
        user=UserResponse(
            id=str(user.id),
            name=user.name,
            email=user.email,
            phone=user.phone,
            username=user.username,
            role=user.role,
            business_id=str(business.id),
        ),
        business=BusinessResponse(
            id=str(business.id),
            name=business.name,
            owner_name=business.owner_name,
            phone=business.phone,
            email=business.email,
            package=business.package,
            is_active=business.is_active,
            created_at=business.created_at,
        ),
        token=TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=1440,
        ),
    )
