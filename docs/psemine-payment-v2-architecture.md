# PSEmine direct on-chain tool payments

## Product decision

PSEmine tool purchases use the existing WalletConnect/Reown wallet session and direct native BNB transfers on BNB Smart Chain (chain ID 56). There is no hosted checkout provider, merchant API key, IPN secret, or provider account.

The purchase receiver is the campaign receiving wallet configured and explicitly confirmed by an authorized administrator in the PSEmine admin. The user's payout/withdrawal destination remains a separate setting and must never be reused as the purchase receiver.

## Purchase lifecycle

1. The authenticated user selects a tool.
2. The backend creates an immutable purchase intent using the canonical GBP tool price and a fresh server-side BNB/GBP quote. The intent binds the authenticated UID, selected tool, payer wallet, receiver wallet, chain ID, exact wei amount, quote ID, and expiry.
3. The browser asks the connected wallet to switch to BNB Smart Chain if needed and requests one explicit `eth_sendTransaction` approval for the exact native BNB transfer. No transfer is sent without the user's wallet approval.
6. The client submits the transaction hash to the authenticated verification endpoint.
7. The backend independently verifies the transaction receipt and on-chain transaction: BSC chain, successful receipt, exact receiver, exact wei amount, bound sender, quote expiry, and required confirmations.
8. Settlement is idempotent. A verified payment activates exactly one tool ownership and writes the corresponding purchase/revenue records atomically. Duplicate hashes, repeated requests, mismatched wallets, late payments, and uncertain broadcasts cannot silently activate or charge twice.
9. If wallet submission is uncertain, the user must check wallet activity and provide the existing transaction hash for verification; the UI must never automatically broadcast a second transfer.

## Trust boundaries

- The server, not the browser, chooses the GBP price, exchange quote, receiver, exact wei amount, chain ID, quote expiry, and order ownership.
- The frontend may only submit the transaction hash and the declared payer address. Neither is proof of payment.
- A quote-specific EIP-191 signature proves control of the payer wallet for this Firebase account before an intent is created. The backend recovers the signer; it never trusts a client-supplied address alone.
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
