"""Public marketplace catalog + M-Pesa checkout."""

from __future__ import annotations

import random
import string
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.business import Business
from app.models.mpesa_transaction import MpesaTransaction
from app.models.online_order import OnlineOrder
from app.models.product import Product
from app.models.resources import Category
from app.services.mpesa import MpesaError, initiate_stk_push, resolve_credentials

router = APIRouter()


def _money(value) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _order_number() -> str:
    stamp = datetime.utcnow().strftime("%Y%m%d")
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"ORD-{stamp}-{suffix}"


class MarketProduct(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    sku: str
    selling_price: Decimal
    stock_quantity: int
    image_url: Optional[str] = None
    business_id: str
    business_name: str
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    is_featured: bool = False
    featured_badge: Optional[str] = None
    is_deal_of_day: bool = False
    deal_of_day_until: Optional[datetime] = None


class MarketProductList(BaseModel):
    items: List[MarketProduct]
    total: int


class MarketCategory(BaseModel):
    id: str
    name: str
    color: str = "#059669"
    image_url: Optional[str] = None
    product_count: int = 0


def _marketplace_visible(query):
    return query.filter(
        Product.is_active == True,  # noqa: E712
        Product.listed_on_marketplace == True,  # noqa: E712
        Product.stock_quantity > 0,
        Business.is_active == True,  # noqa: E712
        Business.approval_status == "APPROVED",
    )


def _to_market_product(product: Product, business: Business) -> MarketProduct:
    now = datetime.utcnow()
    featured_active = bool(product.is_featured) and (
        not product.featured_until or product.featured_until >= now
    )
    deal_active = bool(getattr(product, "is_deal_of_day", False)) and (
        not product.deal_of_day_until or product.deal_of_day_until >= now
    )
    return MarketProduct(
        id=str(product.id),
        name=product.name,
        description=product.description,
        sku=product.sku,
        selling_price=product.selling_price,
        stock_quantity=product.stock_quantity,
        image_url=product.image_url,
        business_id=str(business.id) if business else "",
        business_name=business.name if business else "",
        category_id=str(product.category_id) if product.category_id else None,
        category_name=product.category.name if product.category else None,
        is_featured=featured_active,
        featured_badge=product.featured_badge if featured_active else None,
        is_deal_of_day=deal_active,
        deal_of_day_until=product.deal_of_day_until if deal_active else None,
    )


@router.get("/categories", response_model=List[MarketCategory])
def list_marketplace_categories(db: Session = Depends(get_db)):
    """Public categories that have active products from approved businesses."""
    rows = (
        db.query(Category)
        .join(Product, Product.category_id == Category.id)
        .join(Business, Business.id == Product.business_id)
        .filter(
            Category.is_active == True,  # noqa: E712
            Product.is_active == True,  # noqa: E712
            Product.listed_on_marketplace == True,  # noqa: E712
            Product.stock_quantity > 0,
            Business.approval_status == "APPROVED",
            Business.is_active == True,  # noqa: E712
        )
        .distinct()
        .order_by(Category.name)
        .all()
    )
    result = []
    for cat in rows:
        count = (
            db.query(Product)
            .join(Business, Business.id == Product.business_id)
            .filter(
                Product.category_id == cat.id,
                Product.is_active == True,  # noqa: E712
                Product.listed_on_marketplace == True,  # noqa: E712
                Product.stock_quantity > 0,
                Business.approval_status == "APPROVED",
                Business.is_active == True,  # noqa: E712
            )
            .count()
        )
        result.append(
            MarketCategory(
                id=str(cat.id),
                name=cat.name,
                color=cat.color or "#059669",
                image_url=cat.image_url,
                product_count=count,
            )
        )
    return result


@router.get("/products", response_model=MarketProductList)
def list_marketplace_products(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    skip: int = Query(0, ge=0),
    limit: int = Query(24, ge=1, le=200),
):
    """Public catalog of products from approved businesses."""
    query = _marketplace_visible(
        db.query(Product, Business).join(Business, Business.id == Product.business_id)
    )
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(or_(Product.name.ilike(like), Product.sku.ilike(like)))
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if min_price is not None:
        query = query.filter(Product.selling_price >= min_price)
    if max_price is not None:
        query = query.filter(Product.selling_price <= max_price)

    total = query.count()
    rows = query.order_by(desc(Product.created_at)).offset(skip).limit(limit).all()
    items = [_to_market_product(product, business) for product, business in rows]
    return MarketProductList(items=items, total=total)


@router.get("/featured", response_model=List[MarketProduct])
def list_featured_products(
    db: Session = Depends(get_db),
    limit: int = Query(12, ge=1, le=20),
):
    """Products paid to appear on the store hero (or placed by super admin)."""
    now = datetime.utcnow()
    rows = (
        db.query(Product, Business)
        .join(Business, Business.id == Product.business_id)
        .filter(
            Product.is_active == True,  # noqa: E712
            Product.listed_on_marketplace == True,  # noqa: E712
            Product.stock_quantity > 0,
            Product.is_featured == True,  # noqa: E712
            Business.is_active == True,  # noqa: E712
            Business.approval_status == "APPROVED",
            or_(Product.featured_until == None, Product.featured_until >= now),  # noqa: E711
        )
        .order_by(desc(Product.featured_until), desc(Product.created_at))
        .limit(limit)
        .all()
    )
    return [_to_market_product(product, business) for product, business in rows]


class CheckoutItem(BaseModel):
    product_id: str
    quantity: int = Field(..., gt=0)


class MarketplaceCheckoutRequest(BaseModel):
    items: List[CheckoutItem] = Field(..., min_length=1)
    customer_name: str = Field(..., min_length=2, max_length=255)
    customer_phone: str = Field(..., min_length=9, max_length=30)
    customer_email: Optional[EmailStr] = None
    delivery_address: Optional[str] = None


class MarketplaceCheckoutResponse(BaseModel):
    order_id: str
    order_number: str
    payment_id: str
    amount: Decimal
    commission_amount: Decimal
    status: str
    customer_message: str


class OrderStatusResponse(BaseModel):
    order_id: str
    order_number: str
    payment_status: str
    fulfillment_status: str
    total_amount: Decimal
    mpesa_receipt_number: Optional[str] = None
    business_name: Optional[str] = None


@router.get("/products/{product_id}", response_model=MarketProduct)
def get_marketplace_product(product_id: UUID, db: Session = Depends(get_db)):
    row = (
        db.query(Product, Business)
        .join(Business, Business.id == Product.business_id)
        .filter(
            Product.id == product_id,
            Product.is_active == True,  # noqa: E712
            Product.listed_on_marketplace == True,  # noqa: E712
            Business.approval_status == "APPROVED",
            Business.is_active == True,  # noqa: E712
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Product not found")
    product, business = row
    return _to_market_product(product, business)


@router.post("/checkout", response_model=MarketplaceCheckoutResponse, status_code=201)
async def marketplace_checkout(payload: MarketplaceCheckoutRequest, db: Session = Depends(get_db)):
    """Create an online order and send M-Pesa STK Push."""
    cart_items = []
    business_id = None
    subtotal = Decimal("0.00")

    for item in payload.items:
        product = db.query(Product).filter(
            Product.id == item.product_id,
            Product.is_active == True,  # noqa: E712
        ).first()
        if not product or not product.listed_on_marketplace:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        business = db.query(Business).filter(
            Business.id == product.business_id,
            Business.approval_status == "APPROVED",
            Business.is_active == True,  # noqa: E712
        ).first()
        if not business:
            raise HTTPException(status_code=400, detail=f"{product.name} is not available for online sale")
        if business_id is None:
            business_id = business.id
        elif business_id != business.id:
            raise HTTPException(
                status_code=400,
                detail="Checkout currently supports one seller at a time. Remove items from other shops.",
            )
        if product.stock_quantity < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product.name}. Available: {product.stock_quantity}",
            )
        unit = _money(product.selling_price)
        line = _money(unit * item.quantity)
        subtotal += line
        cart_items.append(
            {
                "product_id": str(product.id),
                "name": product.name,
                "sku": product.sku,
                "quantity": item.quantity,
                "unit_price": str(unit),
                "subtotal": str(line),
                "image_url": product.image_url,
            }
        )

    business = db.query(Business).filter(Business.id == business_id).first()
    try:
        credentials = resolve_credentials(business.settings or {})
    except MpesaError as exc:
        raise HTTPException(status_code=400, detail=f"Seller M-Pesa not configured: {exc}") from exc

    commission_percent = _money(settings.MARKETPLACE_COMMISSION_PERCENT)
    commission_amount = _money(subtotal * commission_percent / Decimal("100"))
    business_payout = _money(subtotal - commission_amount)
    total = _money(subtotal)
    amount_int = int(total.to_integral_value(rounding=ROUND_HALF_UP))

    order = OnlineOrder(
        business_id=business_id,
        order_number=_order_number(),
        customer_name=payload.customer_name.strip(),
        customer_phone=payload.customer_phone.strip(),
        customer_email=str(payload.customer_email) if payload.customer_email else None,
        delivery_address=payload.delivery_address,
        items=cart_items,
        subtotal=subtotal,
        commission_percent=commission_percent,
        commission_amount=commission_amount,
        business_payout=business_payout,
        total_amount=total,
        payment_method="MPESA",
        payment_status="PENDING",
        fulfillment_status="PENDING",
    )
    db.add(order)
    db.flush()

    payment = MpesaTransaction(
        business_id=business_id,
        user_id=None,
        phone_number=payload.customer_phone,
        amount=total,
        account_reference=order.order_number[:12],
        description="Online Order",
        status="PENDING",
        source="MARKETPLACE",
        cart_snapshot={"order_id": str(order.id), "items": cart_items},
    )
    db.add(payment)
    db.commit()
    db.refresh(order)
    db.refresh(payment)

    base = (settings.MPESA_CALLBACK_BASE_URL or settings.API_BASE_URL or "").rstrip("/")
    if not base:
        raise HTTPException(status_code=500, detail="MPESA_CALLBACK_BASE_URL is not configured")

    try:
        result = await initiate_stk_push(
            credentials=credentials,
            phone_number=payload.customer_phone,
            amount=amount_int,
            account_reference=order.order_number[:12],
            transaction_desc="Online Order",
            callback_url=f"{base}/api/v1/payments/mpesa/callback",
        )
    except MpesaError as exc:
        payment.status = "FAILED"
        payment.result_desc = str(exc)
        order.payment_status = "FAILED"
        db.commit()
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    payment.phone_number = result["phone_number"]
    payment.merchant_request_id = result.get("merchant_request_id")
    payment.checkout_request_id = result.get("checkout_request_id")
    payment.result_desc = result.get("customer_message")
    order.mpesa_checkout_request_id = payment.checkout_request_id
    order.customer_phone = payment.phone_number
    db.commit()

    return MarketplaceCheckoutResponse(
        order_id=str(order.id),
        order_number=order.order_number,
        payment_id=str(payment.id),
        amount=order.total_amount,
        commission_amount=order.commission_amount,
        status="PENDING",
        customer_message=payment.result_desc or "Check your phone to enter M-Pesa PIN",
    )


@router.get("/orders/{order_id}", response_model=OrderStatusResponse)
def get_public_order_status(order_id: UUID, db: Session = Depends(get_db)):
    order = db.query(OnlineOrder).filter(OnlineOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    business = db.query(Business).filter(Business.id == order.business_id).first()
    return OrderStatusResponse(
        order_id=str(order.id),
        order_number=order.order_number,
        payment_status=order.payment_status,
        fulfillment_status=order.fulfillment_status,
        total_amount=order.total_amount,
        mpesa_receipt_number=order.mpesa_receipt_number,
        business_name=business.name if business else None,
    )


@router.get("/orders/{order_id}/invoice")
def download_order_invoice(order_id: UUID, db: Session = Depends(get_db)):
    """Generate a downloadable PDF invoice for a paid M-Pesa marketplace order."""
    from app.utils.invoice_generator import generate_order_invoice_pdf, pdf_attachment

    order = db.query(OnlineOrder).filter(OnlineOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.payment_status != "PAID":
        raise HTTPException(status_code=400, detail="Invoice available after payment")
    business = db.query(Business).filter(Business.id == order.business_id).first()
    return pdf_attachment(
        generate_order_invoice_pdf(order, business),
        f"invoice-{order.order_number}.pdf",
    )


@router.get("/deal-of-the-day", response_model=Optional[MarketProduct])
def get_deal_of_the_day(db: Session = Depends(get_db)):
    """Public deal of the day from an approved seller listed on DukaMall."""
    now = datetime.utcnow()
    row = (
        _marketplace_visible(
            db.query(Product, Business).join(Business, Business.id == Product.business_id)
        )
        .filter(
            Product.is_deal_of_day == True,  # noqa: E712
            or_(Product.deal_of_day_until == None, Product.deal_of_day_until >= now),  # noqa: E711
        )
        .order_by(desc(Product.deal_of_day_until), desc(Product.updated_at))
        .first()
    )
    if not row:
        return None
    product, business = row
    return _to_market_product(product, business)
