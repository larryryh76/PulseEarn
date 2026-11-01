"""Provider adapter primitives for the PSEmine payment v2 rebuild.

No secrets, network calls, Firestore writes, or purchase activation live here.
The adapter is deliberately pure and testable; API handlers own authentication,
provider HTTP calls, persistence, reconciliation, and atomic fulfilment.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any, Mapping
from urllib.parse import urlparse

NOWPAYMENTS_API_BASE = "https://api.nowpayments.io/v1"
SUPPORTED_PROVIDER_STATUSES = {
    "waiting", "confirming", "confirmed", "sending", "partially_paid",
    "finished", "failed", "refunded", "expired",
}


class PaymentConfigurationError(ValueError):
    """Raised when the provider cannot be safely enabled."""


class PaymentPayloadError(ValueError):
    """Raised when a server-created order cannot form a valid invoice."""


def _https_url(value: str, field: str) -> str:
    parsed = urlparse(str(value or "").strip())
    if parsed.scheme != "https" or not parsed.netloc:
        raise PaymentConfigurationError(f"{field} must be an absolute HTTPS URL")
    return str(value).strip()


def nowpayments_configured(env: Mapping[str, str] | None = None) -> bool:
    """True only when provider credentials and a public callback exist."""
    values = os.environ if env is None else env
    return all(str(values.get(key, "")).strip() for key in (
        "NOWPAYMENTS_API_KEY", "NOWPAYMENTS_IPN_SECRET", "NOWPAYMENTS_IPN_CALLBACK_URL",
    ))


def provider_api_base(env: Mapping[str, str] | None = None) -> str:
    values = os.environ if env is None else env
    base = str(values.get("NOWPAYMENTS_API_BASE", NOWPAYMENTS_API_BASE)).strip().rstrip("/")
    parsed = urlparse(base)
    if parsed.scheme != "https" or not parsed.netloc:
        raise PaymentConfigurationError("NOWPAYMENTS_API_BASE must be HTTPS")
    return base


def build_invoice_payload(
    *,
    order_id: str,
    amount: str | Decimal,
    price_currency: str,
    callback_url: str,
    success_url: str,
    cancel_url: str,
    description: str,
    pay_currency: str | None = None,
) -> dict[str, Any]:
    """Build a hosted invoice; omit pay_currency to let the customer choose."""
    order = str(order_id or "").strip()
    if not order or len(order) > 128 or not re.fullmatch(r"[A-Za-z0-9_.:-]+", order):
        raise PaymentPayloadError("Invalid server order reference")
    try:
        price = Decimal(str(amount))
    except (InvalidOperation, ValueError, TypeError):
        raise PaymentPayloadError("Invalid order amount")
    if not price.is_finite() or price <= 0:
        raise PaymentPayloadError("Order amount must be positive")
    price = price.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    currency = str(price_currency or "").strip().lower()
    if not re.fullmatch(r"[a-z]{3,10}", currency):
        raise PaymentPayloadError("Invalid pricing currency")

    payload: dict[str, Any] = {
        "price_amount": format(price, ".2f"),
        "price_currency": currency,
        "ipn_callback_url": _https_url(callback_url, "IPN callback URL"),
        "order_id": order,
        "order_description": str(description or "PSEmine tool purchase")[:255],
        "success_url": _https_url(success_url, "Success URL"),
        "cancel_url": _https_url(cancel_url, "Cancel URL"),
    }
    if pay_currency:
        coin = str(pay_currency).strip().lower()
        if not re.fullmatch(r"[a-z0-9]{2,24}", coin):
            raise PaymentPayloadError("Invalid requested payment currency")
        payload["pay_currency"] = coin
    return payload


def _sort_nested(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _sort_nested(value[key]) for key in sorted(value)}
    if isinstance(value, list):
        return [_sort_nested(item) for item in value]
    return value


def canonical_ipn_body(payload: Mapping[str, Any]) -> bytes:
    """NOWPayments canonical JSON: recursively sorted keys, compact UTF-8."""
    return json.dumps(
        _sort_nested(dict(payload)),
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")


def verify_ipn_signature(
    payload: Mapping[str, Any],
    signature: str | None,
    secret: str | None,
) -> bool:
    """Constant-time validation of x-nowpayments-sig (HMAC-SHA512)."""
    if not signature or not secret:
        return False
    supplied = str(signature).strip().lower()
    if not re.fullmatch(r"[0-9a-f]{128}", supplied):
        return False
    expected = hmac.new(
        str(secret).encode("utf-8"),
        canonical_ipn_body(payload),
        hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(expected, supplied)


def normalize_provider_status(status: str | None) -> str:
    """Map provider states to stable merchant-side states."""
    value = str(status or "").strip().lower()
    if value == "finished":
        return "paid"
    if value in {"confirming", "confirmed", "sending"}:
        return "confirming"
    if value == "waiting":
        return "pending"
    if value == "partially_paid":
        return "underpaid"
    if value in {"failed", "refunded", "expired"}:
        return value
    return "review"


def invoice_response(invoice: Mapping[str, Any]) -> dict[str, str]:
    """Allowlist the two provider fields that may be returned to the browser."""
    invoice_id = str(invoice.get("id") or "").strip()
    invoice_url = str(invoice.get("invoice_url") or "").strip()
    if not invoice_id or not invoice_url:
        raise PaymentPayloadError("Provider returned an incomplete invoice")
    parsed = urlparse(invoice_url)
    if parsed.scheme != "https" or not parsed.netloc:
        raise PaymentPayloadError("Provider returned an unsafe invoice URL")
    return {"providerInvoiceId": invoice_id, "checkoutUrl": invoice_url}
