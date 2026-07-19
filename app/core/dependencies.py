"""FastAPI dependencies for authentication and tenant isolation."""

from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token, validate_token_expiry
from app.models.user import User
from app.models.business import Business
from app.core.plans import plan_has_feature, subscription_is_active

# Security scheme
security_scheme = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Get the current authenticated user.
    """
    token = credentials.credentials
    
    # Decode token
    payload = decode_token(token)
    validate_token_expiry(payload)
    
    # Get user ID from token
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user ID",
        )
    
    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is disabled",
        )
    
    return user

async def require_super_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required",
        )
    return current_user


async def get_current_business(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Business:
    """
    Get the business for the current user.
    """
    if current_user.role == "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin accounts are not tied to a store business",
        )
    if not current_user.business_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found",
        )

    business = db.query(Business).filter(
        Business.id == current_user.business_id
    ).first()
    
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found",
        )

    if (business.approval_status or "PENDING") != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your business is awaiting platform approval. You cannot use POS features yet.",
        )
    
    return business

async def require_owner(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Require the user to have OWNER role.
    """
    if current_user.role != "OWNER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can perform this action",
        )
    return current_user

async def require_owner_or_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Require the user to have OWNER or ADMIN role.
    """
    if current_user.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can perform this action",
        )
    return current_user


def require_feature(feature: str):
    """Create a dependency that enforces paid plan entitlements server-side."""

    async def dependency(
        business: Business = Depends(get_current_business),
    ) -> Business:
        if not subscription_is_active(business):
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Your subscription is not active. Choose a plan to continue.",
            )
        if not plan_has_feature(business, feature):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"The '{feature}' feature is not included in your current plan.",
            )
        return business

    return dependency

async def get_cashier_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Allow staff roles that can operate the POS."""
    return await get_pos_user(current_user)


async def get_pos_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Require a role that can create POS sales.
    Owners/admins can also sell at the counter.
    """
    if current_user.role not in {"OWNER", "ADMIN", "MANAGER", "CASHIER"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to use the POS",
        )
    return current_user

def get_tenant_id(request: Request) -> Optional[str]:
    """
    Extract tenant ID from request context.
    """
    return getattr(request.state, "tenant_id", None)

def set_tenant_id(request: Request, tenant_id: str) -> None:
    """
    Set tenant ID in request context.
    """
    request.state.tenant_id = tenant_id
