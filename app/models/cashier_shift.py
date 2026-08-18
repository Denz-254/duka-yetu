"""Cashier day shifts (clock in / clock out)."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Uuid
from sqlalchemy.orm import relationship

from app.core.database import Base


class CashierShift(Base):
    """One cashier's work session with opening and closing cash."""

    __tablename__ = "cashier_shifts"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(Uuid(as_uuid=True), ForeignKey("businesses.id"), nullable=False, index=True)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    opened_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    closed_at = Column(DateTime, nullable=True)
    opening_cash = Column(Numeric(12, 2), default=0, nullable=False)
    closing_cash = Column(Numeric(12, 2), nullable=True)
    expected_cash = Column(Numeric(12, 2), nullable=True)
    cash_sales = Column(Numeric(12, 2), default=0, nullable=False)
    mpesa_sales = Column(Numeric(12, 2), default=0, nullable=False)
    card_sales = Column(Numeric(12, 2), default=0, nullable=False)
    send_money_sales = Column(Numeric(12, 2), default=0, nullable=False)
    total_sales = Column(Numeric(12, 2), default=0, nullable=False)
    sales_count = Column(Integer, default=0, nullable=False)
    variance = Column(Numeric(12, 2), nullable=True)
    notes = Column(String(500), nullable=True)
    status = Column(String(20), default="OPEN", nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    cashier = relationship("User")
