"""Tenant-owned records used by the management pages."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class TenantRecord:
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(
        UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=False, index=True
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Category(TenantRecord, Base):
    __tablename__ = "categories"

    name = Column(String(255), nullable=False)
    description = Column(String(500))
    color = Column(String(20), default="#059669", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("business_id", "name", name="uq_category_name"),
    )


class Supplier(TenantRecord, Base):
    __tablename__ = "suppliers"

    name = Column(String(255), nullable=False)
    contact_name = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))
    address = Column(String(500))
    city = Column(String(100))
    country = Column(String(100), default="Kenya")
    tax_id = Column(String(100))
    payment_terms = Column(Integer, default=30)
    status = Column(String(50), default="active")
    notes = Column(Text)
    products = Column(JSON, default=list, nullable=False)
    total_purchases = Column(Numeric(12, 2), default=0, nullable=False)
    total_orders = Column(Integer, default=0, nullable=False)
    last_order = Column(DateTime)


class Customer(TenantRecord, Base):
    __tablename__ = "customers"

    name = Column(String(255), nullable=False)
    email = Column(String(255))
    phone = Column(String(50))
    address = Column(String(500))
    status = Column(String(50), default="active")
    notes = Column(Text)
    total_orders = Column(Integer, default=0, nullable=False)
    total_spent = Column(Numeric(12, 2), default=0, nullable=False)
    last_order = Column(DateTime)


class Branch(TenantRecord, Base):
    __tablename__ = "branches"

    name = Column(String(255), nullable=False)
    location = Column(String(500), nullable=False)
    phone = Column(String(50))
    email = Column(String(255))
    manager = Column(String(255))
    status = Column(String(50), default="active")
    staff = Column(Integer, default=0, nullable=False)
    sales = Column(Integer, default=0, nullable=False)
    revenue = Column(Numeric(12, 2), default=0, nullable=False)

    __table_args__ = (
        UniqueConstraint("business_id", "name", name="uq_branch_name"),
    )
