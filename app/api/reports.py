"""Business owner report endpoints with downloadable summaries."""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_business, get_current_user
from app.models.business import Business
from app.models.product import Product
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.models.user import User

router = APIRouter()


def _range_start(period: str) -> Optional[datetime]:
    now = datetime.utcnow()
    if period == "today":
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    if period == "weekly":
        return now - timedelta(days=7)
    if period == "monthly":
        return now - timedelta(days=30)
    if period == "yearly":
        return now - timedelta(days=365)
    return None  # all time


@router.get("/summary")
def report_summary(
    period: str = Query("monthly", pattern="^(today|weekly|monthly|yearly|all)$"),
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business),
    _: User = Depends(get_current_user),
):
    start = _range_start(period)
    q = db.query(Sale).filter(Sale.business_id == business.id)
    if start:
        q = q.filter(Sale.sale_date >= start)
    sales = q.order_by(Sale.sale_date.desc()).limit(500).all()

    total_revenue = float(sum(float(s.total_amount or 0) for s in sales))
    total_orders = len(sales)
    avg = (total_revenue / total_orders) if total_orders else 0.0

    by_day: dict[str, float] = {}
    for s in sales:
        key = (s.sale_date or s.created_at).strftime("%Y-%m-%d")
        by_day[key] = by_day.get(key, 0) + float(s.total_amount or 0)
    trend = [{"date": k, "revenue": round(v, 2)} for k, v in sorted(by_day.items())]

    item_q = (
        db.query(
            Product.name,
            func.sum(SaleItem.quantity).label("qty"),
            func.sum(SaleItem.subtotal).label("rev"),
        )
        .join(Sale, Sale.id == SaleItem.sale_id)
        .join(Product, Product.id == SaleItem.product_id)
        .filter(Sale.business_id == business.id)
    )
    if start:
        item_q = item_q.filter(Sale.sale_date >= start)
    top_rows = (
        item_q.group_by(Product.name)
        .order_by(func.sum(SaleItem.subtotal).desc())
        .limit(10)
        .all()
    )
    top_products = [
        {"name": r[0] or "Item", "quantity": int(r[1] or 0), "revenue": float(r[2] or 0)}
        for r in top_rows
    ]

    recent = []
    for s in sales[:20]:
        recent.append(
            {
                "id": str(s.id),
                "receipt_number": s.receipt_number,
                "sale_date": s.sale_date,
                "total_amount": float(s.total_amount or 0),
                "payment_status": s.payment_status,
                "payment_method": s.payment_method,
                "items_count": len(s.items) if s.items else 0,
            }
        )

    low_stock = (
        db.query(Product)
        .filter(
            Product.business_id == business.id,
            Product.is_active == True,  # noqa: E712
            Product.stock_quantity <= 5,
        )
        .count()
    )

    return {
        "period": period,
        "summary": {
            "total_revenue": round(total_revenue, 2),
            "total_orders": total_orders,
            "average_order_value": round(avg, 2),
            "products_sold": sum(p["quantity"] for p in top_products),
            "low_stock_products": low_stock,
        },
        "trend": trend,
        "top_products": top_products,
        "recent_orders": recent,
    }


@router.get("/download")
def download_report(
    period: str = Query("monthly", pattern="^(today|weekly|monthly|yearly|all)$"),
    db: Session = Depends(get_db),
    business: Business = Depends(get_current_business),
    current_user: User = Depends(get_current_user),
):
    data = report_summary(period=period, db=db, business=business, _=current_user)
    s = data["summary"]
    rows = "".join(
        f"<tr><td style='padding:6px;border-bottom:1px solid #eee'>{o['receipt_number']}</td>"
        f"<td style='padding:6px;border-bottom:1px solid #eee'>{o['sale_date']}</td>"
        f"<td style='padding:6px;border-bottom:1px solid #eee;text-align:right'>KES {o['total_amount']}</td>"
        f"<td style='padding:6px;border-bottom:1px solid #eee'>{o['payment_method']}</td></tr>"
        for o in data["recent_orders"]
    )
    top = "".join(
        f"<tr><td style='padding:6px'>{p['name']}</td>"
        f"<td style='padding:6px;text-align:center'>{p['quantity']}</td>"
        f"<td style='padding:6px;text-align:right'>KES {p['revenue']}</td></tr>"
        for p in data["top_products"]
    )
    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Report — {business.name}</title></head>
<body style="font-family:Arial,sans-serif;max-width:800px;margin:24px auto;padding:0 16px;color:#111">
  <h1 style="margin:0">Sales Report</h1>
  <p style="color:#666">{business.name} · Period: {period} · Generated {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC</p>
  <div style="display:flex;gap:24px;margin:20px 0;flex-wrap:wrap">
    <div><p style="margin:0;color:#666;font-size:12px">REVENUE</p><p style="margin:4px 0;font-size:22px;font-weight:bold">KES {s['total_revenue']}</p></div>
    <div><p style="margin:0;color:#666;font-size:12px">ORDERS</p><p style="margin:4px 0;font-size:22px;font-weight:bold">{s['total_orders']}</p></div>
    <div><p style="margin:0;color:#666;font-size:12px">AVG ORDER</p><p style="margin:4px 0;font-size:22px;font-weight:bold">KES {s['average_order_value']}</p></div>
  </div>
  <h2 style="font-size:16px">Top products</h2>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px"><thead>
    <tr style="background:#f5f5f5"><th style="text-align:left;padding:8px">Product</th>
    <th style="padding:8px">Qty</th><th style="text-align:right;padding:8px">Revenue</th></tr>
  </thead><tbody>{top or '<tr><td colspan="3" style="padding:8px">No data</td></tr>'}</tbody></table>
  <h2 style="font-size:16px">Recent sales</h2>
  <table style="width:100%;border-collapse:collapse"><thead>
    <tr style="background:#f5f5f5"><th style="text-align:left;padding:8px">Receipt</th>
    <th style="text-align:left;padding:8px">Date</th><th style="text-align:right;padding:8px">Amount</th>
    <th style="text-align:left;padding:8px">Method</th></tr>
  </thead><tbody>{rows or '<tr><td colspan="4" style="padding:8px">No sales</td></tr>'}</tbody></table>
  <p style="margin-top:32px;font-size:12px;color:#888">Duka Yetu · Business performance report</p>
</body></html>"""
    filename = f"report-{business.name[:20].replace(' ', '-')}-{period}.html"
    return HTMLResponse(
        content=html,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
