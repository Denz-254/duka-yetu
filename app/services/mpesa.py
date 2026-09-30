"""Safaricom Daraja M-Pesa STK Push helpers (sandbox + production)."""

from __future__ import annotations

import base64
import re
from datetime import datetime
from typing import Any, Optional

import httpx

from app.core.config import settings


class MpesaError(Exception):
    """Raised when a Daraja API call fails."""

    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message)
        self.details = details


def normalize_phone(phone: str) -> str:
    """Normalize Kenyan phone numbers to 2547XXXXXXXX."""
    digits = re.sub(r"\D", "", phone or "")
    if digits.startswith("0") and len(digits) == 10:
        digits = "254" + digits[1:]
    elif digits.startswith("7") and len(digits) == 9:
        digits = "254" + digits
    elif digits.startswith("254") and len(digits) == 12:
        pass
    else:
        raise MpesaError("Enter a valid Kenyan phone number, e.g. 07XXXXXXXX or 2547XXXXXXXX")
    if not digits.startswith("2547") and not digits.startswith("2541"):
        raise MpesaError("M-Pesa phone number must be a Safaricom number (07... or 01...)")
    return digits


def display_phone(phone: str) -> str:
    """Show a Kenyan number as 07XXXXXXXX when possible."""
    digits = re.sub(r"\D", "", phone or "")
    if digits.startswith("254") and len(digits) == 12:
        return "0" + digits[3:]
    if digits.startswith("0") and len(digits) == 10:
        return digits
    if digits.startswith("7") and len(digits) == 9:
        return "0" + digits
    return (phone or "").strip()


def seller_payment_destination(business_settings: dict, business_phone: str = "") -> dict:
    """
    Where a shop's customers send money.

    Sellers never supply Daraja keys. They only choose a Paybill, a Till,
    or a Send Money phone. The shop confirms payment after the M-Pesa
    message arrives.
    """
    payment = (business_settings or {}).get("payment") or {}
    account_type = str(payment.get("mpesa_account_type") or "paybill").strip().lower()
    if account_type not in {"paybill", "till", "send_money"}:
        account_type = "paybill"

    shortcode = re.sub(r"\D", "", str(payment.get("mpesa_shortcode") or ""))
    account_number = re.sub(r"\s+", "", str(payment.get("mpesa_account_number") or ""))[:20]
    send_phone = display_phone(payment.get("mpesa_send_money_phone") or business_phone or "")

    if account_type == "send_money":
        configured = bool(re.sub(r"\D", "", send_phone))
    else:
        configured = bool(re.fullmatch(r"\d{5,8}", shortcode))

    return {
        "account_type": account_type,
        "shortcode": shortcode,
        "account_number": account_number,
        "send_money_phone": send_phone,
        "configured": configured,
        "stk_available": False,
        "collection_mode": "manual",
        "mpesa_enabled": payment.get("mpesa_enabled", True) is not False,
    }


def build_payment_instructions(destination: dict, amount, reference: str) -> dict:
    """Customer-facing steps for paying a seller directly."""
    if destination.get("mpesa_enabled") is False:
        raise MpesaError("M-Pesa is turned off for this shop")
    if not destination.get("configured"):
        raise MpesaError(
            "This shop has not set up M-Pesa. Add a Paybill, Till, or Send Money "
            "number in Payment Settings. A Daraja account is not required."
        )

    reference = re.sub(r"\s+", "", str(reference or "DUKA"))[:20] or "DUKA"
    amount_label = f"KES {amount}"
    account_type = destination["account_type"]

    if account_type == "paybill":
        account = destination["account_number"] or reference
        steps = [
            "Open the M-Pesa menu",
            "Choose Lipa na M-Pesa, then Pay Bill",
            f"Business number: {destination['shortcode']}",
            f"Account number: {account}",
            f"Amount: {amount_label}",
            "Enter the M-Pesa PIN and send",
            "The shop marks the order paid after the M-Pesa message arrives",
        ]
        title = "Paybill"
        phone = ""
        till = ""
        paybill = destination["shortcode"]
    elif account_type == "till":
        account = ""
        steps = [
            "Open the M-Pesa menu",
            "Choose Lipa na M-Pesa, then Buy Goods and Services",
            f"Till number: {destination['shortcode']}",
            f"Amount: {amount_label}",
            "Enter the M-Pesa PIN and send",
            "The shop marks the order paid after the M-Pesa message arrives",
        ]
        title = "Till number"
        phone = ""
        till = destination["shortcode"]
        paybill = ""
    else:
        account = ""
        phone = destination["send_money_phone"]
        steps = [
            "Open the M-Pesa menu",
            "Choose Send Money",
            f"Phone number: {phone}",
            f"Amount: {amount_label}",
            "Enter the M-Pesa PIN and send",
            "Wait for the M-Pesa SMS. The shop then marks this payment as paid",
        ]
        title = "Send Money"
        till = ""
        paybill = ""

    return {
        "account_type": account_type,
        "title": title,
        "steps": steps,
        "paybill": paybill,
        "till": till,
        "account_number": account,
        "send_money_phone": phone,
        "amount_label": amount_label,
        "reference": reference,
        "customer_message": steps[0] + ". " + " ".join(steps[1:5]),
        "confirmation": "manual",
    }


def resolve_platform_credentials() -> dict:
    """Platform owner M-Pesa credentials (subscription billing)."""
    consumer_key = (settings.MPESA_CONSUMER_KEY or "").strip()
    consumer_secret = (settings.MPESA_CONSUMER_SECRET or "").strip()
    passkey = (settings.MPESA_PASSKEY or "").strip()
    shortcode = (settings.MPESA_SHORTCODE or "").strip()
    missing = [
        name
        for name, value in [
            ("consumer key", consumer_key),
            ("consumer secret", consumer_secret),
            ("passkey", passkey),
            ("shortcode", shortcode),
        ]
        if not value
    ]
    if missing:
        raise MpesaError(
            "Platform M-Pesa is not configured. Set "
            + ", ".join(missing)
            + " in the backend environment."
        )
    return {
        "consumer_key": consumer_key,
        "consumer_secret": consumer_secret,
        "passkey": passkey,
        "shortcode": shortcode,
        "account_type": "paybill",
        "environment": settings.MPESA_ENVIRONMENT,
    }


def _base_url(environment: str) -> str:
    if environment == "production":
        return "https://api.safaricom.co.ke"
    return "https://sandbox.safaricom.co.ke"


async def get_access_token(consumer_key: str, consumer_secret: str, environment: str) -> str:
    url = f"{_base_url(environment)}/oauth/v1/generate?grant_type=client_credentials"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, auth=(consumer_key, consumer_secret))
    if response.status_code != 200:
        raise MpesaError("Failed to authenticate with Safaricom Daraja", response.text)
    token = response.json().get("access_token")
    if not token:
        raise MpesaError("Daraja access token missing from response", response.json())
    return token


def _password(shortcode: str, passkey: str, timestamp: str) -> str:
    raw = f"{shortcode}{passkey}{timestamp}".encode("utf-8")
    return base64.b64encode(raw).decode("utf-8")


async def initiate_stk_push(
    *,
    credentials: dict,
    phone_number: str,
    amount: int,
    account_reference: str,
    transaction_desc: str,
    callback_url: str,
) -> dict:
    """Initiate a Lipa Na M-Pesa Online STK Push."""
    if amount < 1:
        raise MpesaError("Amount must be at least KES 1")

    phone = normalize_phone(phone_number)
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    password = _password(credentials["shortcode"], credentials["passkey"], timestamp)
    transaction_type = (
        "CustomerBuyGoodsOnline"
        if credentials["account_type"] == "till"
        else "CustomerPayBillOnline"
    )

    token = await get_access_token(
        credentials["consumer_key"],
        credentials["consumer_secret"],
        credentials["environment"],
    )

    payload = {
        "BusinessShortCode": credentials["shortcode"],
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": transaction_type,
        "Amount": amount,
        "PartyA": phone,
        "PartyB": credentials["shortcode"],
        "PhoneNumber": phone,
        "CallBackURL": callback_url,
        "AccountReference": (account_reference or "DukaYetu")[:12],
        "TransactionDesc": (transaction_desc or "Payment")[:13],
    }

    url = f"{_base_url(credentials['environment'])}/mpesa/stkpush/v1/processrequest"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=45.0) as client:
        response = await client.post(url, json=payload, headers=headers)

    data = response.json() if response.content else {}
    if response.status_code != 200 or str(data.get("ResponseCode", "")) not in {"0", "00"}:
        message = data.get("errorMessage") or data.get("ResponseDescription") or "STK Push failed"
        raise MpesaError(message, data)

    return {
        "merchant_request_id": data.get("MerchantRequestID"),
        "checkout_request_id": data.get("CheckoutRequestID"),
        "response_code": data.get("ResponseCode"),
        "response_description": data.get("ResponseDescription"),
        "customer_message": data.get("CustomerMessage"),
        "phone_number": phone,
        "raw": data,
    }


def parse_stk_callback(body: dict) -> dict:
    """Normalize Safaricom STK callback payload."""
    callback = ((body or {}).get("Body") or {}).get("stkCallback") or {}
    result_code = callback.get("ResultCode")
    metadata_items = ((callback.get("CallbackMetadata") or {}).get("Item") or [])
    metadata = {
        item.get("Name"): item.get("Value")
        for item in metadata_items
        if item.get("Name")
    }
    return {
        "merchant_request_id": callback.get("MerchantRequestID"),
        "checkout_request_id": callback.get("CheckoutRequestID"),
        "result_code": result_code,
        "result_desc": callback.get("ResultDesc"),
        "amount": metadata.get("Amount"),
        "mpesa_receipt_number": metadata.get("MpesaReceiptNumber"),
        "transaction_date": metadata.get("TransactionDate"),
        "phone_number": metadata.get("PhoneNumber"),
        "success": result_code == 0,
        "raw": body,
    }
