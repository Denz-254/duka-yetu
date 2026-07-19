import pytest

from app.services.mpesa import MpesaError, normalize_phone, parse_stk_callback


def test_normalize_phone_local_format():
    assert normalize_phone("0712345678") == "254712345678"


def test_normalize_phone_international():
    assert normalize_phone("+254712345678") == "254712345678"


def test_normalize_phone_rejects_invalid():
    with pytest.raises(MpesaError):
        normalize_phone("12345")


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
