"""KopoKopo STK Push for customer checkout (sandbox and production)."""

from __future__ import annotations

import hashlib
import hmac
import time
from decimal import Decimal
from typing import Any, Optional

import httpx

from app.core.config import settings
from app.services.mpesa import normalize_phone


class KopokopoError(Exception):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message)
        self.details = details


_token: dict[str, Any] = {"value": "", "expires_at": 0.0}


def kopokopo_ready() -> bool:
    return bool(
        (settings.KOPOKOPO_CLIENT_ID or "").strip()
        and (settings.KOPOKOPO_CLIENT_SECRET or "").strip()
        and (settings.KOPOKOPO_TILL_NUMBER or "").strip()
    )


def _base_url() -> str:
    configured = (settings.KOPOKOPO_BASE_URL or "").strip().rstrip("/")
    if configured:
        return configured
    if (settings.KOPOKOPO_ENVIRONMENT or "").strip().lower() == "production":
        return "https://api.kopokopo.com"
    return "https://sandbox.kopokopo.com"


def callback_url() -> str:
    base = (settings.KOPOKOPO_CALLBACK_BASE_URL or "").strip().rstrip("/")
    if base.startswith("https://"):
        return f"{base}/api/v1/payments/kopokopo/callback"
    # Sandbox still requires an https callback. Local tests read the result by polling.
    return "https://example.com/duka-yetu/kopokopo-callback"


async def access_token() -> str:
    now = time.time()
    if _token["value"] and _token["expires_at"] > now + 30:
        return _token["value"]

    client_id = (settings.KOPOKOPO_CLIENT_ID or "").strip()
    client_secret = (settings.KOPOKOPO_CLIENT_SECRET or "").strip()
    if not client_id or not client_secret:
        raise KopokopoError("Set KOPOKOPO_CLIENT_ID and KOPOKOPO_CLIENT_SECRET")

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{_base_url()}/oauth/token",
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "grant_type": "client_credentials",
            },
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
                "User-Agent": "duka-yetu / 1.0",
            },
        )
    if response.status_code >= 400:
        raise KopokopoError(
            "KopoKopo login failed. Check the client id and secret, and confirm the sandbox email.",
            response.text[:400],
        )
    body = response.json()
    token = body.get("access_token") or ""
    if not token:
        raise KopokopoError("KopoKopo did not return an access token", body)
    expires_in = int(body.get("expires_in") or 3600)
    _token["value"] = token
    _token["expires_at"] = now + expires_in
    return token


def _amount_value(amount: Decimal) -> int | float:
    quantized = Decimal(amount).quantize(Decimal("0.01"))
    if quantized == quantized.to_integral():
        return int(quantized)
    return float(quantized)


async def request_stk(
    *,
    phone: str,
    amount: Decimal,
    first_name: str,
    last_name: str,
    reference: str,
) -> str:
    """Ask KopoKopo to start an STK request. Returns the payment resource URL."""
    till = (settings.KOPOKOPO_TILL_NUMBER or "").strip()
    if not till:
        raise KopokopoError(
            "Set KOPOKOPO_TILL_NUMBER to the online payments account from the KopoKopo Outlets page."
        )
    digits = normalize_phone(phone)
    token = await access_token()
    payload = {
        "payment_channel": "M-PESA STK Push",
        "till_number": till,
        "subscriber": {
            "first_name": (first_name or "Customer")[:50],
            "last_name": (last_name or "Buyer")[:50],
            "phone_number": f"+{digits}",
        },
        "amount": {"currency": "KES", "value": _amount_value(amount)},
        "metadata": {
            "reference": reference[:50],
            "notes": "Duka Yetu POS",
        },
        "_links": {"callback_url": callback_url()},
    }
    async with httpx.AsyncClient(timeout=45.0) as client:
        response = await client.post(
            f"{_base_url()}/api/v2/incoming_payments",
            json=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )
    if response.status_code >= 400:
        detail = response.text[:400]
        raise KopokopoError(f"KopoKopo rejected the payment request. {detail}", detail)
    location = response.headers.get("location") or response.headers.get("Location") or ""
    if not location and response.content:
        body = response.json()
        location = ((body.get("data") or {}).get("attributes") or {}).get("_links", {}).get("self") or ""
        location = location or (body.get("_links") or {}).get("self") or ""
    if not location:
        raise KopokopoError("KopoKopo did not return a payment location", response.text[:400])
    return location


async def fetch_payment(location: str) -> dict:
    token = await access_token()
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            location,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
        )
    if response.status_code >= 400:
        raise KopokopoError("Could not check the KopoKopo payment", response.text[:400])
    return response.json()


def interpret_result(payload: dict) -> dict:
    """Turn a KopoKopo incoming-payment payload into pending, success, or failed."""
    data = payload.get("data") or payload
    attributes = data.get("attributes") or data
    status = str(attributes.get("status") or "").strip().lower()
    event = attributes.get("event") or {}
    resource = event.get("resource") or {}
    errors = event.get("errors") or []
    if isinstance(errors, str):
        errors = [errors]
    receipt = resource.get("reference") if isinstance(resource, dict) else None
    phone = resource.get("sender_phone_number") if isinstance(resource, dict) else None
    if status == "success":
        return {"state": "success", "receipt": receipt, "phone": phone, "message": "Payment received"}
    if status in {"failed", "error"}:
        message = "; ".join(str(item) for item in errors) or "Payment failed"
        return {"state": "failed", "receipt": None, "phone": phone, "message": message}
    return {"state": "pending", "receipt": None, "phone": phone, "message": "Waiting for KopoKopo"}


def signature_is_valid(raw_body: bytes, signature: str) -> bool:
    """Accept the HMAC KopoKopo sends in X-KopoKopo-Signature."""
    provided = (signature or "").strip().lower()
    if not provided:
        return False
    keys = [
        (settings.KOPOKOPO_API_KEY or "").strip(),
        (settings.KOPOKOPO_CLIENT_SECRET or "").strip(),
    ]
    for key in keys:
        if not key:
            continue
        digest = hmac.new(key.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
        if hmac.compare_digest(digest, provided):
            return True
    return False
