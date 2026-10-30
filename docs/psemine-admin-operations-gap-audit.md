# PSEmine admin operations — gap audit

**Scope:** the PSEmine operations console mounted from the global PulseEarn admin. This audit is based on the current `AdminPSEMine.tsx`, the `/api/admin/mine/*` and `/api/admin/psemine/*` handlers, the canonical campaign quote path, and the legacy order path. It does not change the campaign's locked economics.

## Confirmed findings

### P0 — Money destination configuration (remediated in fail-closed wallet PR)
- There is one permitted receiving destination: the active campaign's explicitly configured `receiverWalletAddress`.
- Both canonical and legacy quote endpoints now use the same strict validator and refuse to issue a quote when the campaign document/address is absent, malformed, or zero. They also require `receiverWalletConfigured`, `receiverWalletConfiguredAt`, and `receiverWalletConfiguredBy`, written only by the super-admin configuration action; this prevents an old seeded Firestore value from silently remaining payable.
- The old `PSEMINE_PAYMENT_ADDRESS` constant, hardcoded fallback address, frontend default receiver, and bootstrap receiver assignment have been removed. New campaign bootstrap records an empty receiver and remains non-payable until a super-admin configures it.
- Both verification paths use the immutable destination stored on the server-created quote/order and validate the BNB Smart Chain network. They do not fall back to a second wallet.
- The legacy quote amount is rounded to the same eight decimal places displayed by its checkout UI before the exact wei amount is calculated. This closes a mismatch that could otherwise reject a payment after it had been sent.
- A wallet change affects new quotes only. Existing quotes retain their original recipient and amount so an in-flight payment is not silently redirected.
- Production database configuration still requires the admin to reconfirm the intended wallet in the live console before launch; source changes cannot prove which address is currently stored in Firestore. Until that confirmation is saved, purchase quotes fail closed.

### P1 — Existing operational panels need a full functional audit
- **Overview:** displays backend-reported KPIs and correctly avoids inventing missing numbers, but the admin still needs a reconciliation view tying confirmed purchase payments, accrued liability, payouts/debits, and unresolved recovery cases together.
- **Lifecycle:** pause/resume/schedule/settle/shutdown controls exist. Each action must be verified against every campaign state and checked for safe retry behavior and audit completeness.
- **Tool register:** the current table shows the locked tier prices/rates/caps from frontend constants. It does not clearly report the backend's live per-tool operational status or offer a controlled way to pause/deprecate a tier. Locked economics must remain read-only.
- **Payment verification:** real recovery records and server-side resolution actions exist, but the panel needs end-to-end tests for each reason, retry, and failure mode.
- **Purchases:** verified payments and order intents are separate, which is correct. Search/filter/pagination and destination mismatch visibility need to be checked against real response shapes.
- **Payouts:** the canonical request now locks the live BNB/GBP conversion, exact BNB amount/wei and the user's saved payout destination before reserving the GBP debit. Admin review requires a successful BSC receipt, exact recipient and amount, and the configured confirmation depth. The legacy unquoted payout writer is retired; legacy rows without a locked BNB amount remain blocked for reconciliation rather than being guessed.
- **Audit:** a read-only feed exists, but configuration changes and all lifecycle/payment/payout actions must consistently include actor, before/after state, target, and outcome.
- **Configuration:** receiving-wallet setup was missing. Chain/network settings, locked economic parameters, secrets, and user payout wallets must not be mixed into this control.

### P2 — Usability and resilience work
- Give each section a clear operational purpose and expose loading, partial failure, empty, stale, and permission-denied states distinctly.
- Add queue-level filters for status, date, amount, user/order/purchase ID, and transaction hash where the API can safely support them.
- Add pagination/cursors instead of silently capping operational records to a small recent window.
- Show data freshness and service health for the quote provider, BNB Smart Chain RPC/confirmation worker, campaign lifecycle job, and payout processing. Do not imply a service is healthy when it has not reported.
- Verify narrow mobile layouts, keyboard/focus behavior, destructive-action confirmation, and recoverable errors for every admin action.

## Verification gates before production merge
1. Frontend TypeScript and production build.
2. Backend regression suite plus new wallet-admin contract tests.
3. Wallet and payment guard suites, including both canonical and legacy quote paths.
4. Desktop/mobile console rendering checks.
5. Confirm the PR's Vercel previews and production deployment after merge.
6. Never use a live transfer as a test; use test doubles/fixtures for address mutation and quote destination assertions.

## Explicit non-goals
- No change to locked tool prices, hourly rates, referral capacity, campaign duration, user balances, payout thresholds, or existing quote/payment records.
- No display of fabricated treasury balances or fake transactions.
- No browser-side Firestore write for the receiving address; the authenticated backend action is the authority.
