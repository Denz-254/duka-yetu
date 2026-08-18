"""Stripe Checkout, Customer Portal, M-Pesa billing, and subscription entitlement routes."""

from datetime import datetime, timedelta
from decimal import Decimal
from uuid import UUID

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_business, require_owner
from app.core.plans import PLAN_DEFINITIONS, normalize_plan, subscription_is_active
from app.models.business import Business
from app.models.mpesa_transaction import MpesaTransaction
from app.models.resources import Branch
from app.models.user import User
from app.schemas.subscription import (
    CheckoutRequest,
    CheckoutResponse,
    MpesaCheckoutRequest,
    MpesaCheckoutResponse,
    MpesaPaymentStatusResponse,
    PortalResponse,
)
from app.services.mpesa import MpesaError, initiate_stk_push, resolve_platform_credentials

router = APIRouter()

stripe.api_key = settings.STRIPE_SECRET_KEY
stripe.api_version = "2026-06-24.dahlia"

PLAN_PRICES_KES = {
    ("BASIC", "monthly"): lambda: settings.PLAN_BASIC_MONTHLY_KES,
    ("BASIC", "yearly"): lambda: settings.PLAN_BASIC_YEARLY_KES,
    ("PROFESSIONAL", "monthly"): lambda: settings.PLAN_PROFESSIONAL_MONTHLY_KES,
    ("PROFESSIONAL", "yearly"): lambda: settings.PLAN_PROFESSIONAL_YEARLY_KES,
    ("ENTERPRISE", "monthly"): lambda: settings.PLAN_ENTERPRISE_MONTHLY_KES,
    ("ENTERPRISE", "yearly"): lambda: settings.PLAN_ENTERPRISE_YEARLY_KES,
}


def _price_id(plan: str, cycle: str) -> str:
    return getattr(settings, f"STRIPE_{plan}_{cycle.upper()}_PRICE_ID", "")


def _plan_kes(plan: str, cycle: str) -> int:
    getter = PLAN_PRICES_KES.get((plan, cycle))
    if not getter:
        raise HTTPException(status_code=400, detail="Invalid plan or billing cycle")
    amount = int(getter())
    if amount < 1:
        raise HTTPException(status_code=503, detail="Plan price is not configured")
    return amount


def _callback_url() -> str:
    base = (settings.MPESA_CALLBACK_BASE_URL or settings.API_BASE_URL or "").rstrip("/")
    if not base:
        raise HTTPException(
            status_code=503,
            detail="Set MPESA_CALLBACK_BASE_URL so Safaricom can confirm subscription payments.",
        )
    return f"{base}/api/v1/payments/mpesa/callback"


def _activate_subscription(db: Session, business: Business, plan: str, cycle: str) -> None:
    business.package = normalize_plan(plan)
    business.subscription_status = "ACTIVE"
    days = 365 if cycle == "yearly" else 30
    business.subscription_current_period_end = datetime.utcnow() + timedelta(days=days)
    business.trial_ends_at = None
    db.commit()


def activate_subscription_from_payment(db: Session, payment: MpesaTransaction) -> None:
    """Called from M-Pesa callback when a subscription STK succeeds."""
    snap = payment.cart_snapshot or {}
    business = db.query(Business).filter(Business.id == payment.business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found for subscription payment")
    plan = normalize_plan(snap.get("plan"))
    cycle = snap.get("billing_cycle") or "monthly"
    _activate_subscription(db, business, plan, cycle)
    payment.status = "COMPLETED"
    payment.completed_at = datetime.utcnow()
    db.commit()


def _plan_from_subscription(subscription: dict, fallback: str) -> str:
    items = ((subscription.get("items") or {}).get("data") or [])
    subscribed_price = ((items[0].get("price") or {}).get("id")) if items else None
    for plan in PLAN_DEFINITIONS:
        if subscribed_price in {_price_id(plan, "monthly"), _price_id(plan, "yearly")}:
            return plan
    return normalize_plan((subscription.get("metadata") or {}).get("plan") or fallback)


def _require_stripe() -> None:
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe billing is not configured. Pay with M-Pesa instead.",
        )


@router.get("/")
async def get_subscription(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    plan_key = normalize_plan(business.package)
    definition = PLAN_DEFINITIONS[plan_key]
    users = db.query(User).filter(
        User.business_id == business.id,
        User.is_active == True,  # noqa: E712
    ).count()
    branches = db.query(Branch).filter(Branch.business_id == business.id).count()
    return {
        "plan": plan_key,
        "plan_name": definition["name"],
        "status": business.subscription_status,
        "active": subscription_is_active(business),
        "trial_ends_at": business.trial_ends_at,
        "current_period_end": business.subscription_current_period_end,
        "features": sorted(definition["features"]),
        "limits": definition["limits"],
        "usage": {"staff": users, "branches": branches},
        "prices_kes": {
            "BASIC": {"monthly": settings.PLAN_BASIC_MONTHLY_KES, "yearly": settings.PLAN_BASIC_YEARLY_KES},
            "PROFESSIONAL": {
                "monthly": settings.PLAN_PROFESSIONAL_MONTHLY_KES,
                "yearly": settings.PLAN_PROFESSIONAL_YEARLY_KES,
            },
            "ENTERPRISE": {
                "monthly": settings.PLAN_ENTERPRISE_MONTHLY_KES,
                "yearly": settings.PLAN_ENTERPRISE_YEARLY_KES,
            },
        },
        "mpesa_billing_enabled": bool(settings.MPESA_CONSUMER_KEY and settings.MPESA_PASSKEY),
    }


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    payload: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
    business: Business = Depends(get_current_business),
):
    _require_stripe()
    price_id = _price_id(payload.plan, payload.billing_cycle)
    if not price_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"The {payload.plan.title()} {payload.billing_cycle} Stripe price is not configured. Use M-Pesa billing.",
        )

    if not business.stripe_customer_id:
        customer = stripe.Customer.create(
            email=business.email,
            name=business.name,
            metadata={"business_id": str(business.id)},
        )
        business.stripe_customer_id = customer.id
        db.commit()

    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=business.stripe_customer_id,
        line_items=[{"price": price_id, "quantity": 1}],
        client_reference_id=str(business.id),
        metadata={"business_id": str(business.id), "plan": payload.plan},
        subscription_data={
            "metadata": {"business_id": str(business.id), "plan": payload.plan}
        },
        success_url=f"{settings.FRONTEND_URL}/settings/subscription?checkout=success&session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.FRONTEND_URL}/settings/subscription?checkout=cancelled",
    )
    return CheckoutResponse(checkout_url=session.url)


@router.post("/mpesa-checkout", response_model=MpesaCheckoutResponse, status_code=201)
async def mpesa_checkout(
    payload: MpesaCheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
    business: Business = Depends(get_current_business),
):
    """Owner pays platform subscription via STK Push to platform M-Pesa."""
    plan = normalize_plan(payload.plan)
    amount = _plan_kes(plan, payload.billing_cycle)

    try:
        credentials = resolve_platform_credentials()
    except MpesaError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    payment = MpesaTransaction(
        business_id=business.id,
        user_id=current_user.id,
        phone_number=payload.phone_number,
        amount=Decimal(amount),
        account_reference=f"SUB-{plan[:4]}"[:12],
        description=f"{plan} {payload.billing_cycle}",
        status="PENDING",
        source="SUBSCRIPTION",
        cart_snapshot={
            "plan": plan,
            "billing_cycle": payload.billing_cycle,
            "business_id": str(business.id),
            "amount": amount,
        },
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    try:
        result = await initiate_stk_push(
            credentials=credentials,
            phone_number=payload.phone_number,
            amount=amount,
            account_reference=payment.account_reference,
            transaction_desc="Subscription",
            callback_url=_callback_url(),
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

    return MpesaCheckoutResponse(
        payment_id=str(payment.id),
        amount=float(payment.amount),
        plan=plan,
        billing_cycle=payload.billing_cycle,
        status=payment.status,
        customer_message=payment.result_desc or "Check your phone to enter M-Pesa PIN",
    )


@router.get("/mpesa-status/{payment_id}", response_model=MpesaPaymentStatusResponse)
async def mpesa_subscription_status(
    payment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
    business: Business = Depends(get_current_business),
):
    payment = db.query(MpesaTransaction).filter(
        MpesaTransaction.id == payment_id,
        MpesaTransaction.business_id == business.id,
        MpesaTransaction.source == "SUBSCRIPTION",
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    snap = payment.cart_snapshot or {}
    db.refresh(business)
    return MpesaPaymentStatusResponse(
        payment_id=str(payment.id),
        status=payment.status,
        plan=snap.get("plan"),
        billing_cycle=snap.get("billing_cycle"),
        result_desc=payment.result_desc,
        subscription_active=subscription_is_active(business),
    )


@router.post("/portal", response_model=PortalResponse)
async def create_portal(
    current_user: User = Depends(require_owner),
    business: Business = Depends(get_current_business),
):
    _require_stripe()
    if not business.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Stripe billing account exists yet. Pay with M-Pesa or choose Stripe checkout first.",
        )
    session = stripe.billing_portal.Session.create(
        customer=business.stripe_customer_id,
        return_url=f"{settings.FRONTEND_URL}/settings/subscription",
    )
    return PortalResponse(portal_url=session.url)


@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Stripe webhook is not configured.")

    payload = await request.body()
    signature = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(
            payload, signature, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Invalid webhook signature.")

    event_type = event["type"]
    data = event["data"]["object"]
    metadata = data.get("metadata") or {}
    business_id = metadata.get("business_id") or data.get("client_reference_id")

    if event_type == "checkout.session.completed" and business_id:
        business = db.query(Business).filter(Business.id == business_id).first()
        if business:
            business.stripe_customer_id = data.get("customer")
            business.stripe_subscription_id = data.get("subscription")
            business.package = normalize_plan(metadata.get("plan"))
            business.subscription_status = (
                "ACTIVE"
                if data.get("payment_status") in {"paid", "no_payment_required"}
                else "INCOMPLETE"
            )
            db.commit()

    if event_type in {
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
    }:
        business = None
        if business_id:
            business = db.query(Business).filter(Business.id == business_id).first()
        if not business and data.get("id"):
            business = db.query(Business).filter(
                Business.stripe_subscription_id == data.get("id")
            ).first()
        if business:
            stripe_status = (data.get("status") or "").upper()
            business.subscription_status = {
                "ACTIVE": "ACTIVE",
                "TRIALING": "TRIALING",
                "PAST_DUE": "PAST_DUE",
                "UNPAID": "UNPAID",
                "CANCELED": "CANCELED",
            }.get(stripe_status, stripe_status or "INACTIVE")
            business.stripe_subscription_id = data.get("id")
            business.package = _plan_from_subscription(data, business.package)
            period_end = data.get("current_period_end")
            business.subscription_current_period_end = (
                datetime.utcfromtimestamp(period_end) if period_end else None
            )
            db.commit()

    return {"received": True}


@router.get("/invoices")
async def list_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
    business: Business = Depends(get_current_business),
):
    """Billing history from completed M-Pesa subscription payments."""
    rows = (
        db.query(MpesaTransaction)
        .filter(
            MpesaTransaction.business_id == business.id,
            MpesaTransaction.source == "SUBSCRIPTION",
            MpesaTransaction.status == "COMPLETED",
        )
        .order_by(MpesaTransaction.completed_at.desc())
        .limit(50)
        .all()
    )
    items = []
    for pay in rows:
        snap = pay.cart_snapshot or {}
        items.append(
            {
                "id": str(pay.id),
                "date": (pay.completed_at or pay.created_at).isoformat() if (pay.completed_at or pay.created_at) else None,
                "description": f"{snap.get('plan', 'Plan')} · {snap.get('billing_cycle', 'monthly')}",
                "amount": float(pay.amount),
                "status": "PAID",
                "mpesa_receipt": pay.mpesa_receipt_number,
                "payment_method": "MPESA",
            }
        )
    return {"items": items}


@router.get("/invoices/{payment_id}")
async def download_invoice(
    payment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
    business: Business = Depends(get_current_business),
):
    """Download PDF invoice for an M-Pesa subscription payment."""
    from app.utils.invoice_generator import generate_subscription_invoice_pdf, pdf_attachment

    payment = db.query(MpesaTransaction).filter(
        MpesaTransaction.id == payment_id,
        MpesaTransaction.business_id == business.id,
        MpesaTransaction.source == "SUBSCRIPTION",
        MpesaTransaction.status == "COMPLETED",
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return pdf_attachment(
        generate_subscription_invoice_pdf(payment, business),
        f"invoice-{str(payment.id)[:8]}.pdf",
    )


@router.post("/request-invoice")
async def request_latest_invoice(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
    business: Business = Depends(get_current_business),
):
    """Return the latest M-Pesa subscription invoice for download."""
    payment = (
        db.query(MpesaTransaction)
        .filter(
            MpesaTransaction.business_id == business.id,
            MpesaTransaction.source == "SUBSCRIPTION",
            MpesaTransaction.status == "COMPLETED",
        )
        .order_by(MpesaTransaction.completed_at.desc())
        .first()
    )
    if not payment:
        raise HTTPException(
            status_code=404,
            detail="No M-Pesa payments yet. Pay a plan first.",
        )
    return {
        "payment_id": str(payment.id),
        "download_url": f"/api/v1/subscription/invoices/{payment.id}",
        "amount": float(payment.amount),
        "mpesa_receipt": payment.mpesa_receipt_number,
    }
