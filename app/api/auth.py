"""Authentication routes for Duka Yetu."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional

from app.core.database import get_db
from app.core.dependencies import get_current_user
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
    ChangePasswordRequest,
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
    - Business profile (PENDING approval)
    - Owner user account
    - JWT token (limited until approved)
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
    
    # Create business — must be approved by super admin before POS use
    business = Business(
        name=request.business_name,
        owner_name=request.owner_name,
        phone=request.phone,
        email=request.email,
        password_hash=get_password_hash(request.password),
        package="BASIC",
        subscription_status="TRIALING",
        trial_ends_at=datetime.utcnow() + timedelta(days=14),
        is_active=True,
        approval_status="PENDING",
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
            approval_status=business.approval_status,
            created_at=business.created_at,
        ),
        token=TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=1440,  # 24 hours in minutes
        ),
        message="Registration received. A platform admin must approve your business before you can use POS features.",
    )

@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login with username and password.
    """
    user = db.query(User).filter(User.username == request.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # Account lockout from business security settings (or defaults)
    now = datetime.utcnow()
    if user.locked_until and user.locked_until > now:
        remaining = int((user.locked_until - now).total_seconds() // 60) + 1
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account locked. Try again in {remaining} min",
        )

    security = {}
    if user.business_id:
        biz = db.query(Business).filter(Business.id == user.business_id).first()
        if biz:
            security = (biz.settings or {}).get("security") or {}
    max_attempts = int(security.get("max_login_attempts") or 5)
    lockout_mins = int(security.get("lockout_duration_minutes") or 30)

    if not verify_password(request.password, user.password_hash):
        attempts = int(user.failed_login_attempts or 0) + 1
        user.failed_login_attempts = attempts
        if attempts >= max_attempts:
            user.locked_until = now + timedelta(minutes=lockout_mins)
            user.failed_login_attempts = 0
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Too many attempts. Locked {lockout_mins} min",
            )
        db.commit()
        left = max_attempts - attempts
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid credentials ({left} left)",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account disabled",
        )

    user.login_time = now
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    db.refresh(user)

    # Super admin has no store business
    if user.role == "SUPER_ADMIN":
        token_data = {
            "sub": str(user.id),
            "business_id": None,
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
                business_id=None,
            ),
            business=None,
            token=TokenResponse(
                access_token=access_token,
                token_type="bearer",
                expires_in=1440,
            ),
            message="Welcome, platform admin",
        )

    # Get business
    business = db.query(Business).filter(Business.id == user.business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found",
        )
    if not business.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Business disabled",
        )

    approval = business.approval_status or "PENDING"
    if approval == "REJECTED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=business.rejection_reason
            or "Registration rejected. Contact support.",
        )

    token_data = {
        "sub": str(user.id),
        "business_id": str(business.id),
        "role": user.role,
        "username": user.username,
    }
    access_token = create_access_token(token_data)

    message = None
    if approval == "PENDING":
        message = "Awaiting approval. POS locked until approved."

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
            approval_status=approval,
            created_at=business.created_at,
        ),
        token=TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=1440,
        ),
        message=message,
    )


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    request: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password incorrect",
        )

    security = {}
    if current_user.business_id:
        biz = db.query(Business).filter(Business.id == current_user.business_id).first()
        if biz:
            security = (biz.settings or {}).get("security") or {}

    pw = request.new_password
    min_len = int(security.get("min_password_length") or 8)
    if len(pw) < min_len:
        raise HTTPException(status_code=422, detail=f"Min {min_len} characters")
    if security.get("require_uppercase", True) and not any(c.isupper() for c in pw):
        raise HTTPException(status_code=422, detail="Need an uppercase letter")
    if security.get("require_lowercase", True) and not any(c.islower() for c in pw):
        raise HTTPException(status_code=422, detail="Need a lowercase letter")
    if security.get("require_numbers", True) and not any(c.isdigit() for c in pw):
        raise HTTPException(status_code=422, detail="Need a number")
    if security.get("require_special_characters") and not any(
        not c.isalnum() for c in pw
    ):
        raise HTTPException(status_code=422, detail="Need a special character")

    current_user.password_hash = get_password_hash(request.new_password)
    db.commit()
    return None
