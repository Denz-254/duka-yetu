"""User management routes for staff administration."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from uuid import UUID

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_owner
from app.core.security import get_password_hash
from app.models.user import User
from app.models.business import Business
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserPasswordReset,
    UserResponse,
    UserListResponse,
)

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_staff(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    """
    Create a new staff member.
    
    Only OWNER can create staff.
    """
    # Check if business exists
    business = db.query(Business).filter(
        Business.id == current_user.business_id
    ).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found"
        )
    
    # Check if username is taken
    existing_user = db.query(User).filter(
        User.business_id == current_user.business_id,
        User.username == user_data.username
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Check if email is taken
    existing_email = db.query(User).filter(
        User.business_id == current_user.business_id,
        User.email == user_data.email
    ).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already in use"
        )
    
    # Create user
    user = User(
        business_id=current_user.business_id,
        name=user_data.name,
        email=user_data.email,
        phone=user_data.phone,
        username=user_data.username,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role,
        branch_id=user_data.branch_id,
        is_active=True,
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user

@router.get("/", response_model=UserListResponse)
async def list_staff(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
):
    """
    List all staff members.
    
    Only OWNER can list staff.
    """
    # Base query
    query = db.query(User).filter(
        User.business_id == current_user.business_id
    )
    
    # Search filter
    if search:
        query = query.filter(
            or_(
                User.name.ilike(f"%{search}%"),
                User.username.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
            )
        )
    
    # Role filter
    if role:
        query = query.filter(User.role == role)
    
    # Active filter
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    # Get total count
    total = query.count()
    
    # Pagination
    users = query.offset(skip).limit(limit).all()
    
    return UserListResponse(
        items=users,
        total=total,
        page=skip // limit + 1 if limit > 0 else 1,
        pages=(total + limit - 1) // limit if limit > 0 else 1,
        per_page=limit,
    )

@router.get("/{user_id}", response_model=UserResponse)
async def get_staff(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    """
    Get a single staff member.
    
    Only OWNER can view staff details.
    """
    user = db.query(User).filter(
        User.id == user_id,
        User.business_id == current_user.business_id
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user

@router.put("/{user_id}", response_model=UserResponse)
async def update_staff(
    user_id: UUID,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    """
    Update a staff member.
    
    Only OWNER can update staff.
    """
    user = db.query(User).filter(
        User.id == user_id,
        User.business_id == current_user.business_id
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent owner from changing their own role or disabling themselves
    if user.id == current_user.id:
        if user_data.role is not None or user_data.is_active is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot change your own role or disable yourself"
            )
    
    # Update fields
    update_data = user_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_staff(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    """
    Delete a staff member (soft delete).
    
    Only OWNER can delete staff.
    """
    user = db.query(User).filter(
        User.id == user_id,
        User.business_id == current_user.business_id
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent owner from deleting themselves
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete yourself"
        )
    
    # Soft delete
    user.is_active = False
    db.commit()
    
    return None

@router.post("/{user_id}/reset-password", response_model=UserResponse)
async def reset_password(
    user_id: UUID,
    password_data: UserPasswordReset,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    """
    Reset a staff member's password.
    
    Only OWNER can reset passwords.
    """
    user = db.query(User).filter(
        User.id == user_id,
        User.business_id == current_user.business_id
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Hash new password
    user.password_hash = get_password_hash(password_data.new_password)
    db.commit()
    db.refresh(user)
    
    return user

@router.post("/{user_id}/toggle", response_model=UserResponse)
async def toggle_staff_status(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    """
    Toggle staff active status (enable/disable).
    
    Only OWNER can toggle staff status.
    """
    user = db.query(User).filter(
        User.id == user_id,
        User.business_id == current_user.business_id
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent owner from disabling themselves
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot disable yourself"
        )
    
    # Toggle
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    
    return user
