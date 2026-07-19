"""Business online order management."""

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
from app.models.user import User

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
    created_at: datetime
    paid_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None


class FulfillmentUpdate(BaseModel):
    fulfillment_status: str = Field(..., pattern="^(PENDING|PROCESSING|DELIVERED|CANCELLED)$")


class NotificationOut(BaseModel):
    id: str
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime
    data: dict = {}


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
    return [
        OrderItemOut(
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
            created_at=order.created_at,
            paid_at=order.paid_at,
            delivered_at=order.delivered_at,
        )
        for order in orders
    ]


@router.patch("/{order_id}/fulfillment", response_model=OrderItemOut)
def update_fulfillment(
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
    order.fulfillment_status = payload.fulfillment_status
    if payload.fulfillment_status == "DELIVERED":
        order.delivered_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
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
        created_at=order.created_at,
        paid_at=order.paid_at,
        delivered_at=order.delivered_at,
    )
