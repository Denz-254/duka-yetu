"""Transactional email via Resend (orders, delivery). Falls back to log if unset."""

from __future__ import annotations

import logging
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_email(
    to: str,
    subject: str,
    html: str,
    text: Optional[str] = None,
) -> bool:
    """Send one email. Returns True on success or if email is skipped (no key / no recipient)."""
    recipient = (to or "").strip()
    if not recipient:
        return False

    if not settings.RESEND_API_KEY:
        logger.info("Email skipped (RESEND_API_KEY unset): to=%s subject=%s", recipient, subject)
        return False

    payload = {
        "from": settings.RESEND_FROM_EMAIL,
        "to": [recipient],
        "subject": subject,
        "html": html,
    }
    if text:
        payload["text"] = text

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
        if response.status_code >= 400:
            logger.warning("Resend error %s: %s", response.status_code, response.text[:300])
            return False
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to send email: %s", exc)
        return False


def _items_rows(items: list) -> str:
    rows = ""
    for item in items or []:
        name = item.get("name") or "Item"
        qty = item.get("quantity") or 1
        sub = item.get("subtotal") or item.get("unit_price") or "0"
        rows += f"<tr><td style='padding:6px 0'>{name}</td><td>{qty}</td><td>KES {sub}</td></tr>"
    return rows


async def send_order_paid_emails(order, business) -> None:
    """Notify buyer and seller when marketplace order is paid."""
    items_html = _items_rows(order.items or [])
    total = order.total_amount
    order_no = order.order_number
    shop = business.name if business else "Seller"

    customer_html = f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
      <h2>Order confirmed</h2>
      <p>Hi {order.customer_name},</p>
      <p>We received your payment for order <strong>{order_no}</strong> from {shop}.</p>
      <table style="width:100%;border-collapse:collapse">{items_html}</table>
      <p><strong>Total: KES {total}</strong></p>
      <p>M-Pesa receipt: {order.mpesa_receipt_number or "—"}</p>
      <p>Thank you for shopping on DukaMall.</p>
    </div>
    """
    if order.customer_email:
        await send_email(
            order.customer_email,
            f"Order {order_no} confirmed",
            customer_html,
        )

    seller_email = business.email if business else None
    seller_html = f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
      <h2>New paid order</h2>
      <p>Order <strong>{order_no}</strong> has been paid.</p>
      <p>Customer: {order.customer_name} · {order.customer_phone}</p>
      <table style="width:100%;border-collapse:collapse">{items_html}</table>
      <p><strong>Total: KES {total}</strong> · Your payout: KES {order.business_payout}</p>
      <p>Please prepare the order for delivery.</p>
    </div>
    """
    if seller_email:
        await send_email(seller_email, f"New order {order_no}", seller_html)

    platform = (settings.PLATFORM_NOTIFY_EMAIL or settings.SUPER_ADMIN_EMAIL or "").strip()
    if platform:
        await send_email(
            platform,
            f"Marketplace order {order_no}",
            f"<p>Order {order_no} paid. Commission KES {order.commission_amount}.</p>",
        )


async def send_order_delivered_emails(order, business) -> None:
    """Notify buyer and seller when order is marked delivered."""
    shop = business.name if business else "Seller"
    if order.customer_email:
        await send_email(
            order.customer_email,
            f"Order {order.order_number} delivered",
            f"""
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
              <h2>Order delivered</h2>
              <p>Hi {order.customer_name},</p>
              <p>Your order <strong>{order.order_number}</strong> from {shop} has been marked delivered.</p>
              <p>Total paid: KES {order.total_amount}</p>
            </div>
            """,
        )
    if business and business.email:
        await send_email(
            business.email,
            f"Order {order.order_number} marked delivered",
            f"""
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
              <h2>Delivery confirmed</h2>
              <p>You marked order <strong>{order.order_number}</strong> as delivered.</p>
              <p>Customer: {order.customer_name} · {order.customer_phone}</p>
            </div>
            """,
        )
