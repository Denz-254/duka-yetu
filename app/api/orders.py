"""Business online order management."""

import re
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_business, get_current_user
from app.models.business import Business
from app.models.online_order import Notification, OnlineOrder
from app.models.product import Product
from app.models.user import User
from app.services.email import send_order_delivered_emails, send_order_paid_emails
from app.utils.invoice_generator import generate_order_invoice_pdf, pdf_attachment

router = APIRouter()


class OrderItemOut(BaseModel):
    id: str
    order_number: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    delivery_address: Optional[str] = None
    items: list
    total_amount: float
    commission_amount: float
    business_payout: float
    payment_status: str
    fulfillment_status: str
    mpesa_receipt_number: Optional[str] = None
    payment_details: dict = {}
    created_at: datetime
    paid_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None


class FulfillmentUpdate(BaseModel):
    fulfillment_status: str = Field(..., pattern="^(PENDING|PROCESSING|DELIVERED|CANCELLED)$")


class MarkPaidRequest(BaseModel):
    mpesa_receipt_number: Optional[str] = Field(None, max_length=20)


class NotificationOut(BaseModel):
    id: str
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime
    data: dict = {}


def _order_out(order: OnlineOrder) -> OrderItemOut:
    return OrderItemOut(
        id=str(order.id),
        order_number=order.order_number,
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        customer_email=order.customer_email,
        delivery_address=order.delivery_address,
        items=order.items or [],
        total_amount=float(order.total_amount),
        commission_amount=float(order.commission_amount),
        business_payout=float(order.business_payout),
        payment_status=order.payment_status,
        fulfillment_status=order.fulfillment_status,
        mpesa_receipt_number=order.mpesa_receipt_number,
        payment_details=order.payment_details or {},
        created_at=order.created_at,
        paid_at=order.paid_at,
        delivered_at=order.delivered_at,
    )


@router.get("/notifications", response_model=List[NotificationOut])
def list_business_notifications(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    business: Business = Depends(get_current_business),
):
    rows = (
        db.query(Notification)
        .filter(
            Notification.audience == "BUSINESS",
            Notification.business_id == business.id,
        )
        .order_by(desc(Notification.created_at))
        .limit(50)
        .all()
    )
    return [
        NotificationOut(
            id=str(row.id),
            title=row.title,
            message=row.message,
            type=row.type,
            is_read=bool(row.is_read),
            created_at=row.created_at,
            data=row.data or {},
        )
        for row in rows
    ]


@router.get("/", response_model=List[OrderItemOut])
def list_orders(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    business: Business = Depends(get_current_business),
    payment_status: Optional[str] = Query(None),
    fulfillment_status: Optional[str] = Query(None),
):
    query = db.query(OnlineOrder).filter(OnlineOrder.business_id == business.id)
    if payment_status:
        query = query.filter(OnlineOrder.payment_status == payment_status.upper())
    if fulfillment_status:
        query = query.filter(OnlineOrder.fulfillment_status == fulfillment_status.upper())
    orders = query.order_by(desc(OnlineOrder.created_at)).limit(200).all()
    return [_order_out(order) for order in orders]


@router.get("/{order_id}/invoice")
def business_order_invoice(
    order_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    business: Business = Depends(get_current_business),
):
    order = db.query(OnlineOrder).filter(
        OnlineOrder.id == order_id,
        OnlineOrder.business_id == business.id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.payment_status != "PAID":
        raise HTTPException(status_code=400, detail="Invoice available after payment")
    return pdf_attachment(
        generate_order_invoice_pdf(order, business),
        f"invoice-{order.order_number}.pdf",
    )


@router.patch("/{order_id}/fulfillment", response_model=OrderItemOut)
async def update_fulfillment(
    order_id: UUID,
    payload: FulfillmentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    business: Business = Depends(get_current_business),
):
    order = db.query(OnlineOrder).filter(
        OnlineOrder.id == order_id,
        OnlineOrder.business_id == business.id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    previous = order.fulfillment_status
    order.fulfillment_status = payload.fulfillment_status
    if payload.fulfillment_status == "DELIVERED":
        order.delivered_at = datetime.utcnow()
    db.commit()
    db.refresh(order)

    if payload.fulfillment_status == "DELIVERED" and previous != "DELIVERED":
        try:
            await send_order_delivered_emails(order, business)
        except Exception:  # noqa: BLE001
            pass

    return _order_out(order)


@router.post("/{order_id}/mark-paid", response_model=OrderItemOut)
async def mark_order_paid(
    order_id: UUID,
    payload: MarkPaidRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    business: Business = Depends(get_current_business),
):
    """Confirm an online order after the Paybill, Till, or Send Money message arrives."""
    order = db.query(OnlineOrder).filter(
        OnlineOrder.id == order_id,
        OnlineOrder.business_id == business.id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.payment_status == "PAID":
        return _order_out(order)
    if order.fulfillment_status == "CANCELLED":
        raise HTTPException(status_code=400, detail="This order was cancelled")
    if order.payment_status not in {"PENDING", "FAILED"}:
        raise HTTPException(status_code=400, detail="This order cannot be marked as paid")

    receipt = (payload.mpesa_receipt_number or "").strip().upper()
    if receipt and not re.fullmatch(r"[A-Z0-9]{6,20}", receipt):
        raise HTTPException(
            status_code=400,
            detail="M-Pesa confirmation code should be 6 to 20 letters and numbers.",
        )

    for item in order.items or []:
        product = db.query(Product).filter(
            Product.id == item["product_id"],
            Product.business_id == order.business_id,
        ).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.get('name')} is no longer available")
        qty = int(item["quantity"])
        if product.stock_quantity < qty:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product.name}. Available: {product.stock_quantity}",
            )
        product.stock_quantity -= qty

    order.payment_status = "PAID"
    order.fulfillment_status = "PROCESSING"
    order.paid_at = datetime.utcnow()
    if receipt:
        order.mpesa_receipt_number = receipt

    db.add(
        Notification(
            audience="BUSINESS",
            business_id=order.business_id,
            title="Online order confirmed",
            message=f"Order {order.order_number} was marked paid after the M-Pesa message.",
            type="ORDER",
            data={"order_id": str(order.id), "order_number": order.order_number},
            is_read=0,
        )
    )
    db.commit()
    db.refresh(order)

    try:
        await send_order_paid_emails(order, business)
    except Exception:  # noqa: BLE001
        pass

    return _order_out(order)
