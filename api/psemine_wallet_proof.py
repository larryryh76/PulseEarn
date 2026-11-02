"""EIP-191 wallet ownership proofs for authenticated PSEmine purchases.

A transaction sender check alone does not prove that a wallet belongs to the
Firebase account that created an order: another account could pre-bind a public
address and race to claim its later payment. This module binds the account,
quote, payer, network, nonce and expiry into a message signed by the wallet.
The signature never authorizes or transfers funds.
"""

from __future__ import annotations

import re
from typing import Any, Mapping


def build_psemine_wallet_proof_message(
    user_id: str,
    quote: Mapping[str, Any],
    wallet_address: str,
) -> str:
    """Build the exact EIP-191 message the wallet must sign."""
    nonce = str(quote.get("walletProofNonce") or "").strip()
    quote_id = str(quote.get("quoteId") or "").strip()
    expires_at = str(quote.get("expiresAt") or "").strip()
    chain_id = quote.get("chainId")
    wallet = str(wallet_address or "").strip().lower()
    if not user_id or not quote_id or not nonce or not expires_at:
        raise ValueError("Wallet proof quote is incomplete")
    if not isinstance(chain_id, int) or chain_id != 56:
        raise ValueError("Wallet proof must be for BNB Smart Chain")
    if not re.fullmatch(r"0x[0-9a-f]{40}", wallet):
        raise ValueError("Wallet proof address is invalid")

    return "\n".join((
        "PulseEarn PSEmine Wallet Ownership Verification",
        "Sign this message to prove you control the payer wallet for this purchase.",
        "This signature does not send funds or approve a token transfer.",
        f"Account UID: {user_id}",
        f"Quote ID: {quote_id}",
        f"Wallet: {wallet}",
        f"Chain ID: {chain_id}",
        f"Nonce: {nonce}",
        f"Expires At: {expires_at}",
    ))


def verify_psemine_wallet_proof(
    user_id: str,
    quote: Mapping[str, Any],
    wallet_address: str,
    signature: str,
) -> bool:
    """Recover the signer and require it to match the quote's declared payer."""
    if not isinstance(signature, str):
        return False
    # Wallet libraries and eth-account versions differ on whether HexBytes.hex()
    # includes the 0x prefix. Normalize that representation without relaxing
    # the required 65-byte ECDSA signature length or accepting non-hex input.
    normalized_signature = signature.strip()
    if not normalized_signature.startswith(("0x", "0X")):
        normalized_signature = "0x" + normalized_signature
    if not re.fullmatch(r"0x[0-9a-fA-F]{130}", normalized_signature):
        return False
    try:
        from eth_account import Account
        from eth_account.messages import encode_defunct

        message = build_psemine_wallet_proof_message(user_id, quote, wallet_address)
        recovered = Account.recover_message(encode_defunct(text=message), signature=normalized_signature)
        return recovered.lower() == str(wallet_address or "").strip().lower()
    except Exception:
        return False
