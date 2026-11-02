import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from eth_account import Account
from eth_account.messages import encode_defunct

from psemine_wallet_proof import (
    build_psemine_wallet_proof_message,
    verify_psemine_wallet_proof,
)


class TestPSEmineWalletOwnershipProof(unittest.TestCase):
    def setUp(self):
        self.account = Account.create()
        self.user_id = "firebase-user-123"
        self.wallet = self.account.address.lower()
        self.quote = {
            "quoteId": "quote_starter_123_1793560000000",
            "walletProofNonce": "a1b2c3d4e5f60718293a4b5c6d7e8f90",
            "chainId": 56,
            "expiresAt": "2026-11-01T20:00:00+00:00",
        }

    def _signature(self, user_id=None, quote=None, wallet=None):
        message = build_psemine_wallet_proof_message(
            user_id or self.user_id,
            quote or self.quote,
            wallet or self.wallet,
        )
        return Account.sign_message(
            encode_defunct(text=message),
            private_key=self.account.key,
        ).signature.hex()

    def test_valid_proof_recovers_the_bound_payer(self):
        signature = self._signature()
        self.assertTrue(
            verify_psemine_wallet_proof(
                self.user_id, self.quote, self.wallet, signature
            )
        )

    def test_proof_cannot_be_replayed_for_another_firebase_account(self):
        signature = self._signature()
        self.assertFalse(
            verify_psemine_wallet_proof(
                "different-firebase-user", self.quote, self.wallet, signature
            )
        )

    def test_proof_cannot_be_replayed_for_another_quote_or_nonce(self):
        signature = self._signature()
        other_quote = {**self.quote, "quoteId": "different-quote", "walletProofNonce": "f" * 32}
        self.assertFalse(
            verify_psemine_wallet_proof(
                self.user_id, other_quote, self.wallet, signature
            )
        )

    def test_proof_cannot_be_replayed_for_another_wallet(self):
        signature = self._signature()
        other = Account.create().address.lower()
        self.assertFalse(
            verify_psemine_wallet_proof(
                self.user_id, self.quote, other, signature
            )
        )

    def test_missing_nonce_or_wrong_chain_fails_closed(self):
        missing_nonce = {**self.quote, "walletProofNonce": ""}
        wrong_chain = {**self.quote, "chainId": 97}
        signature = self._signature()
        self.assertFalse(
            verify_psemine_wallet_proof(
                self.user_id, missing_nonce, self.wallet, signature
            )
        )
        self.assertFalse(
            verify_psemine_wallet_proof(
                self.user_id, wrong_chain, self.wallet, signature
            )
        )

    def test_malformed_signature_fails_closed(self):
        self.assertFalse(
            verify_psemine_wallet_proof(
                self.user_id, self.quote, self.wallet, "0x1234"
            )
        )


if __name__ == "__main__":
    unittest.main()
