"""Business model for tenant isolation."""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, JSON, Uuid
from sqlalchemy.orm import relationship

from app.core.database import Base

class Business(Base):
    """Business/tenant model."""
    
    __tablename__ = "businesses"
    
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    owner_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    package = Column(String(50), default="BASIC", nullable=False)
    subscription_status = Column(String(50), default="TRIALING", nullable=False)
    stripe_customer_id = Column(String(255), unique=True, index=True)
    stripe_subscription_id = Column(String(255), unique=True, index=True)
    trial_ends_at = Column(DateTime)
    subscription_current_period_end = Column(DateTime)
    profile = Column(JSON, default=dict, nullable=False)
    settings = Column(JSON, default=dict, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    # PENDING | APPROVED | REJECTED — super admin gate before using POS features
    approval_status = Column(String(20), default="PENDING", nullable=False, index=True)
    approved_at = Column(DateTime)
    rejection_reason = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    users = relationship("User", back_populates="business", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="business", cascade="all, delete-orphan")
    sales = relationship("Sale", back_populates="business", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Business {self.name} ({self.id})>"