# PSEmine direct on-chain tool payments

## Product decision

PSEmine tool purchases use the existing WalletConnect/Reown wallet session and direct native BNB transfers on BNB Smart Chain (chain ID 56). There is no hosted checkout provider, merchant API key, IPN secret, or provider account.

The purchase receiver is the campaign receiving wallet configured and explicitly confirmed by an authorized administrator in the PSEmine admin. The user's payout/withdrawal destination remains a separate setting and must never be reused as the purchase receiver.

## Purchase lifecycle

1. The authenticated user selects a tool.
2. The backend creates an immutable purchase intent using the canonical GBP tool price and a fresh server-side BNB/GBP quote. The intent binds the authenticated UID, selected tool, declared payer wallet, receiver wallet, chain ID, exact wei amount, quote ID, and expiry. The payer address is only a declaration at this stage; it is not independently proven until the transaction sender is verified on chain.
3. The browser asks the connected wallet to switch to BNB Smart Chain if needed and requests one explicit `eth_sendTransaction` approval for the exact native BNB transfer. No transfer is sent without the user's wallet approval.
4. The wallet returns a transaction hash only after the wallet provider accepts the submission; an interrupted or uncertain handoff remains pending and is never treated as payment success.
5. The client submits the transaction hash to the authenticated verification endpoint.
6. The backend independently verifies the transaction receipt and on-chain transaction: BSC chain, successful receipt, exact receiver, exact wei amount, bound sender, quote expiry, and required confirmations.
7. Settlement is idempotent. A verified payment activates exactly one tool ownership and writes the corresponding purchase/revenue records atomically. Duplicate hashes, repeated requests, mismatched wallets, late payments, and uncertain broadcasts cannot silently activate or charge twice.
8. If wallet submission is uncertain, the user must check wallet activity and provide the existing transaction hash for verification; the UI must never automatically broadcast a second transfer.

## Trust boundaries

- The server, not the browser, chooses the GBP price, exchange quote, receiver, exact wei amount, chain ID, quote expiry, and order ownership.
- The frontend may only submit the transaction hash and the declared payer address. Neither is proof of payment.
- The current implementation binds the payer address supplied by the authenticated client to the immutable purchase intent, then verifies that the actual on-chain transaction sender matches that binding. The binding field is not itself a cryptographic ownership proof; control is demonstrated only by the later BNB transaction from that address. Do not describe the unused `walletProofNonce` or `api/psemine_wallet_proof.py` as active protections until a quote-specific signature is wired into the create-intent endpoint and tested end to end.
- The backend verifies the actual chain transaction and receipt before settlement.
- A wallet address from one browser session must never be substituted for another user's wallet or silently rebound to a live purchase intent.
- Pending, failed, expired, unverified, and legacy/test records are excluded from confirmed purchase revenue.
- The admin revenue total is derived from verified/activated purchases, not client-side claims or mock transactions.
- Withdrawal/payout wallet configuration is independent of the campaign purchase receiver.

## Configuration and rollout

- Reuse the existing public Reown project ID and WalletConnect integration already used by PSEmine.
- An administrator must explicitly configure and confirm the campaign receiver wallet in PSEmine admin before purchases can open.
- Keep the campaign network fixed to BNB Smart Chain (56) and native BNB unless a separately audited token-payment design is introduced.
- Do not add NOWPayments, hosted invoices, merchant credentials, provider callbacks, or a scheduled provider reconciler.
- Keep purchases disabled if the receiver wallet is missing or unconfirmed.
- Before announcing real-money readiness, test with a low-value live BSC payment and verify the receipt, exact receiver/amount/sender, idempotent activation, and admin revenue total.


## Known hardening work (do not treat as launch sign-off)

The current implementation still needs an atomic one-active-intent-per-user/tool guard. Existing purchase checks and the subsequent intent write are separate Firestore operations, so simultaneous create requests need a transactional lock/idempotency design. Payment statuses also need one canonical transition table shared by create, mark-uncertain, report-submission, verification, recovery, and no-broadcast resolution endpoints.

The current `walletProofNonce` and EIP-191 proof helper are not part of the live create-intent request. The documented trust model above intentionally describes the actual deployed behavior rather than claiming a signature check that does not run.

Required before real-money launch:
- Atomic concurrent intent creation and idempotency.
- Explicit allowed state transitions and terminal-state guards on every payment endpoint.
- End-to-end mocked tests for duplicate/out-of-order requests, wallet cancellation, ambiguous broadcast, hash persistence, confirmations, expiry, recovery attachment, and exactly-once activation/revenue.
- Remove or fully integrate the unused wallet-proof nonce/helper.
- Verify the production BSC RPC sources, confirmation policy, and admin receiver setup without broadcasting a production payment.


## Payment-state and RPC reliability hardening (PR #434)

The authenticated client mutation routes now share the engine's transactional purchase-state transition guard:
- `mark-uncertain` may only move an un-hashed `awaiting_payment` intent to `submission_uncertain`.
- `report-submission` atomically persists one immutable transaction hash and advances an awaiting/uncertain intent to `transaction_submitted`.
- A repeated report of the same hash is idempotent and cannot regress `confirming` or `manual_review`; a different hash is rejected.
- `resolve-no-broadcast` only closes an un-hashed uncertain intent.
- Verification requires the exact persisted hash and rechecks that hash plus an allowed state inside the same Firestore transaction that redeems the hash and creates ownership/revenue records.

BSC verification now uses an ordered RPC pool: the configured `PSEMINE_BSC_RPC_URL`, optional comma-separated `PSEMINE_BSC_RPC_FALLBACKS`, then BNB Chain public mainnet endpoints. A single bounded 22-second request budget prevents serial endpoint timeouts from exhausting the serverless request. Every endpoint must report chain ID 56, and transaction, receipt, recipient, sender, exact wei amount and confirmation depth are checked against one endpoint's coherent response. RPC failures never mark a payment successful.


### Interrupted client report recovery

After the wallet returns a transaction hash, the client writes that hash, purchase ID and bound payer to a device-local recovery marker before calling the report endpoint. It retries the same idempotent report once. If both attempts fail, the UI retains the hash and does not offer another broadcast. On refresh, the client reconstructs the same purchase intent from the server pending row plus the saved hash, re-attaches that exact hash to the backend, and only then retries verification. The local marker is cleared after verified activation. This is recovery evidence, not payment authority; the backend still validates the quote, payer, receiver, exact wei amount, chain, receipt and confirmations.
