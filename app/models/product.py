"""Product model for inventory management."""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Numeric, Boolean, Uuid
from sqlalchemy.orm import relationship
from sqlalchemy import UniqueConstraint

from app.core.database import Base

class Product(Base):
    """Product model for inventory."""
    
    __tablename__ = "products"
    
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(Uuid(as_uuid=True), ForeignKey("businesses.id"), nullable=False)
    name = Column(String(255), nullable=False)
    sku = Column(String(100), nullable=False)
    selling_price = Column(Numeric(10, 2), nullable=False)
    cost_price = Column(Numeric(10, 2))
    stock_quantity = Column(Integer, default=0, nullable=False)
    description = Column(String(500))
    image_url = Column(String(500))
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    business = relationship("Business", back_populates="products")
    sale_items = relationship("SaleItem", back_populates="product", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('business_id', 'sku', name='uq_product_sku'),
    )
    
    def __repr__(self):
        return f"<Product {self.name} (SKU: {self.sku})>"
