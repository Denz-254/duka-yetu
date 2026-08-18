"""Product routes for Duka Yetu."""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_owner
from app.models.user import User
from app.models.product import Product
from app.models.resources import Category
from app.models.mpesa_transaction import MpesaTransaction
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductListResponse,
)
from app.services.mpesa import MpesaError, initiate_stk_push, resolve_platform_credentials

router = APIRouter()


class FeatureProductRequest(BaseModel):
    phone_number: str = Field(..., min_length=9, max_length=30)
    badge_text: Optional[str] = Field(None, max_length=50)


class FeatureProductResponse(BaseModel):
    payment_id: str
    product_id: str
    amount: float
    status: str
    customer_message: str
    days: int


def _validate_category(db: Session, business_id, category_id: Optional[str]):
    if not category_id:
        return None
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.business_id == business_id,
        Category.is_active == True,  # noqa: E712
    ).first()
    if not category:
        raise HTTPException(status_code=400, detail="Category not found for this business")
    return category.id


def _product_response(product: Product) -> ProductResponse:
    data = ProductResponse.model_validate(product)
    data.category_name = product.category.name if product.category else None
    if product.category_id:
        data.category_id = str(product.category_id)
    data.is_featured = bool(getattr(product, "is_featured", False))
    data.featured_until = getattr(product, "featured_until", None)
    data.featured_badge = getattr(product, "featured_badge", None)
    data.listed_on_marketplace = bool(getattr(product, "listed_on_marketplace", False))
    data.is_deal_of_day = bool(getattr(product, "is_deal_of_day", False))
    data.deal_of_day_until = getattr(product, "deal_of_day_until", None)
    return data


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    existing_product = db.query(Product).filter(
        Product.business_id == current_user.business_id,
        Product.sku == product_data.sku
    ).first()

    if existing_product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with SKU '{product_data.sku}' already exists"
        )

    product = Product(
        business_id=current_user.business_id,
        category_id=_validate_category(db, current_user.business_id, product_data.category_id),
        name=product_data.name,
        sku=product_data.sku,
        selling_price=product_data.selling_price,
        cost_price=product_data.cost_price,
        stock_quantity=product_data.stock_quantity,
        description=product_data.description,
        image_url=product_data.image_url,
        is_active=True,
        listed_on_marketplace=bool(product_data.listed_on_marketplace),
    )

    db.add(product)
    db.commit()
    db.refresh(product)

    return _product_response(product)


@router.get("/", response_model=ProductListResponse)
async def list_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    search: Optional[str] = Query(None, min_length=1),
    category_id: Optional[str] = Query(None),
):
    query = db.query(Product).filter(
        Product.business_id == current_user.business_id,
        Product.is_active == True  # noqa: E712
    )

    if search:
        query = query.filter(
            or_(
                Product.name.ilike(f"%{search}%"),
                Product.sku.ilike(f"%{search}%"),
                Product.description.ilike(f"%{search}%")
            )
        )

    if category_id:
        query = query.filter(Product.category_id == category_id)

    total = query.count()
    products = query.offset(skip).limit(limit).all()

    return ProductListResponse(
        items=[_product_response(p) for p in products],
        total=total,
        page=skip // limit + 1 if limit > 0 else 1,
        pages=(total + limit - 1) // limit if limit > 0 else 1,
        per_page=limit,
    )


@router.get("/alerts/low-stock", response_model=list[ProductResponse])
async def get_low_stock_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    threshold = 10
    products = db.query(Product).filter(
        Product.business_id == current_user.business_id,
        Product.is_active == True,  # noqa: E712
        Product.stock_quantity < threshold
    ).all()
    return [_product_response(p) for p in products]


class MarketplaceListingRequest(BaseModel):
    product_ids: list[str] = Field(..., min_length=1)
    listed: bool = True


@router.post("/marketplace-listing", response_model=ProductListResponse)
async def bulk_marketplace_listing(
    payload: MarketplaceListingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    """Owner selects which inventory items appear on DukaMall."""
    ids = []
    for value in payload.product_ids:
        try:
            ids.append(UUID(str(value)))
        except ValueError:
            continue
    if not ids:
        raise HTTPException(status_code=400, detail="Invalid product ids")
    products = db.query(Product).filter(
        Product.business_id == current_user.business_id,
        Product.id.in_(ids),
        Product.is_active == True,  # noqa: E712
    ).all()
    if not products:
        raise HTTPException(status_code=404, detail="No matching products")
    for product in products:
        product.listed_on_marketplace = payload.listed
        if not payload.listed:
            product.is_deal_of_day = False
            product.deal_of_day_until = None
    db.commit()
    refreshed = db.query(Product).filter(
        Product.business_id == current_user.business_id,
        Product.is_active == True,  # noqa: E712
    ).all()
    return ProductListResponse(
        items=[_product_response(p) for p in refreshed],
        total=len(refreshed),
        page=1,
        pages=1,
        per_page=len(refreshed) or 1,
    )


@router.post("/{product_id}/feature", response_model=FeatureProductResponse, status_code=201)
async def feature_product(
    product_id: UUID,
    payload: FeatureProductRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    """Pay a platform fee via M-Pesa to feature a product on the store hero."""
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.business_id == current_user.business_id,
        Product.is_active == True,  # noqa: E712
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    fee = int(settings.FEATURE_PRODUCT_FEE_KES)
    days = int(settings.FEATURE_PRODUCT_DAYS)
    if fee < 1:
        raise HTTPException(status_code=503, detail="Feature fee is not configured")

    try:
        credentials = resolve_platform_credentials()
    except MpesaError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    payment = MpesaTransaction(
        business_id=current_user.business_id,
        user_id=current_user.id,
        phone_number=payload.phone_number,
        amount=Decimal(fee),
        account_reference=f"FT-{str(product.id)[:8]}"[:12],
        description="Feature product",
        status="PENDING",
        source="FEATURE",
        cart_snapshot={
            "product_id": str(product.id),
            "badge_text": (payload.badge_text or "Featured").strip()[:50],
            "days": days,
            "amount": fee,
        },
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    base = (settings.MPESA_CALLBACK_BASE_URL or settings.API_BASE_URL or "").rstrip("/")
    if not base:
        raise HTTPException(status_code=500, detail="MPESA_CALLBACK_BASE_URL is not configured")

    try:
        result = await initiate_stk_push(
            credentials=credentials,
            phone_number=payload.phone_number,
            amount=fee,
            account_reference=payment.account_reference,
            transaction_desc="Feature Product",
            callback_url=f"{base}/api/v1/payments/mpesa/callback",
        )
    except MpesaError as exc:
        payment.status = "FAILED"
        payment.result_desc = str(exc)
        db.commit()
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    payment.phone_number = result["phone_number"]
    payment.merchant_request_id = result.get("merchant_request_id")
    payment.checkout_request_id = result.get("checkout_request_id")
    payment.result_desc = result.get("customer_message")
    db.commit()

    return FeatureProductResponse(
        payment_id=str(payment.id),
        product_id=str(product.id),
        amount=float(fee),
        status=payment.status,
        customer_message=payment.result_desc or "Check your phone to enter M-Pesa PIN",
        days=days,
    )


@router.get("/{product_id}/feature-status/{payment_id}")
async def feature_payment_status(
    product_id: UUID,
    payment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    payment = db.query(MpesaTransaction).filter(
        MpesaTransaction.id == payment_id,
        MpesaTransaction.business_id == current_user.business_id,
        MpesaTransaction.source == "FEATURE",
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.business_id == current_user.business_id,
    ).first()
    return {
        "payment_id": str(payment.id),
        "status": payment.status,
        "result_desc": payment.result_desc,
        "is_featured": bool(product and product.is_featured),
        "featured_until": product.featured_until if product else None,
    }


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.business_id == current_user.business_id
    ).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    return _product_response(product)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.business_id == current_user.business_id
    ).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    update_data = product_data.dict(exclude_unset=True)
    if "category_id" in update_data:
        update_data["category_id"] = _validate_category(
            db, current_user.business_id, update_data.get("category_id")
        )
    for field, value in update_data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)

    return _product_response(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.business_id == current_user.business_id
    ).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    product.is_active = False
    db.commit()
    return None
