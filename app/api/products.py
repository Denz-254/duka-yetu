"""Product routes for Duka Yetu."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from uuid import UUID

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_owner
from app.models.user import User
from app.models.product import Product
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductListResponse,
)

router = APIRouter()

@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    """
    Create a new product.
    
    Only OWNER can create products.
    """
    # Check if product with same SKU exists for this business
    existing_product = db.query(Product).filter(
        Product.business_id == current_user.business_id,
        Product.sku == product_data.sku
    ).first()
    
    if existing_product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with SKU '{product_data.sku}' already exists"
        )
    
    # Create product - NOW INCLUDING image_url
    product = Product(
        business_id=current_user.business_id,
        name=product_data.name,
        sku=product_data.sku,
        selling_price=product_data.selling_price,
        cost_price=product_data.cost_price,
        stock_quantity=product_data.stock_quantity,
        description=product_data.description,
        image_url=product_data.image_url,  # ← THIS WAS MISSING!
        is_active=True,
    )
    
    db.add(product)
    db.commit()
    db.refresh(product)
    
    return product

@router.get("/", response_model=ProductListResponse)
async def list_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, min_length=1),
):
    """
    List all products for the current business.
    
    Both OWNER and CASHIER can view products.
    """
    # Base query
    query = db.query(Product).filter(
        Product.business_id == current_user.business_id,
        Product.is_active == True
    )
    
    # Search filter
    if search:
        query = query.filter(
            or_(
                Product.name.ilike(f"%{search}%"),
                Product.sku.ilike(f"%{search}%"),
                Product.description.ilike(f"%{search}%")
            )
        )
    
    # Get total count
    total = query.count()
    
    # Pagination
    products = query.offset(skip).limit(limit).all()
    
    return ProductListResponse(
        items=products,
        total=total,
        page=skip // limit + 1 if limit > 0 else 1,
        pages=(total + limit - 1) // limit if limit > 0 else 1,
        per_page=limit,
    )

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a single product by ID.
    """
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.business_id == current_user.business_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return product

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    """
    Update a product.
    
    Only OWNER can update products.
    """
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.business_id == current_user.business_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Update fields
    update_data = product_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)
    
    db.commit()
    db.refresh(product)
    
    return product

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    """
    Delete a product (soft delete).
    
    Only OWNER can delete products.
    """
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.business_id == current_user.business_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Soft delete
    product.is_active = False
    db.commit()
    
    return None

@router.get("/alerts/low-stock", response_model=list[ProductResponse])
async def get_low_stock_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    """
    Get products with low stock.
    
    Only OWNER can view low stock alerts.
    """
    threshold = 10  # Default threshold
    products = db.query(Product).filter(
        Product.business_id == current_user.business_id,
        Product.is_active == True,
        Product.stock_quantity < threshold
    ).all()
    
    return products
