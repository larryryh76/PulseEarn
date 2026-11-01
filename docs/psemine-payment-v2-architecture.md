# PSEmine Payment v2 — architecture and migration

## Product decision

Use a provider-neutral hosted-checkout architecture, with NOWPayments as the first candidate adapter, subject to successful merchant onboarding and compliance approval for the operator's jurisdiction.

A hosted invoice removes the requirement for a user to connect a wallet to PulseEarn. The customer chooses a supported cryptocurrency/network on the provider checkout page and pays from whichever wallet they prefer. This avoids browser-global wallet session reuse and makes checkout usable from mobile browsers, wallet apps, and desktop.

NOWPayments documents:
- `POST /v1/invoice` returning an `invoice_url` and invoice ID.
- `GET /v1/currencies` and merchant-specific coin listings for available assets.
- HMAC-SHA512 IPN callbacks using recursively key-sorted compact JSON.
- More than 300 supported assets and a published starting service fee of 1%.

References:
- https://nowpayments.zendesk.com/hc/en-us/articles/21345824322717-API-and-endpoint-description
- https://nowpayments.zendesk.com/hc/en-us/articles/21395546303389-IPN-and-how-to-setup
- https://nowpayments.io/api

## Checkout experience

1. User selects a PSEmine tool.
2. Backend creates an authenticated, immutable order using the canonical tool price.
3. Backend creates a hosted invoice. Unless the user deliberately chooses an asset, omit `pay_currency` so the provider checkout can offer its supported choices.
4. Browser receives only an allowlisted HTTPS checkout URL and opens it.
5. User pays from any compatible wallet; PulseEarn never asks the user to connect or disclose a wallet merely to buy a tool.
6. User returns to a payment-status page. The redirect is informational only and never proves payment.
7. Signed IPN is validated, then the backend independently retrieves the provider payment record before settlement.
8. A Firestore transaction atomically marks the order paid and creates exactly one tool ownership. Duplicate callbacks are harmless.
9. A reconciliation job checks orders left pending when callbacks are delayed.

## Canonical order data

Store immutable server-side fields: orderId, uid, toolId, tool price/version, priceAmount, priceCurrency, provider, providerInvoiceId, providerPaymentId (when available), providerOrderId, createdAt, expiresAt, status, actualPaidAmount, actualPaidCurrency, providerStatus, settledAt, ownershipId, and audit metadata.

Never trust client-supplied amount, UID, provider status, token symbol, transaction hash, or redirect query parameters.

## Status model

- pending / waiting
- confirming
- paid (only after provider API reconciliation confirms a finished payment)
- underpaid
- expired
- failed
- refunded
- review (unknown or inconsistent state)

Only `paid` can activate a tool. Partial, mismatched, refunded, late, or unknown payments must not activate automatically.

## Security boundaries

- NOWPayments API key and IPN secret are server-only Vercel environment variables.
- Verify the `x-nowpayments-sig` HMAC-SHA512 header using constant-time comparison.
- Do not activate directly from the IPN body; fetch provider payment details and compare provider order ID, invoice/payment IDs, expected price/currency and final status.
- Make settlement idempotent by unique order and provider payment IDs.
- Use the authenticated Firebase UID from the server token, never from the browser payload.
- Do not store provider credentials or raw secrets in Firestore or frontend bundles.
- Never treat success/cancel redirect as payment evidence.

## Scope boundaries

- Rebuild PSEmine tool-purchase checkout and payment verification.
- Keep the PSEmine payout destination and withdrawal pipeline separate; it is not the purchase checkout.
- Preserve old purchase/payment/recovery documents as read-only legacy audit evidence. Do not delete Firestore data or pretend historic fake/test rows are revenue.
- Do not enable purchases until provider account, payout wallet, secrets, webhook delivery and end-to-end settlement are configured and verified.

## Rollout gates

1. Confirm NOWPayments account onboarding and jurisdictional eligibility for PulseEarn's operator.
2. Add secrets to Vercel server environment only.
3. Test sandbox invoices, currency availability and webhook delivery.
4. Test duplicate, invalid-signature, late, underpaid, refunded and wrong-order callbacks.
5. Test multiple Firebase accounts in one browser and multiple devices.
6. Run full API, TypeScript, wallet isolation and authenticated user-journey tests.
7. Enable purchases only after a real low-value production payment and reconciliation succeeds.
