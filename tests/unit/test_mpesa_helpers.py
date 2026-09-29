import pytest

from app.core.config import settings
from app.services.mpesa import MpesaError, normalize_phone, parse_stk_callback, resolve_credentials


def test_normalize_phone_local_format():
    assert normalize_phone("0712345678") == "254712345678"


def test_normalize_phone_international():
    assert normalize_phone("+254712345678") == "254712345678"


def test_normalize_phone_rejects_invalid():
    with pytest.raises(MpesaError):
        normalize_phone("12345")


def test_resolve_credentials_uses_platform_keys_and_business_destination(monkeypatch):
    monkeypatch.setattr(settings, "MPESA_CONSUMER_KEY", "platform-key")
    monkeypatch.setattr(settings, "MPESA_CONSUMER_SECRET", "platform-secret")

    credentials = resolve_credentials({
        "payment": {
            "mpesa_consumer_key": "old-business-key",
            "mpesa_consumer_secret": "old-business-secret",
            "mpesa_account_type": "till",
            "mpesa_shortcode": "123456",
            "mpesa_passkey": "business-passkey",
        }
    })

    assert credentials["consumer_key"] == "platform-key"
    assert credentials["consumer_secret"] == "platform-secret"
    assert credentials["shortcode"] == "123456"
    assert credentials["passkey"] == "business-passkey"
    assert credentials["account_type"] == "till"


def test_resolve_credentials_rejects_send_money_for_stk():
    with pytest.raises(MpesaError, match="requires a business Paybill or Till"):
        resolve_credentials({"payment": {"mpesa_account_type": "send_money"}})


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
