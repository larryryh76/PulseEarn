import hashlib
import hmac
import json
import sys
import unittest
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from psemine_payments_v2 import (
    PaymentConfigurationError,
    PaymentPayloadError,
    build_invoice_payload,
    canonical_ipn_body,
    invoice_response,
    normalize_provider_status,
    nowpayments_configured,
    provider_api_base,
    verify_ipn_signature,
    verify_merchant_account,
)


class TestPSEminePaymentsV2Adapter(unittest.TestCase):
    def test_merchant_account_verification_requires_enabled_currencies(self):
        class Response:
            ok = True
            def json(self):
                return {"result": [{"code": "usdttrc20"}, {"currency": "bnb"}, "usdc"]}
        currencies = verify_merchant_account("key", http_get=lambda *a, **k: Response())
        self.assertEqual(["bnb", "usdc", "usdttrc20"], currencies)

    def test_merchant_account_rejects_invalid_credentials_or_empty_coin_list(self):
        class BadResponse:
            ok = False
            def json(self):
                return {}
        with self.assertRaises(PaymentPayloadError):
            verify_merchant_account("bad", http_get=lambda *a, **k: BadResponse())
        class EmptyResponse:
            ok = True
            def json(self):
                return {"result": []}
        with self.assertRaises(PaymentPayloadError):
            verify_merchant_account("key", http_get=lambda *a, **k: EmptyResponse())

    def test_hosted_invoice_leaves_asset_selection_to_customer(self):
        payload = build_invoice_payload(
            order_id="pse-order-123",
            amount=Decimal("3.00"),
            price_currency="usd",
            callback_url="https://pulseearn.online/api/payments/nowpayments/ipn",
            success_url="https://pulseearn.online/mine/tools?payment=success",
            cancel_url="https://pulseearn.online/mine/tools?payment=cancelled",
            description="PSEmine Starter Miner",
        )
        self.assertEqual(payload["price_amount"], "3.00")
        self.assertNotIn("pay_currency", payload)

    def test_customer_can_request_a_specific_supported_asset(self):
        payload = build_invoice_payload(
            order_id="pse-order-456",
            amount="10",
            price_currency="gbp",
            callback_url="https://pulseearn.online/ipn",
            success_url="https://pulseearn.online/success",
            cancel_url="https://pulseearn.online/cancel",
            description="Builder Miner",
            pay_currency="usdttrc20",
        )
        self.assertEqual(payload["pay_currency"], "usdttrc20")

    def test_rejects_invalid_amount_order_and_non_https_urls(self):
        base = dict(
            order_id="pse-order-1", amount="0", price_currency="usd",
            callback_url="https://pulseearn.online/ipn",
            success_url="https://pulseearn.online/success",
            cancel_url="https://pulseearn.online/cancel", description="tool",
        )
        with self.assertRaises(PaymentPayloadError):
            build_invoice_payload(**base)
        with self.assertRaises(PaymentPayloadError):
            build_invoice_payload(**{**base, "amount": "1", "order_id": "../other"})
        with self.assertRaises(PaymentConfigurationError):
            build_invoice_payload(**{**base, "amount": "1", "callback_url": "http://evil.test/ipn"})

    def test_signature_matches_provider_hmac_sha512_scheme(self):
        secret = "test-ipn-secret"
        payload = {"z": 2, "a": {"y": 1, "b": 3}, "list": [{"z": 1, "a": 2}]}
        canonical = json.dumps(
            {"a": {"b": 3, "y": 1}, "list": [{"a": 2, "z": 1}], "z": 2},
            separators=(",", ":"), ensure_ascii=False,
        ).encode()
        self.assertEqual(canonical_ipn_body(payload), canonical)
        signature = hmac.new(secret.encode(), canonical, hashlib.sha512).hexdigest()
        self.assertTrue(verify_ipn_signature(payload, signature, secret))
        self.assertFalse(verify_ipn_signature(payload, signature[:-1] + "0", secret))
        self.assertFalse(verify_ipn_signature(payload, signature, ""))

    def test_statuses_are_fail_closed(self):
        self.assertEqual(normalize_provider_status("finished"), "paid")
        self.assertEqual(normalize_provider_status("confirming"), "confirming")
        self.assertEqual(normalize_provider_status("partially_paid"), "underpaid")
        self.assertEqual(normalize_provider_status("expired"), "expired")
        self.assertEqual(normalize_provider_status("unknown-provider-state"), "review")
        self.assertEqual(normalize_provider_status(None), "review")

    def test_invoice_url_is_allowlisted_and_https_only(self):
        self.assertEqual(
            invoice_response({"id": "inv-1", "invoice_url": "https://nowpayments.io/payment/?iid=inv-1"}),
            {"providerInvoiceId": "inv-1", "checkoutUrl": "https://nowpayments.io/payment/?iid=inv-1"},
        )
        with self.assertRaises(PaymentPayloadError):
            invoice_response({"id": "inv-1", "invoice_url": "javascript:alert(1)"})
        with self.assertRaises(PaymentPayloadError):
            invoice_response({"id": "inv-1", "invoice_url": "https://pay.example/inv-1"})
        with self.assertRaises(PaymentPayloadError):
            invoice_response({"id": "inv-1"})

    def test_configuration_requires_both_secrets_and_callback(self):
        self.assertFalse(nowpayments_configured({}))
        self.assertTrue(nowpayments_configured({
            "NOWPAYMENTS_API_KEY": "api",
            "NOWPAYMENTS_IPN_SECRET": "ipn",
            "NOWPAYMENTS_IPN_CALLBACK_URL": "https://pulseearn.online/ipn",
        }))
        with self.assertRaises(PaymentConfigurationError):
            provider_api_base({"NOWPAYMENTS_API_BASE": "http://localhost"})

if __name__ == "__main__":
    unittest.main()
