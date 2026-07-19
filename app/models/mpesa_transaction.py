"""M-Pesa STK Push transaction tracking."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text, Uuid
from sqlalchemy.orm import relationship

from app.core.database import Base


class MpesaTransaction(Base):
    """Tracks Daraja STK Push requests for POS and ecommerce."""

    __tablename__ = "mpesa_transactions"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(Uuid(as_uuid=True), ForeignKey("businesses.id"), nullable=False, index=True)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    sale_id = Column(Uuid(as_uuid=True), ForeignKey("sales.id"), nullable=True, index=True)

    phone_number = Column(String(20), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    account_reference = Column(String(50), nullable=False)
    description = Column(String(100), nullable=False, default="POS Payment")

    merchant_request_id = Column(String(100), index=True)
    checkout_request_id = Column(String(100), unique=True, index=True)
    mpesa_receipt_number = Column(String(50), index=True)

    status = Column(String(30), nullable=False, default="PENDING", index=True)
    result_code = Column(Integer)
    result_desc = Column(Text)

    source = Column(String(30), nullable=False, default="POS")  # POS | MARKETPLACE
    cart_snapshot = Column(JSON, default=dict, nullable=False)
    callback_payload = Column(JSON, default=dict, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime)

    business = relationship("Business")
    user = relationship("User")
    sale = relationship("Sale")

    def __repr__(self):
        return f"<MpesaTransaction {self.checkout_request_id} ({self.status})>"
