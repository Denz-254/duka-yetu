"""Dashboard routes for Duka Yetu."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from datetime import datetime, timedelta
from decimal import Decimal

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_owner
from app.models.user import User
from app.models.product import Product
from app.models.sale import Sale
from app.schemas.dashboard import (
    DashboardOverview,
    WeeklySalesResponse,
    DailySalesData,
    LowStockResponse,
    LowStockProduct,
    CashierDashboardResponse,
    RecentSale,
)

router = APIRouter()

@router.get("/owner/overview", response_model=DashboardOverview)
async def get_owner_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    """
    Get owner dashboard overview.
    
    Only OWNER can access this dashboard.
    """
    business_id = current_user.business_id
    today = datetime.now().date()
    today_start = datetime.combine(today, datetime.min.time())
    
    # Today's sales
    today_sales = db.query(Sale).filter(
        Sale.business_id == business_id,
        Sale.sale_date >= today_start
    ).all()
    today_sales_count = len(today_sales)
    today_revenue = sum(sale.total_amount for sale in today_sales)
    
    # Total products
    total_products = db.query(Product).filter(
        Product.business_id == business_id,
        Product.is_active == True
    ).count()
    
    # Total products value
    products = db.query(Product).filter(
        Product.business_id == business_id,
        Product.is_active == True
    ).all()
    total_products_value = sum(p.selling_price * p.stock_quantity for p in products)
    
    # Low stock
    threshold = 10
    low_stock_products = db.query(Product).filter(
        Product.business_id == business_id,
        Product.is_active == True,
        Product.stock_quantity < threshold
    ).count()
    
    # Total staff
    total_staff = db.query(User).filter(
        User.business_id == business_id,
        User.is_active == True
    ).count()
    
    # All time sales
    all_sales = db.query(Sale).filter(Sale.business_id == business_id).all()
    total_sales_all_time = len(all_sales)
    total_revenue_all_time = sum(sale.total_amount for sale in all_sales)
    
    return DashboardOverview(
        today_sales_count=today_sales_count,
        today_revenue=Decimal(str(today_revenue)),
        total_products=total_products,
        total_products_value=Decimal(str(total_products_value)),
        low_stock_count=low_stock_products,
        total_staff=total_staff,
        total_sales_all_time=total_sales_all_time,
        total_revenue_all_time=Decimal(str(total_revenue_all_time)),
    )

@router.get("/owner/weekly-sales", response_model=WeeklySalesResponse)
async def get_weekly_sales(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    """
    Get weekly sales data for charts.
    
    Only OWNER can access this data.
    """
    business_id = current_user.business_id
    today = datetime.now().date()
    
    # Get last 7 days
    weekly_data = []
    total_revenue = Decimal('0.00')
    
    for i in range(6, -1, -1):
        date = today - timedelta(days=i)
        date_start = datetime.combine(date, datetime.min.time())
        date_end = datetime.combine(date, datetime.max.time())
        
        sales = db.query(Sale).filter(
            Sale.business_id == business_id,
            Sale.sale_date >= date_start,
            Sale.sale_date <= date_end
        ).all()
        
        daily_revenue = sum(sale.total_amount for sale in sales)
        total_revenue += daily_revenue
        
        weekly_data.append(
            DailySalesData(
                date=date.strftime("%Y-%m-%d"),
                sales_count=len(sales),
                revenue=Decimal(str(daily_revenue)),
            )
        )
    
    average_daily = total_revenue / 7 if weekly_data else Decimal('0.00')
    
    return WeeklySalesResponse(
        data=weekly_data,
        total_revenue=total_revenue,
        average_daily_revenue=Decimal(str(average_daily)),
        growth_percentage=None,  # Could calculate week-over-week growth
    )

@router.get("/owner/low-stock", response_model=LowStockResponse)
async def get_low_stock_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
    threshold: int = 10,
):
    """
    Get products with low stock.
    
    Only OWNER can access low stock alerts.
    """
    business_id = current_user.business_id
    
    products = db.query(Product).filter(
        Product.business_id == business_id,
        Product.is_active == True,
        Product.stock_quantity < threshold
    ).order_by(Product.stock_quantity).all()
    
    items = [
        LowStockProduct(
            product_id=str(p.id),
            name=p.name,
            sku=p.sku,
            current_stock=p.stock_quantity,
            selling_price=p.selling_price,
            threshold=threshold,
        )
        for p in products
    ]
    
    return LowStockResponse(
        items=items,
        count=len(items),
    )

@router.get("/cashier/overview", response_model=CashierDashboardResponse)
async def get_cashier_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get cashier dashboard overview.
    
    Cashier sees only their own data.
    """
    today = datetime.now().date()
    today_start = datetime.combine(today, datetime.min.time())
    
    # Cashier's today's sales
    today_sales = db.query(Sale).filter(
        Sale.business_id == current_user.business_id,
        Sale.user_id == current_user.id,
        Sale.sale_date >= today_start
    ).all()
    today_sales_count = len(today_sales)
    today_revenue = sum(sale.total_amount for sale in today_sales)
    
    # Cashier's all time sales
    all_sales = db.query(Sale).filter(
        Sale.business_id == current_user.business_id,
        Sale.user_id == current_user.id
    ).all()
    total_sales_all_time = len(all_sales)
    total_revenue_all_time = sum(sale.total_amount for sale in all_sales)
    
    # Recent sales (last 10)
    recent_sales = db.query(Sale).filter(
        Sale.business_id == current_user.business_id,
        Sale.user_id == current_user.id
    ).order_by(desc(Sale.sale_date)).limit(10).all()
    
    recent_items = [
        RecentSale(
            id=str(sale.id),
            receipt_number=sale.receipt_number,
            cashier_name=current_user.name,
            total_amount=sale.total_amount,
            payment_method=sale.payment_method,
            sale_date=sale.sale_date,
        )
        for sale in recent_sales
    ]
    
    return CashierDashboardResponse(
        today_sales_count=today_sales_count,
        today_revenue=Decimal(str(today_revenue)),
        recent_sales=recent_items,
        total_sales_all_time=total_sales_all_time,
        total_revenue_all_time=Decimal(str(total_revenue_all_time)),
    )
