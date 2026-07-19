"""Super-admin platform management routes."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_super_admin
from app.models.business import Business
from app.models.online_order import Notification, OnlineOrder
from app.models.product import Product
from app.models.sale import Sale
from app.models.user import User

router = APIRouter()


class AdminBusinessItem(BaseModel):
    id: str
    name: str
    owner_name: str
    email: str
    phone: str
    package: str
    subscription_status: str
    approval_status: str
    is_active: bool
    rejection_reason: Optional[str] = None
    created_at: datetime
    approved_at: Optional[datetime] = None
    products_count: int = 0
    sales_count: int = 0


class AdminOverview(BaseModel):
    total_businesses: int
    pending_businesses: int
    approved_businesses: int
    rejected_businesses: int
    total_sales: int
    total_products: int


class ApprovalRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)


@router.get("/overview", response_model=AdminOverview)
def admin_overview(
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    total = db.query(Business).count()
    pending = db.query(Business).filter(Business.approval_status == "PENDING").count()
    approved = db.query(Business).filter(Business.approval_status == "APPROVED").count()
    rejected = db.query(Business).filter(Business.approval_status == "REJECTED").count()
    return AdminOverview(
        total_businesses=total,
        pending_businesses=pending,
        approved_businesses=approved,
        rejected_businesses=rejected,
        total_sales=db.query(Sale).count(),
        total_products=db.query(Product).filter(Product.is_active == True).count(),  # noqa: E712
    )


@router.get("/businesses", response_model=List[AdminBusinessItem])
def list_businesses(
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
    approval_status: Optional[str] = Query(None),
):
    query = db.query(Business)
    if approval_status:
        query = query.filter(Business.approval_status == approval_status.upper())
    businesses = query.order_by(desc(Business.created_at)).all()

    items: List[AdminBusinessItem] = []
    for business in businesses:
        products_count = db.query(func.count(Product.id)).filter(
            Product.business_id == business.id, Product.is_active == True  # noqa: E712
        ).scalar() or 0
        sales_count = db.query(func.count(Sale.id)).filter(
            Sale.business_id == business.id
        ).scalar() or 0
        items.append(
            AdminBusinessItem(
                id=str(business.id),
                name=business.name,
                owner_name=business.owner_name,
                email=business.email,
                phone=business.phone,
                package=business.package,
                subscription_status=business.subscription_status or "TRIALING",
                approval_status=business.approval_status or "PENDING",
                is_active=business.is_active,
                rejection_reason=business.rejection_reason,
                created_at=business.created_at,
                approved_at=business.approved_at,
                products_count=products_count,
                sales_count=sales_count,
            )
        )
    return items


@router.post("/businesses/{business_id}/approve", response_model=AdminBusinessItem)
def approve_business(
    business_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    business.approval_status = "APPROVED"
    business.approved_at = datetime.utcnow()
    business.rejection_reason = None
    business.is_active = True
    db.commit()
    db.refresh(business)
    return AdminBusinessItem(
        id=str(business.id),
        name=business.name,
        owner_name=business.owner_name,
        email=business.email,
        phone=business.phone,
        package=business.package,
        subscription_status=business.subscription_status or "TRIALING",
        approval_status=business.approval_status,
        is_active=business.is_active,
        rejection_reason=business.rejection_reason,
        created_at=business.created_at,
        approved_at=business.approved_at,
        products_count=0,
        sales_count=0,
    )


@router.get("/notifications")
def admin_notifications(
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    rows = (
        db.query(Notification)
        .filter(Notification.audience == "SUPER_ADMIN")
        .order_by(desc(Notification.created_at))
        .limit(100)
        .all()
    )
    return [
        {
            "id": str(row.id),
            "title": row.title,
            "message": row.message,
            "type": row.type,
            "is_read": bool(row.is_read),
            "created_at": row.created_at,
            "data": row.data or {},
        }
        for row in rows
    ]


@router.get("/orders")
def admin_orders(
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    rows = db.query(OnlineOrder).order_by(desc(OnlineOrder.created_at)).limit(200).all()
    return [
        {
            "id": str(order.id),
            "order_number": order.order_number,
            "business_id": str(order.business_id),
            "customer_name": order.customer_name,
            "total_amount": float(order.total_amount),
            "commission_amount": float(order.commission_amount),
            "payment_status": order.payment_status,
            "fulfillment_status": order.fulfillment_status,
            "created_at": order.created_at,
        }
        for order in rows
    ]


@router.post("/businesses/{business_id}/reject", response_model=AdminBusinessItem)
def reject_business(
    business_id: UUID,
    payload: ApprovalRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    business.approval_status = "REJECTED"
    business.rejection_reason = payload.reason or "Rejected by platform admin"
    business.approved_at = None
    db.commit()
    db.refresh(business)
    return AdminBusinessItem(
        id=str(business.id),
        name=business.name,
        owner_name=business.owner_name,
        email=business.email,
        phone=business.phone,
        package=business.package,
        subscription_status=business.subscription_status or "TRIALING",
        approval_status=business.approval_status,
        is_active=business.is_active,
        rejection_reason=business.rejection_reason,
        created_at=business.created_at,
        approved_at=business.approved_at,
        products_count=0,
        sales_count=0,
    )
