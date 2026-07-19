"""Stripe Checkout, Customer Portal, and subscription entitlement routes."""

from datetime import datetime

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_business, require_owner
from app.core.plans import PLAN_DEFINITIONS, normalize_plan, subscription_is_active
from app.models.business import Business
from app.models.resources import Branch
from app.models.user import User
from app.schemas.subscription import CheckoutRequest, CheckoutResponse, PortalResponse

router = APIRouter()

stripe.api_key = settings.STRIPE_SECRET_KEY
stripe.api_version = "2026-06-24.dahlia"


def _price_id(plan: str, cycle: str) -> str:
    return getattr(settings, f"STRIPE_{plan}_{cycle.upper()}_PRICE_ID", "")


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
            detail="Subscription billing is not configured.",
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
        User.is_active == True,
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
            detail=f"The {payload.plan.title()} {payload.billing_cycle} price is not configured.",
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


@router.post("/portal", response_model=PortalResponse)
async def create_portal(
    current_user: User = Depends(require_owner),
    business: Business = Depends(get_current_business),
):
    _require_stripe()
    if not business.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No billing account exists yet. Choose a plan first.",
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
