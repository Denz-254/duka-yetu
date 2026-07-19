"""Sale model for POS transactions."""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, Uuid
from sqlalchemy.orm import relationship

from app.core.database import Base

class Sale(Base):
    """Sale/transaction model."""
    
    __tablename__ = "sales"
    
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(Uuid(as_uuid=True), ForeignKey("businesses.id"), nullable=False)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    receipt_number = Column(String(50), nullable=False, unique=True, index=True)
    total_amount = Column(Numeric(10, 2), nullable=False)
    payment_method = Column(String(50), default="CASH", nullable=False)
    payment_status = Column(String(50), default="PAID", nullable=False)
    sale_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    business = relationship("Business", back_populates="sales")
    cashier = relationship("User", back_populates="sales")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Sale {self.receipt_number} (${self.total_amount})>"