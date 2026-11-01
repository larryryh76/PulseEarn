# PSEmine Payment v2 — architecture and migration

## Product decision

Use a provider-neutral hosted-checkout architecture, with NOWPayments as the first candidate adapter, subject to successful merchant onboarding and compliance approval for the operator's jurisdiction.

A hosted invoice removes the requirement for a user to connect a wallet to PulseEarn. The customer chooses a supported cryptocurrency/network on the provider checkout page and pays from whichever wallet they prefer. This avoids browser-global wallet session reuse and makes checkout usable from mobile browsers, wallet apps, and desktop.

NOWPayments' current API documentation describes:
- `POST /v1/invoice` returning an `invoice_url` and invoice ID.
- `GET /v1/currencies` and `GET /v1/merchant/coins` for supported assets.
- `GET /v1/payment/{payment_id}` for independent payment-status reconciliation.
- HMAC-SHA512 IPN callbacks using recursively key-sorted JSON.
- GBP as a supported fiat pricing currency. The provider dashboard also lists NGN among supported base currencies.

References:
- https://nowpayments.zendesk.com/hc/en-us/articles/21345824322717-API-and-endpoint-description
- https://nowpayments.zendesk.com/hc/en-us/articles/21395546303389-IPN-and-how-to-setup
- https://nowpayments.zendesk.com/hc/en-us/articles/18399924720157-NOWPayments-dashboard

## Checkout experience

1. User selects a PSEmine tool.
2. Backend creates an authenticated, immutable order using the canonical GBP tool price.
3. Backend creates a hosted invoice. Unless a customer explicitly chooses an asset, omit `pay_currency` so the provider checkout can offer its enabled choices.
4. Browser receives only an allowlisted HTTPS checkout URL and opens it.
5. User pays from any compatible wallet; PulseEarn never asks the user to connect or disclose a wallet merely to buy a tool.
6. User returns to a payment-status page. The redirect is informational only and never proves payment.
7. Signed IPN is validated and persisted as a reconciliation job. The callback acknowledges quickly; it does not make a slow provider API request.
8. The authenticated order-status poll or scheduled GitHub Action fetches the provider payment record and compares the immutable order ID, invoice ID, GBP price and currency.
9. A Firestore transaction atomically marks the order paid and creates exactly one tool ownership. Duplicate callbacks and reconciliation runs are harmless.
10. The scheduled reconciler retries pending/confirming/underpaid orders if the user closes the checkout tab.

## Merchant account setup

- Add the merchant's receiving wallet(s) in the NOWPayments account.
- Generate an API key and IPN secret.
- Configure the IPN callback URL as `https://pulseearn.online/api/mine/payments/v2/nowpayments/ipn`.
- Configure the enabled customer assets in the provider's coin settings.
- Keep the provider's payment-covering/underpayment tolerance at 0% unless the business explicitly approves a tolerance; otherwise a slightly underpaid invoice may be marked finished by provider policy.
- If the merchant does not configure a receiving wallet for a coin paid by the customer, NOWPayments documents that it may convert the funds and send them to the first wallet in the merchant wallet list. Configure this deliberately; do not assume every customer asset settles to the same address without checking the merchant settings.
- Set Vercel server-only environment variables: `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`, optional `NOWPAYMENTS_API_BASE`, `NOWPAYMENTS_PRICE_CURRENCY=gbp`, and `NOWPAYMENTS_IPN_CALLBACK_URL`.
- Optional reliability backup: set GitHub Actions secret `PSEMINE_PAYMENT_CRON_SECRET` and the matching Vercel environment variable to enable the 5-minute scheduled reconciler. Without it, signed events are still reconciled when the customer returns and the order-status page is checked.

## Canonical order data

Store immutable server-side fields: orderId, uid, toolId, tool price/version, priceAmount, priceCurrency, provider, providerInvoiceId, providerPaymentId, createdAt, expiresAt, status, actualPaidAmount, actualPaidCurrency, providerStatus, settledAt, ownershipId, and audit metadata.

Never trust client-supplied amount, UID, provider status, token symbol, transaction hash, or redirect query parameters.

## Status model

- creating / pending / reconciliation_pending
- confirming
- paid (only after provider API reconciliation confirms a finished payment)
- underpaid
- expired
- failed
- refunded
- review (unknown, duplicate, or inconsistent state)

Only `paid` can activate a tool. Partial, mismatched, refunded, late, or unknown payments must not activate automatically. A provider reversal after settlement is flagged for admin review without silently erasing the original settled-revenue audit record.

## Security boundaries

- NOWPayments API key and IPN secret are server-only Vercel environment variables.
- Verify the `x-nowpayments-sig` HMAC-SHA512 header using constant-time comparison.
- Webhook acknowledges only after signature verification and durable event/order writes; it never activates a tool directly.
- Fetch the payment from the provider API before settlement and compare provider order ID, invoice/payment IDs, expected GBP price/currency and final status.
- Make settlement idempotent by unique order and provider payment IDs.
- Use the authenticated Firebase UID from the server token, never from the browser payload.
- Do not store provider credentials or raw secrets in Firestore or frontend bundles.
- Never treat success/cancel redirect as payment evidence.

## Scope boundaries

- Rebuild PSEmine tool-purchase checkout and payment verification.
- Remove the old direct WalletConnect purchase flow and do not require wallet connections for purchases.
- Keep the PSEmine user payout destination and withdrawal pipeline separate; it is not the purchase checkout.
- Preserve old purchase/payment/recovery documents as read-only legacy audit evidence. Do not delete Firestore data or count historical fake/test rows as revenue.
- Do not enable purchases until provider account, merchant payout wallet, secrets, webhook delivery and end-to-end settlement are configured and verified.

## Rollout gates

1. Confirm NOWPayments account onboarding and jurisdictional eligibility for PulseEarn's operator.
2. Configure merchant payout wallet and customer coin settings in NOWPayments.
3. Add server-only secrets to Vercel and the matching reconciliation secret to GitHub Actions.
4. Test sandbox invoices, currency availability and webhook delivery.
5. Optionally configure the scheduled reconciler secret; test duplicate, invalid-signature, late, underpaid, refunded and wrong-order callbacks.
6. Test multiple Firebase accounts in one browser and multiple devices.
7. Run full API, TypeScript, payment adapter and authenticated user-journey tests.
8. Enable purchases only after a real low-value production payment and reconciliation succeeds.
