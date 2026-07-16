"""Sales routes for Duka Yetu."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, desc
from typing import Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_cashier_user
from app.models.user import User
from app.models.product import Product
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.schemas.sale import (
    SaleCreate,
    SaleResponse,
    SaleListResponse,
    SaleReceiptResponse,
    SaleItemResponse,
)
from app.utils.receipt_generator import generate_receipt_html

router = APIRouter()

@router.post("/", response_model=SaleReceiptResponse, status_code=status.HTTP_201_CREATED)
async def create_sale(
    sale_data: SaleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_cashier_user),
):
    """
    Create a new sale (POS transaction).
    
    Only CASHIER and above can create sales.
    """
    # Validate products and calculate total
    items_data = []
    total_amount = Decimal('0.00')
    products_to_update = []
    
    for item in sale_data.items:
        # Get product
        product = db.query(Product).filter(
            Product.id == item.product_id,
            Product.business_id == current_user.business_id,
            Product.is_active == True
        ).first()
        
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {item.product_id} not found"
            )
        
        # Check stock
        if product.stock_quantity < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for product: {product.name}. Available: {product.stock_quantity}"
            )
        
        # Calculate subtotal
        subtotal = product.selling_price * item.quantity
        total_amount += subtotal
        
        items_data.append({
            "product": product,
            "quantity": item.quantity,
            "unit_price": product.selling_price,
            "subtotal": subtotal
        })
        products_to_update.append(product)
    
    # Generate receipt number
    receipt_number = f"REC-{datetime.now().strftime('%Y%m%d')}-{str(UUID(int=1))[:8]}"
    
    # Create sale
    sale = Sale(
        business_id=current_user.business_id,
        user_id=current_user.id,
        receipt_number=receipt_number,
        total_amount=total_amount,
        payment_method=sale_data.payment_method,
        payment_status="PAID",
        sale_date=datetime.utcnow(),
    )
    db.add(sale)
    db.flush()  # Get sale ID
    
    # Create sale items and update stock
    sale_items = []
    for item_data in items_data:
        sale_item = SaleItem(
            sale_id=sale.id,
            product_id=item_data["product"].id,
            quantity=item_data["quantity"],
            unit_price=item_data["unit_price"],
            subtotal=item_data["subtotal"],
        )
        db.add(sale_item)
        sale_items.append(sale_item)
        
        # Decrement stock
        item_data["product"].stock_quantity -= item_data["quantity"]
    
    db.commit()
    db.refresh(sale)
    
    # Build response items
    response_items = []
    for item in sale_items:
        response_items.append(
            SaleItemResponse(
                id=str(item.id),
                product_id=str(item.product_id),
                product_name=item.product.name,
                sku=item.product.sku,
                quantity=item.quantity,
                unit_price=item.unit_price,
                subtotal=item.subtotal,
            )
        )
    
    # Generate receipt
    receipt_html = generate_receipt_html(sale, db)
    
    return SaleReceiptResponse(
        id=str(sale.id),
        receipt_number=sale.receipt_number,
        cashier_name=current_user.name,
        cashier_id=str(current_user.id),
        items=response_items,
        total_amount=sale.total_amount,
        payment_method=sale.payment_method,
        payment_status=sale.payment_status,
        sale_date=sale.sale_date,
        receipt_html=receipt_html,
    )

@router.get("/", response_model=SaleListResponse)
async def list_sales(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    """
    List sales for the current business.
    
    Owner sees all sales, Cashier sees only their own sales.
    """
    # Base query
    query = db.query(Sale).filter(
        Sale.business_id == current_user.business_id
    )
    
    # Cashier sees only their own sales
    if current_user.role == "CASHIER":
        query = query.filter(Sale.user_id == current_user.id)
    
    # Date filters
    if start_date:
        query = query.filter(Sale.sale_date >= start_date)
    if end_date:
        query = query.filter(Sale.sale_date <= end_date)
    
    # Get total count
    total = query.count()
    
    # Order by newest first
    query = query.order_by(desc(Sale.sale_date))
    
    # Pagination
    sales = query.offset(skip).limit(limit).all()
    
    # Build response items
    response_items = []
    for sale in sales:
        # Get cashier name
        cashier = db.query(User).filter(User.id == sale.user_id).first()
        
        # Get sale items
        sale_items = db.query(SaleItem).filter(SaleItem.sale_id == sale.id).all()
        
        response_items.append(
            SaleResponse(
                id=str(sale.id),
                receipt_number=sale.receipt_number,
                cashier_name=cashier.name if cashier else "Unknown",
                cashier_id=str(sale.user_id),
                items=[
                    SaleItemResponse(
                        id=str(item.id),
                        product_id=str(item.product_id),
                        product_name=item.product.name,
                        sku=item.product.sku,
                        quantity=item.quantity,
                        unit_price=item.unit_price,
                        subtotal=item.subtotal,
                    )
                    for item in sale_items
                ],
                total_amount=sale.total_amount,
                payment_method=sale.payment_method,
                payment_status=sale.payment_status,
                sale_date=sale.sale_date,
            )
        )
    
    return SaleListResponse(
        items=response_items,
        total=total,
        page=skip // limit + 1 if limit > 0 else 1,
        pages=(total + limit - 1) // limit if limit > 0 else 1,
        per_page=limit,
    )

@router.get("/{sale_id}", response_model=SaleResponse)
async def get_sale(
    sale_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a single sale by ID.
    """
    sale = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.business_id == current_user.business_id
    ).first()
    
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found"
        )
    
    # Cashier can only view their own sales
    if current_user.role == "CASHIER" and sale.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own sales"
        )
    
    # Get cashier name
    cashier = db.query(User).filter(User.id == sale.user_id).first()
    
    # Get sale items
    sale_items = db.query(SaleItem).filter(SaleItem.sale_id == sale.id).all()
    
    return SaleResponse(
        id=str(sale.id),
        receipt_number=sale.receipt_number,
        cashier_name=cashier.name if cashier else "Unknown",
        cashier_id=str(sale.user_id),
        items=[
            SaleItemResponse(
                id=str(item.id),
                product_id=str(item.product_id),
                product_name=item.product.name,
                sku=item.product.sku,
                quantity=item.quantity,
                unit_price=item.unit_price,
                subtotal=item.subtotal,
            )
            for item in sale_items
        ],
        total_amount=sale.total_amount,
        payment_method=sale.payment_method,
        payment_status=sale.payment_status,
        sale_date=sale.sale_date,
    )

@router.get("/{sale_id}/receipt", response_model=SaleReceiptResponse)
async def get_sale_receipt(
    sale_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get receipt for a sale.
    """
    sale = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.business_id == current_user.business_id
    ).first()
    
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found"
        )
    
    # Cashier can only view their own receipts
    if current_user.role == "CASHIER" and sale.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own receipts"
        )
    
    # Get cashier name
    cashier = db.query(User).filter(User.id == sale.user_id).first()
    
    # Get sale items
    sale_items = db.query(SaleItem).filter(SaleItem.sale_id == sale.id).all()
    
    receipt_html = generate_receipt_html(sale, db)
    
    return SaleReceiptResponse(
        id=str(sale.id),
        receipt_number=sale.receipt_number,
        cashier_name=cashier.name if cashier else "Unknown",
        cashier_id=str(sale.user_id),
        items=[
            SaleItemResponse(
                id=str(item.id),
                product_id=str(item.product_id),
                product_name=item.product.name,
                sku=item.product.sku,
                quantity=item.quantity,
                unit_price=item.unit_price,
                subtotal=item.subtotal,
            )
            for item in sale_items
        ],
        total_amount=sale.total_amount,
        payment_method=sale.payment_method,
        payment_status=sale.payment_status,
        sale_date=sale.sale_date,
        receipt_html=receipt_html,
    )
