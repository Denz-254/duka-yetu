"""User model for authentication and authorization."""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Uuid
from sqlalchemy.orm import relationship

from app.core.database import Base

class User(Base):
    """User model with role-based access control."""
    
    __tablename__ = "users"
    
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(Uuid(as_uuid=True), ForeignKey("businesses.id"), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(20))
    username = Column(String(100), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="CASHIER", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    login_time = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # branch_id - for multi-branch support (optional)
    branch_id = Column(Uuid(as_uuid=True), nullable=True)
    
    # Relationships
    business = relationship("Business", back_populates="users")
    sales = relationship("Sale", back_populates="cashier", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User {self.username} ({self.role})>"
