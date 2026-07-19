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
    total_sales_all_time: int
    total_revenue_all_time: Decimal

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

class RecentSale(BaseModel):
    """Recent sale for dashboard."""
    id: str
    receipt_number: str
    cashier_name: str
    total_amount: Decimal
    payment_method: str
    sale_date: datetime

class CashierDashboardResponse(BaseModel):
    """Cashier dashboard response — daily personal stats only."""
    today_sales_count: int
    today_revenue: Decimal
    recent_sales: List[RecentSale]
    today_cash_count: int = 0
    today_mpesa_count: int = 0
    # Deprecated fields kept optional for older clients
    total_sales_all_time: Optional[int] = None
    total_revenue_all_time: Optional[Decimal] = None
