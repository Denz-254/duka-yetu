"""M-Pesa payment routes for POS STK Push."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, List, Optional, Tuple, Union
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_business, get_pos_user, require_feature
from app.models.business import Business
from app.models.mpesa_transaction import MpesaTransaction
from app.models.online_order import Notification, OnlineOrder
from app.models.product import Product
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.models.user import User
from app.schemas.mpesa import StkPushRequest, StkPushResponse, StkStatusResponse
from app.schemas.sale import SaleItemResponse, SaleReceiptResponse
from app.services.mpesa import MpesaError, initiate_stk_push, parse_stk_callback, resolve_credentials
from app.utils.receipt_generator import generate_receipt_html
from app.api.sales import generate_receipt_number

router = APIRouter()


def _money(value: Union[Decimal, float, int, str]) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _callback_url() -> str:
    base = (settings.MPESA_CALLBACK_BASE_URL or settings.API_BASE_URL or "").rstrip("/")
    if not base:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Set MPESA_CALLBACK_BASE_URL (public URL) so Safaricom can reach the callback.",
        )
    return f"{base}/api/v1/payments/mpesa/callback"


def _validate_cart(db: Session, business_id: UUID, items: list) -> Tuple[List[dict], Decimal]:
    cart: List[dict] = []
    total = Decimal("0.00")
    for item in items:
        product = db.query(Product).filter(
            Product.id == item.product_id,
            Product.business_id == business_id,
            Product.is_active == True,  # noqa: E712
        ).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        if product.stock_quantity < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product.name}. Available: {product.stock_quantity}",
            )
        unit_price = _money(product.selling_price)
        subtotal = _money(unit_price * item.quantity)
        total += subtotal
        cart.append(
            {
                "product_id": str(product.id),
                "name": product.name,
                "sku": product.sku,
                "quantity": item.quantity,
                "unit_price": str(unit_price),
                "subtotal": str(subtotal),
            }
        )
    return cart, _money(total)


def _complete_sale_from_payment(
    db: Session,
    payment: MpesaTransaction,
    cashier: Optional[User] = None,
) -> Sale:
    if payment.sale_id:
        existing = db.query(Sale).filter(Sale.id == payment.sale_id).first()
        if existing:
            return existing

    cart = payment.cart_snapshot or {}
    items = cart.get("items") or []
    if not items:
        raise HTTPException(status_code=400, detail="Payment cart snapshot is empty")

    user_id = payment.user_id
    if cashier:
        user_id = cashier.id
    if not user_id:
        raise HTTPException(status_code=400, detail="Missing cashier for this payment")

    sale = Sale(
        business_id=payment.business_id,
        user_id=user_id,
        receipt_number=generate_receipt_number(),
        total_amount=_money(payment.amount),
        payment_method="MPESA",
        payment_status="PAID",
        sale_date=datetime.utcnow(),
    )
    db.add(sale)
    db.flush()

    for item in items:
        product = db.query(Product).filter(
            Product.id == item["product_id"],
            Product.business_id == payment.business_id,
            Product.is_active == True,  # noqa: E712
        ).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.get('name')} no longer available")
        qty = int(item["quantity"])
        if product.stock_quantity < qty:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product.name} after payment. Contact support.",
            )
        unit_price = _money(item["unit_price"])
        subtotal = _money(item["subtotal"])
        db.add(
            SaleItem(
                sale_id=sale.id,
                product_id=product.id,
                quantity=qty,
                unit_price=unit_price,
                subtotal=subtotal,
            )
        )
        product.stock_quantity -= qty

    payment.sale_id = sale.id
    payment.status = "COMPLETED"
    payment.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(sale)
    return sale


def _sale_receipt_response(db: Session, sale: Sale, cashier: User) -> SaleReceiptResponse:
    sale_items = db.query(SaleItem).filter(SaleItem.sale_id == sale.id).all()
    response_items = [
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
    ]
    return SaleReceiptResponse(
        id=str(sale.id),
        receipt_number=sale.receipt_number,
        cashier_name=cashier.name if cashier else "Unknown",
        cashier_id=str(sale.user_id),
        items=response_items,
        total_amount=sale.total_amount,
        payment_method=sale.payment_method,
        payment_status=sale.payment_status,
        sale_date=sale.sale_date,
        receipt_html=generate_receipt_html(sale, db),
    )


@router.post("/mpesa/stk-push", response_model=StkPushResponse, status_code=201)
async def stk_push(
    payload: StkPushRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_pos_user),
    business: Business = Depends(get_current_business),
    _access: Business = Depends(require_feature("pos")),
):
    """Start an M-Pesa STK Push for the current POS cart."""
    payment_settings = (business.settings or {}).get("payment") or {}
    if payment_settings.get("mpesa_enabled") is False:
        raise HTTPException(status_code=400, detail="M-Pesa is disabled for this business")

    try:
        credentials = resolve_credentials(business.settings or {})
    except MpesaError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    cart_items, total = _validate_cart(db, business.id, payload.items)
    amount_int = int(total.to_integral_value(rounding=ROUND_HALF_UP))
    if amount_int < 1:
        raise HTTPException(status_code=400, detail="Sale total must be at least KES 1")

    payment = MpesaTransaction(
        business_id=business.id,
        user_id=current_user.id,
        phone_number=payload.phone_number,
        amount=total,
        account_reference=business.name[:12] or "DukaYetu",
        description="POS Payment",
        status="PENDING",
        source="POS",
        cart_snapshot={"items": cart_items},
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    try:
        result = await initiate_stk_push(
            credentials=credentials,
            phone_number=payload.phone_number,
            amount=amount_int,
            account_reference=payment.account_reference,
            transaction_desc="POS Payment",
            callback_url=_callback_url(),
        )
    except MpesaError as exc:
        payment.status = "FAILED"
        payment.result_desc = str(exc)
        payment.callback_payload = {"error": str(exc), "details": getattr(exc, "details", None)}
        db.commit()
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    payment.phone_number = result["phone_number"]
    payment.merchant_request_id = result.get("merchant_request_id")
    payment.checkout_request_id = result.get("checkout_request_id")
    payment.result_desc = result.get("customer_message") or result.get("response_description")
    db.commit()

    return StkPushResponse(
        payment_id=str(payment.id),
        checkout_request_id=payment.checkout_request_id,
        merchant_request_id=payment.merchant_request_id,
        phone_number=payment.phone_number,
        amount=payment.amount,
        status=payment.status,
        customer_message=payment.result_desc or "Check your phone to enter M-Pesa PIN",
    )


@router.get("/mpesa/{payment_id}", response_model=StkStatusResponse)
async def stk_status(
    payment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_pos_user),
    _access: Business = Depends(require_feature("pos")),
):
    payment = db.query(MpesaTransaction).filter(
        MpesaTransaction.id == payment_id,
        MpesaTransaction.business_id == current_user.business_id,
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    sale_response = None
    if payment.status == "COMPLETED" and payment.sale_id:
        sale = db.query(Sale).filter(Sale.id == payment.sale_id).first()
        if sale:
            sale_response = _sale_receipt_response(db, sale, current_user)

    return StkStatusResponse(
        payment_id=str(payment.id),
        status=payment.status,
        phone_number=payment.phone_number,
        amount=payment.amount,
        result_desc=payment.result_desc,
        mpesa_receipt_number=payment.mpesa_receipt_number,
        sale=sale_response,
        created_at=payment.created_at,
        completed_at=payment.completed_at,
    )


@router.post("/mpesa/callback")
async def mpesa_callback(request: Request, db: Session = Depends(get_db)):
    """Public Safaricom callback endpoint (no JWT)."""
    body = await request.json()
    parsed = parse_stk_callback(body)

    checkout_id = parsed.get("checkout_request_id")
    if not checkout_id:
        return {"ResultCode": 0, "ResultDesc": "Accepted"}

    payment = db.query(MpesaTransaction).filter(
        MpesaTransaction.checkout_request_id == checkout_id
    ).first()
    if not payment:
        return {"ResultCode": 0, "ResultDesc": "Accepted"}

    # Idempotent: already finalized
    if payment.status in {"COMPLETED", "FAILED"}:
        return {"ResultCode": 0, "ResultDesc": "Accepted"}

    payment.callback_payload = parsed.get("raw") or body
    payment.result_code = parsed.get("result_code")
    payment.result_desc = parsed.get("result_desc")
    payment.merchant_request_id = parsed.get("merchant_request_id") or payment.merchant_request_id

    if parsed.get("success"):
        if parsed.get("mpesa_receipt_number"):
            payment.mpesa_receipt_number = str(parsed["mpesa_receipt_number"])
        if parsed.get("phone_number"):
            payment.phone_number = str(parsed["phone_number"])
        try:
            if payment.source == "MARKETPLACE":
                _complete_marketplace_order(db, payment)
            else:
                _complete_sale_from_payment(db, payment)
        except Exception as exc:  # noqa: BLE001
            payment.status = "FAILED"
            payment.result_desc = f"Paid but fulfillment failed: {exc}"
            payment.completed_at = datetime.utcnow()
            db.commit()
    else:
        payment.status = "FAILED"
        payment.completed_at = datetime.utcnow()
        if payment.source == "MARKETPLACE":
            order_id = (payment.cart_snapshot or {}).get("order_id")
            if order_id:
                order = db.query(OnlineOrder).filter(OnlineOrder.id == order_id).first()
                if order and order.payment_status == "PENDING":
                    order.payment_status = "FAILED"
        db.commit()

    return {"ResultCode": 0, "ResultDesc": "Accepted"}


def _complete_marketplace_order(db: Session, payment: MpesaTransaction) -> OnlineOrder:
    order_id = (payment.cart_snapshot or {}).get("order_id")
    if not order_id:
        raise HTTPException(status_code=400, detail="Missing marketplace order reference")

    order = db.query(OnlineOrder).filter(OnlineOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Online order not found")

    if order.payment_status == "PAID":
        payment.status = "COMPLETED"
        payment.completed_at = datetime.utcnow()
        db.commit()
        return order

    for item in order.items or []:
        product = db.query(Product).filter(
            Product.id == item["product_id"],
            Product.business_id == order.business_id,
        ).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.get('name')} missing")
        qty = int(item["quantity"])
        if product.stock_quantity < qty:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name}")
        product.stock_quantity -= qty

    order.payment_status = "PAID"
    order.fulfillment_status = "PROCESSING"
    order.paid_at = datetime.utcnow()
    order.mpesa_receipt_number = payment.mpesa_receipt_number
    order.mpesa_checkout_request_id = payment.checkout_request_id

    payment.status = "COMPLETED"
    payment.completed_at = datetime.utcnow()

    business = db.query(Business).filter(Business.id == order.business_id).first()
    business_name = business.name if business else "Seller"

    db.add(
        Notification(
            audience="BUSINESS",
            business_id=order.business_id,
            title="New online order paid",
            message=f"Order {order.order_number} paid via M-Pesa. Prepare for delivery.",
            type="ORDER",
            data={"order_id": str(order.id), "order_number": order.order_number},
            is_read=0,
        )
    )
    db.add(
        Notification(
            audience="SUPER_ADMIN",
            business_id=order.business_id,
            title="Marketplace commission earned",
            message=(
                f"Order {order.order_number} from {business_name}: "
                f"KES {order.total_amount} (commission KES {order.commission_amount})"
            ),
            type="COMMISSION",
            data={
                "order_id": str(order.id),
                "order_number": order.order_number,
                "commission_amount": str(order.commission_amount),
                "total_amount": str(order.total_amount),
            },
            is_read=0,
        )
    )
    db.commit()
    db.refresh(order)
    return order
