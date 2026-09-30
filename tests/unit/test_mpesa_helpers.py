import pytest

from app.core.config import settings
from app.services.mpesa import (
    MpesaError,
    build_payment_instructions,
    normalize_phone,
    parse_stk_callback,
    resolve_platform_credentials,
    seller_payment_destination,
)


def test_normalize_phone_local_format():
    assert normalize_phone("0712345678") == "254712345678"


def test_normalize_phone_international():
    assert normalize_phone("+254712345678") == "254712345678"


def test_normalize_phone_rejects_invalid():
    with pytest.raises(MpesaError):
        normalize_phone("12345")


def test_seller_paybill_does_not_use_daraja_keys():
    destination = seller_payment_destination({
        "payment": {
            "mpesa_consumer_key": "old-business-key",
            "mpesa_passkey": "business-passkey",
            "mpesa_account_type": "paybill",
            "mpesa_shortcode": "400200",
            "mpesa_account_number": "SHOP",
        }
    })
    instructions = build_payment_instructions(destination, "1500.00", "ORD123")

    assert destination["configured"] is True
    assert "passkey" not in destination
    assert instructions["paybill"] == "400200"
    assert instructions["account_number"] == "SHOP"
    assert any("400200" in step for step in instructions["steps"])


def test_send_money_instructions_wait_for_message():
    destination = seller_payment_destination({
        "payment": {
            "mpesa_account_type": "send_money",
            "mpesa_send_money_phone": "0712345678",
        }
    })
    instructions = build_payment_instructions(destination, "80.00", "ORD9")

    assert destination["send_money_phone"] == "0712345678"
    assert instructions["confirmation"] == "manual"
    assert any("SMS" in step for step in instructions["steps"])


def test_unconfigured_till_cannot_collect():
    destination = seller_payment_destination({
        "payment": {"mpesa_account_type": "till", "mpesa_shortcode": ""}
    })
    assert destination["configured"] is False
    with pytest.raises(MpesaError, match="Daraja account is not required"):
        build_payment_instructions(destination, "10.00", "ORD1")


def test_platform_credentials_stay_in_environment(monkeypatch):
    monkeypatch.setattr(settings, "MPESA_CONSUMER_KEY", "platform-key")
    monkeypatch.setattr(settings, "MPESA_CONSUMER_SECRET", "platform-secret")
    monkeypatch.setattr(settings, "MPESA_PASSKEY", "platform-passkey")
    monkeypatch.setattr(settings, "MPESA_SHORTCODE", "174379")

    credentials = resolve_platform_credentials()
    assert credentials["consumer_key"] == "platform-key"
    assert credentials["shortcode"] == "174379"
    assert credentials["passkey"] == "platform-passkey"


def test_parse_stk_callback_success():
    body = {
        "Body": {
            "stkCallback": {
                "MerchantRequestID": "m1",
                "CheckoutRequestID": "c1",
                "ResultCode": 0,
                "ResultDesc": "The service request is processed successfully.",
                "CallbackMetadata": {
                    "Item": [
                        {"Name": "Amount", "Value": 10.0},
                        {"Name": "MpesaReceiptNumber", "Value": "ABC123"},
                        {"Name": "PhoneNumber", "Value": 254712345678},
                    ]
                },
            }
        }
    }
    parsed = parse_stk_callback(body)
    assert parsed["success"] is True
    assert parsed["mpesa_receipt_number"] == "ABC123"
    assert parsed["checkout_request_id"] == "c1"
