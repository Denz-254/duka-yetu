"""Super-admin platform management routes."""

from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import require_super_admin
from app.core.plans import PLAN_DEFINITIONS, normalize_plan
from app.models.business import Business
from app.models.online_order import Notification, OnlineOrder
from app.models.product import Product
from app.models.sale import Sale
from app.models.user import User
from app.utils.invoice_generator import generate_platform_subscription_invoice_pdf, pdf_attachment

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
    sales_revenue: float = 0
    online_orders: int = 0
    online_revenue: float = 0
    platform_commission: float = 0


class AdminOverview(BaseModel):
    total_businesses: int
    pending_businesses: int
    approved_businesses: int
    rejected_businesses: int
    total_sales: int
    total_products: int
    pos_revenue: float = 0
    marketplace_revenue: float = 0
    platform_commission: float = 0
    featured_active: int = 0
    shoppers: int = 0


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
    pos_revenue = float(
        db.query(func.coalesce(func.sum(Sale.total_amount), 0)).scalar() or 0
    )
    market_paid = db.query(OnlineOrder).filter(OnlineOrder.payment_status == "PAID")
    marketplace_revenue = float(
        market_paid.with_entities(func.coalesce(func.sum(OnlineOrder.total_amount), 0)).scalar()
        or 0
    )
    platform_commission = float(
        market_paid.with_entities(
            func.coalesce(func.sum(OnlineOrder.commission_amount), 0)
        ).scalar()
        or 0
    )
    now = datetime.utcnow()
    featured_active = (
        db.query(Product)
        .filter(
            Product.is_featured == True,  # noqa: E712
            or_(Product.featured_until == None, Product.featured_until >= now),  # noqa: E711
        )
        .count()
    )
    shoppers = db.query(User).filter(User.role == "SHOPPER").count()
    return AdminOverview(
        total_businesses=total,
        pending_businesses=pending,
        approved_businesses=approved,
        rejected_businesses=rejected,
        total_sales=db.query(Sale).count(),
        total_products=db.query(Product).filter(Product.is_active == True).count(),  # noqa: E712
        pos_revenue=round(pos_revenue, 2),
        marketplace_revenue=round(marketplace_revenue, 2),
        platform_commission=round(platform_commission, 2),
        featured_active=featured_active,
        shoppers=shoppers,
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
        sales_revenue = float(
            db.query(func.coalesce(func.sum(Sale.total_amount), 0))
            .filter(Sale.business_id == business.id)
            .scalar()
            or 0
        )
        online_orders = (
            db.query(func.count(OnlineOrder.id))
            .filter(OnlineOrder.business_id == business.id)
            .scalar()
            or 0
        )
        online_revenue = float(
            db.query(func.coalesce(func.sum(OnlineOrder.total_amount), 0))
            .filter(
                OnlineOrder.business_id == business.id,
                OnlineOrder.payment_status == "PAID",
            )
            .scalar()
            or 0
        )
        commission = float(
            db.query(func.coalesce(func.sum(OnlineOrder.commission_amount), 0))
            .filter(
                OnlineOrder.business_id == business.id,
                OnlineOrder.payment_status == "PAID",
            )
            .scalar()
            or 0
        )
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
                sales_revenue=round(sales_revenue, 2),
                online_orders=online_orders,
                online_revenue=round(online_revenue, 2),
                platform_commission=round(commission, 2),
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


class FeatureAdminRequest(BaseModel):
    days: int = Field(30, ge=1, le=90)
    badge_text: Optional[str] = Field(None, max_length=50)


class AdminProductItem(BaseModel):
    id: str
    name: str
    sku: str
    selling_price: float
    stock_quantity: int
    image_url: Optional[str] = None
    business_id: str
    business_name: str
    is_featured: bool = False
    featured_until: Optional[datetime] = None
    featured_badge: Optional[str] = None
    days_remaining: Optional[int] = None
    is_active: bool = True
    listed_on_marketplace: bool = False
    is_deal_of_day: bool = False
    deal_of_day_until: Optional[datetime] = None


def _days_remaining(until: Optional[datetime]) -> Optional[int]:
    if not until:
        return None
    days = (until.date() - datetime.utcnow().date()).days
    return max(0, days)


def _admin_product_item(product: Product, business: Business) -> AdminProductItem:
    return AdminProductItem(
        id=str(product.id),
        name=product.name,
        sku=product.sku,
        selling_price=float(product.selling_price),
        stock_quantity=product.stock_quantity,
        image_url=product.image_url,
        business_id=str(business.id),
        business_name=business.name,
        is_featured=bool(product.is_featured),
        featured_until=product.featured_until,
        featured_badge=product.featured_badge,
        days_remaining=_days_remaining(product.featured_until) if product.is_featured else None,
        is_active=bool(product.is_active),
        listed_on_marketplace=bool(getattr(product, "listed_on_marketplace", False)),
        is_deal_of_day=bool(getattr(product, "is_deal_of_day", False)),
        deal_of_day_until=getattr(product, "deal_of_day_until", None),
    )


@router.get("/products", response_model=List[AdminProductItem])
def admin_list_products(
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
    q: Optional[str] = Query(None),
    featured_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=100),
):
    """Search products for hero featuring (paid placements)."""
    from datetime import datetime as dt

    query = (
        db.query(Product, Business)
        .join(Business, Business.id == Product.business_id)
        .filter(Product.is_active == True)  # noqa: E712
    )
    if featured_only:
        now = dt.utcnow()
        query = query.filter(
            Product.is_featured == True,  # noqa: E712
            or_(Product.featured_until == None, Product.featured_until >= now),  # noqa: E711
        )
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Product.name.ilike(like),
                Product.sku.ilike(like),
                Business.name.ilike(like),
            )
        )
    rows = query.order_by(desc(Product.created_at)).limit(limit).all()
    return [_admin_product_item(p, b) for p, b in rows]


@router.get("/analytics")
def admin_analytics(
    db: Session = Depends(get_db),
    current: User = Depends(require_super_admin),
):
    """Platform-wide revenue and business performance for the super-admin dashboard."""
    overview = admin_overview(db=db, _=current)
    items = list_businesses(db=db, _=current, approval_status=None)
    ranked = sorted(
        [i.model_dump() if hasattr(i, "model_dump") else i.dict() for i in items],
        key=lambda x: (x.get("sales_revenue", 0) + x.get("online_revenue", 0)),
        reverse=True,
    )
    now = datetime.utcnow()
    featured_rows = (
        db.query(Product, Business)
        .join(Business, Business.id == Product.business_id)
        .filter(
            Product.is_featured == True,  # noqa: E712
            or_(Product.featured_until == None, Product.featured_until >= now),  # noqa: E711
        )
        .order_by(Product.featured_until.asc())
        .limit(50)
        .all()
    )
    featured = [
        {
            "id": str(p.id),
            "name": p.name,
            "business_name": b.name,
            "featured_until": p.featured_until,
            "days_remaining": _days_remaining(p.featured_until),
            "featured_badge": p.featured_badge,
        }
        for p, b in featured_rows
    ]
    return {
        "overview": overview.model_dump() if hasattr(overview, "model_dump") else overview.dict(),
        "businesses": ranked,
        "featured_placements": featured,
    }


@router.get("/businesses/{business_id}/subscription-invoice")
def admin_subscription_invoice(
    business_id: UUID,
    billing_cycle: str = Query("monthly", pattern="^(monthly|yearly)$"),
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    """Generate a downloadable subscription invoice for a business (end-of-month billing)."""
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    plan = (business.package or "BASIC").upper()
    price_map = {
        ("BASIC", "monthly"): settings.PLAN_BASIC_MONTHLY_KES,
        ("BASIC", "yearly"): settings.PLAN_BASIC_YEARLY_KES,
        ("PROFESSIONAL", "monthly"): settings.PLAN_PROFESSIONAL_MONTHLY_KES,
        ("PROFESSIONAL", "yearly"): settings.PLAN_PROFESSIONAL_YEARLY_KES,
        ("ENTERPRISE", "monthly"): settings.PLAN_ENTERPRISE_MONTHLY_KES,
        ("ENTERPRISE", "yearly"): settings.PLAN_ENTERPRISE_YEARLY_KES,
    }
    amount = float(price_map.get((plan, billing_cycle), settings.PLAN_BASIC_MONTHLY_KES))
    now = datetime.utcnow()
    period_label = now.strftime("%B %Y") if billing_cycle == "monthly" else now.strftime("%Y")
    inv_no = f"SUB-{str(business.id)[:8].upper()}-{now.strftime('%Y%m')}"
    return pdf_attachment(
        generate_platform_subscription_invoice_pdf(
            business,
            plan=plan,
            amount=amount,
            billing_cycle=billing_cycle,
            invoice_number=inv_no,
            period_label=period_label,
        ),
        f"{inv_no}.pdf",
    )


class PlanUpdateRequest(BaseModel):
    package: str = Field(..., min_length=3, max_length=50)
    subscription_status: Optional[str] = Field(None, max_length=50)


@router.post("/businesses/{business_id}/plan", response_model=AdminBusinessItem)
def admin_set_business_plan(
    business_id: UUID,
    payload: PlanUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    """Move a business onto another subscription plan or status."""
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    plan = normalize_plan(payload.package)
    if plan not in PLAN_DEFINITIONS:
        raise HTTPException(status_code=400, detail="Unknown plan")
    status_value = (payload.subscription_status or business.subscription_status or "ACTIVE").upper()
    allowed_status = {"TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "CANCELLED"}
    if status_value not in allowed_status:
        raise HTTPException(status_code=400, detail="Invalid subscription status")
    if status_value == "CANCELLED":
        status_value = "CANCELED"
    business.package = plan
    business.subscription_status = status_value
    if status_value == "ACTIVE":
        business.subscription_current_period_end = datetime.utcnow() + timedelta(days=30)
        business.trial_ends_at = None
        business.is_active = True
    elif status_value == "CANCELED":
        business.subscription_current_period_end = datetime.utcnow()
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
        approval_status=business.approval_status or "PENDING",
        is_active=business.is_active,
        rejection_reason=business.rejection_reason,
        created_at=business.created_at,
        approved_at=business.approved_at,
        products_count=0,
        sales_count=0,
    )


@router.post("/featured/{product_id}", response_model=AdminProductItem)
def admin_feature_product(
    product_id: UUID,
    payload: FeatureAdminRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    """Place a paid client's product into the store hero carousel."""
    from datetime import timedelta

    from app.core.config import settings

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    business = db.query(Business).filter(Business.id == product.business_id).first()
    if not business or business.approval_status != "APPROVED":
        raise HTTPException(status_code=400, detail="Business must be approved")

    product.is_featured = True
    product.listed_on_marketplace = True
    product.featured_until = datetime.utcnow() + timedelta(days=payload.days or settings.FEATURE_PRODUCT_DAYS)
    product.featured_badge = (payload.badge_text or product.featured_badge or "Featured")[:50]
    db.commit()
    db.refresh(product)
    return _admin_product_item(product, business)


@router.delete("/featured/{product_id}", status_code=204)
def admin_unfeature_product(
    product_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_featured = False
    product.featured_until = None
    product.featured_badge = None
    db.commit()
    return None


@router.get("/deal-of-the-day", response_model=Optional[AdminProductItem])
def admin_get_deal_of_day(
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    """Get the current deal of the day product."""
    product = db.query(Product).filter(
        Product.is_deal_of_day == True,
        or_(Product.deal_of_day_until == None, Product.deal_of_day_until > datetime.utcnow())
    ).first()
    
    if not product:
        return None
    
    business = db.query(Business).filter(Business.id == product.business_id).first()
    if not business:
        return None
    return _admin_product_item(product, business)


@router.post("/deal-of-the-day/{product_id}", response_model=AdminProductItem)
def admin_set_deal_of_day(
    product_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    """Set a product as the deal of the day (clears any previous deal)."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    business = db.query(Business).filter(Business.id == product.business_id).first()
    if not business or business.approval_status != "APPROVED":
        raise HTTPException(status_code=400, detail="Business must be approved")
    
    # Clear any previous deal of the day
    db.query(Product).filter(Product.is_deal_of_day == True).update(
        {
            Product.is_deal_of_day: False,
            Product.deal_of_day_until: None,
        }
    )
    
    # Set new deal of the day (expires at end of today)
    now = datetime.utcnow()
    deal_expires = now.replace(hour=23, minute=59, second=59) + timedelta(days=1)
    
    product.is_deal_of_day = True
    product.deal_of_day_until = deal_expires
    product.listed_on_marketplace = True
    db.commit()
    db.refresh(product)
    return _admin_product_item(product, business)


@router.delete("/deal-of-the-day", status_code=204)
def admin_clear_deal_of_day(
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    """Clear the current deal of the day."""
    db.query(Product).filter(Product.is_deal_of_day == True).update(
        {
            Product.is_deal_of_day: False,
            Product.deal_of_day_until: None,
        }
    )
    db.commit()
    return None

