# PSEmine admin operations — gap audit

**Scope:** the PSEmine operations console mounted from the global PulseEarn admin. This audit is based on the current `AdminPSEMine.tsx`, the `/api/admin/mine/*` and `/api/admin/psemine/*` handlers, the canonical campaign quote path, and the legacy order path. It does not change the campaign's locked economics.

## Confirmed findings

### P0 — Money destination configuration (this change)
- The console had no receiving-wallet configuration section, despite the active campaign storing `receiverWalletAddress`.
- First-time campaign seeding used a hardcoded fallback, which is reasonable as a bootstrap default but is not a usable operational settings workflow.
- The canonical quote flow reads the campaign's receiving address, but the legacy order-quote path wrote `PSEMINE_PAYMENT_ADDRESS` directly. That would ignore an admin change.
- This PR adds a super-admin-only configuration section, server-side address validation (including zero-address rejection), explicit typed confirmation, persistence to the active campaign, and an audit record. The legacy quote path now reads the campaign destination with the existing constant as fallback only.
- Changes apply to **new quotes**. A previously issued quote must keep its original destination and amount; changing its destination retroactively would break the payer's signed quote.

### P1 — Existing operational panels need a full functional audit
- **Overview:** displays backend-reported KPIs and correctly avoids inventing missing numbers, but the admin still needs a reconciliation view tying confirmed purchase payments, accrued liability, payouts/debits, and unresolved recovery cases together.
- **Lifecycle:** pause/resume/schedule/settle/shutdown controls exist. Each action must be verified against every campaign state and checked for safe retry behavior and audit completeness.
- **Tool register:** the current table shows the locked tier prices/rates/caps from frontend constants. It does not clearly report the backend's live per-tool operational status or offer a controlled way to pause/deprecate a tier. Locked economics must remain read-only.
- **Payment verification:** real recovery records and server-side resolution actions exist, but the panel needs end-to-end tests for each reason, retry, and failure mode.
- **Purchases:** verified payments and order intents are separate, which is correct. Search/filter/pagination and destination mismatch visibility need to be checked against real response shapes.
- **Payouts:** a queue and review actions exist. The approval path needs explicit evidence that a transaction hash is validated against the intended network/recipient/amount before the request can be marked paid; a supplied hash alone must never be treated as proof.
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
