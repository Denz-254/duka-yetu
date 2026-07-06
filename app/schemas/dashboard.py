"""Dashboard schemas for analytics and reporting."""

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

class DashboardOverview(BaseModel):
    """Dashboard overview metrics."""
    today_sales_count: int
    today_revenue: Decimal
    total_products: int
    total_products_value: Decimal
    low_stock_count: int
    total_staff: int
    total_businesses: Optional[int] = None  # For super admin

class DailySalesData(BaseModel):
    """Daily sales data point."""
    date: str  # YYYY-MM-DD
    sales_count: int
    revenue: Decimal

class WeeklySalesResponse(BaseModel):
    """Weekly sales data."""
    data: List[DailySalesData]
    total_revenue: Decimal
    average_daily_revenue: Decimal
    growth_percentage: Optional[float] = None

class LowStockProduct(BaseModel):
    """Low stock product alert."""
    product_id: str
    name: str
    sku: str
    current_stock: int
    selling_price: Decimal
    threshold: int

class LowStockResponse(BaseModel):
    """Low stock products response."""
    items: List[LowStockProduct]
    count: int