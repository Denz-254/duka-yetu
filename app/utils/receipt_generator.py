"""Receipt generation utilities."""

from datetime import datetime
from sqlalchemy.orm import Session
from app.models.sale import Sale
from app.models.sale_item import SaleItem

def generate_receipt_html(sale: Sale, db: Session) -> str:
    """
    Generate HTML receipt for a sale.
    """
    # Get sale items
    items = db.query(SaleItem).filter(SaleItem.sale_id == sale.id).all()
    
    # Get business name
    business = sale.business
    
    html = f"""
    <div style="font-family: monospace; max-width: 350px; margin: 0 auto; padding: 20px; border: 1px solid #ccc;">
        <div style="text-align: center;">
            <h2>{business.name}</h2>
            <p>{business.phone}</p>
            <p>{business.email}</p>
            <hr>
        </div>
        
        <div>
            <p><strong>Receipt #:</strong> {sale.receipt_number}</p>
            <p><strong>Date:</strong> {sale.sale_date.strftime('%Y-%m-%d %H:%M')}</p>
            <p><strong>Cashier:</strong> {sale.cashier.name}</p>
            <hr>
        </div>
        
        <div>
            <table style="width: 100%;">
                <thead>
                    <tr>
                        <th style="text-align: left;">Item</th>
                        <th style="text-align: center;">Qty</th>
                        <th style="text-align: right;">Price</th>
                        <th style="text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
    """
    
    for item in items:
        html += f"""
                    <tr>
                        <td>{item.product.name}</td>
                        <td style="text-align: center;">{item.quantity}</td>
                        <td style="text-align: right;">{item.unit_price:.2f}</td>
                        <td style="text-align: right;">{item.subtotal:.2f}</td>
                    </tr>
        """
    
    html += f"""
                </tbody>
            </table>
            <hr>
        </div>
        
        <div style="text-align: right;">
            <p><strong>Total: KES {sale.total_amount:.2f}</strong></p>
            <p>Payment: {sale.payment_method}</p>
            <p>Status: {sale.payment_status}</p>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
            <hr>
            <p><strong>Thank you for your business!</strong></p>
            <p style="font-size: 12px;">Visit us again!</p>
        </div>
    </div>
    """
    
    return html
