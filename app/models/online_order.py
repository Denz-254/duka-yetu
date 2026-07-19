"""Marketplace online orders placed against tenant products."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text, Uuid
from sqlalchemy.orm import relationship

from app.core.database import Base


class OnlineOrder(Base):
    __tablename__ = "online_orders"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(Uuid(as_uuid=True), ForeignKey("businesses.id"), nullable=False, index=True)
    order_number = Column(String(50), unique=True, nullable=False, index=True)

    customer_name = Column(String(255), nullable=False)
    customer_phone = Column(String(30), nullable=False)
    customer_email = Column(String(255))
    delivery_address = Column(Text)

    items = Column(JSON, default=list, nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False)
    commission_percent = Column(Numeric(5, 2), nullable=False, default=5)
    commission_amount = Column(Numeric(12, 2), nullable=False, default=0)
    business_payout = Column(Numeric(12, 2), nullable=False, default=0)
    total_amount = Column(Numeric(12, 2), nullable=False)

    payment_method = Column(String(30), nullable=False, default="MPESA")
    payment_status = Column(String(30), nullable=False, default="PENDING", index=True)
    fulfillment_status = Column(String(30), nullable=False, default="PENDING", index=True)
    # PENDING | PAID | FAILED for payment; PENDING | PROCESSING | DELIVERED | CANCELLED for fulfillment

    mpesa_checkout_request_id = Column(String(100), index=True)
    mpesa_receipt_number = Column(String(50), index=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    paid_at = Column(DateTime)
    delivered_at = Column(DateTime)

    business = relationship("Business")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(Uuid(as_uuid=True), ForeignKey("businesses.id"), nullable=True, index=True)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    audience = Column(String(30), nullable=False, default="BUSINESS")  # BUSINESS | SUPER_ADMIN
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), nullable=False, default="ORDER")
    data = Column(JSON, default=dict, nullable=False)
    is_read = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
