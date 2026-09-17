"""
Payer-binding regressions for the PSEmine tool purchase.

WHAT IS BEING PROTECTED
-----------------------
A purchase intent is now created BEFORE the wallet is asked to sign, and the
wallet recorded on it (`paymentWallet`) is the payer the on-chain sender is
checked against at verification. Three things follow, and each is tested here:

  1. A later `POST /api/mine/purchases/create` must not be able to move that
     binding to another wallet — otherwise a client could quote with wallet A,
     switch to wallet B, re-create the intent as B and pay from B, and the
     on-chain sender check would be decorative.
  2. The purchase owner and the payer come from the AUTHENTICATED request, never
     from the request body.
  3. Activation writes the payer derived from the binding decision, not a raw
     client-supplied address.

The wallet-switch case (A bound → B pays) must end in WALLET_MISMATCH with a
`psemine_payment_recovery` record written for manual review — never a silent
reassignment to B.

Run: python3 -m unittest discover api/tests
"""
import os
import sys
import unittest
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import psemine_engine  # noqa: E402
import test_payout_composition as tpc  # noqa: E402  (in-memory Firestore double)
import test_final_gates as tfg  # noqa: E402  (source readers for index.py)

WALLET_A = "0xaaa0000000000000000000000000000000000001"
WALLET_B = "0xbbb0000000000000000000000000000000000002"


def _create_handler():
    """The real /api/mine/purchases/create handler body, read from source."""
    return tfg._handler_body(tfg._read(tfg.INDEX_SRC), "mine_create_purchase")


class TestPurchaseIntentReuseDecision(unittest.TestCase):
    """A live intent keeps its payer; only a lapsed one may be superseded."""

    def _live(self):
        return (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()

    def _lapsed(self):
        return (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()

    def test_same_payer_is_reused(self):
        self.assertEqual(
            ("reuse", None),
            psemine_engine.purchase_intent_reuse_decision(WALLET_A, WALLET_A.upper(), self._live()),
        )

    def test_same_payer_case_insensitive(self):
        self.assertEqual(
            ("reuse", None),
            psemine_engine.purchase_intent_reuse_decision(WALLET_A, WALLET_A.replace("aaa", "AAA"), self._live()),
        )

    def test_empty_binding_is_reused_idempotently(self):
        self.assertEqual(
            ("reuse", None),
            psemine_engine.purchase_intent_reuse_decision("", "", self._live()),
        )

    def test_wallet_switch_inside_the_quote_window_is_refused(self):
        """Wallet A → intent → Wallet B while A's quote is live: WALLET_MISMATCH."""
        action, code = psemine_engine.purchase_intent_reuse_decision(WALLET_A, WALLET_B, self._live())
        self.assertEqual("rebind_forbidden", action)
        self.assertEqual("WALLET_MISMATCH", code)

    def test_wallet_switch_after_the_quote_lapsed_supersedes_without_rewriting(self):
        """A lapsed intent can never be verified, so a fresh one is created —
        and the stored record (its payer included) is never touched."""
        action, code = psemine_engine.purchase_intent_reuse_decision(WALLET_A, WALLET_B, self._lapsed())
        self.assertEqual("supersede", action)
        self.assertIsNone(code)

    def test_unparseable_expiry_is_treated_as_lapsed(self):
        """Refusing forever would lock the account out of a tier; superseding is
        safe because the old record keeps its own quote binding."""
        self.assertEqual(
            ("supersede", None),
            psemine_engine.purchase_intent_reuse_decision(WALLET_A, WALLET_B, "not-a-timestamp"),
        )
        self.assertEqual(
            ("supersede", None),
            psemine_engine.purchase_intent_reuse_decision(WALLET_A, WALLET_B, None),
        )

    def test_legacy_intent_without_a_payer_is_superseded_not_rebound(self):
        """An intent with no payer (legacy / zero placeholder) is not 'rebound':
        it is left alone and a new bound intent is created."""
        for stored in ("", None, psemine_engine.ZERO_ADDRESS):
            self.assertEqual(
                ("supersede", None),
                psemine_engine.purchase_intent_reuse_decision(stored, WALLET_A, self._live()),
                f"stored={stored!r}",
            )


class TestCreateEndpointCannotRebindPayer(unittest.TestCase):
    """The create handler must consult the decision function for every match."""

    def setUp(self):
        self.handler = _create_handler()

    def test_handler_uses_the_decision_function(self):
        self.assertIn("purchase_intent_reuse_decision", self.handler)

    def test_no_unconditional_reuse_of_an_existing_intent(self):
        """The old shape returned the first awaiting intent for ANY wallet."""
        self.assertNotIn(
            'for e in existing:\n        return jsonify({"success": True',
            self.handler,
            "an existing intent is handed back without checking its bound payer",
        )

    def test_rebind_is_refused_with_wallet_mismatch_and_nothing_written(self):
        segment = self.handler[self.handler.index("action == 'rebind_forbidden'"):]
        segment = segment[: segment.index("'supersede'")]
        self.assertIn('"WALLET_MISMATCH"', segment)
        self.assertRegex(segment, r"\}\), 409")
        for write in (".set(", ".update(", "create_payment_recovery", "psemine_purchases"):
            self.assertNotIn(write, segment, f"the refusal path performs {write}")

    def test_owner_and_payer_come_from_the_authenticated_request(self):
        self.assertIn("uid = request.user['uid']", self.handler)
        self.assertIn("'userId': uid", self.handler)
        self.assertNotIn("data.get('userId')", self.handler, "purchase owner must not be client-declared")

    def test_zero_address_is_not_an_acceptable_payer(self):
        """A bound payer of 0x0 is no binding at all — verification would have to
        trust a declared sender, which is what this endpoint must prevent."""
        self.assertIn("'0x' + '0' * 40", self.handler)

    def test_intent_is_created_before_any_transaction_hash_exists(self):
        """The payload is written with paymentWallet and transactionHash None —
        i.e. the binding exists before a signature can exist."""
        self.assertIn("'paymentWallet': payment_wallet", self.handler)
        self.assertIn("'transactionHash': None", self.handler)


class TestWalletSwitchIsRejectedAtVerification(unittest.TestCase):
    """Wallet A bound → wallet B pays: rejected, recorded, never reassigned."""

    def setUp(self):
        self.handler = tfg._handler_body(tfg._read(tfg.INDEX_SRC), "verify_psemine_tool_purchase")

    def test_binding_decision_rejects_the_second_wallet(self):
        ok, code, expected = psemine_engine.purchase_sender_binding(WALLET_B, WALLET_A)
        self.assertFalse(ok)
        self.assertEqual("WALLET_MISMATCH", code)
        # The expectation stays the BOUND wallet — B never becomes the payer.
        self.assertEqual(WALLET_A, expected)

    def test_recovery_evidence_is_written_before_the_rejection_returns(self):
        self.assertLess(
            self.handler.index("create_payment_recovery"),
            self.handler.index('"error": "WALLET_MISMATCH"'),
        )

    def test_recovery_record_is_open_and_names_the_offending_sender(self):
        db = tpc.FakeDB()
        _orig_ts = psemine_engine.firestore_server_ts
        psemine_engine.firestore_server_ts = lambda: tpc.TS
        try:
            recovery_id = psemine_engine.create_payment_recovery(
                db, "user1",
                tx_hash="0x" + "ab" * 32,
                quote_id="quote_x", purchase_id="pur_x",
                sender=WALLET_B, recipient=psemine_engine.ZERO_ADDRESS,
                chain_id=56, reason="WALLET_MISMATCH",
            )
            snap = db.collection("psemine_payment_recovery").document(recovery_id).get()
            self.assertTrue(snap.exists)
            doc = snap.to_dict()
            self.assertEqual("open", doc["status"])
            self.assertEqual(WALLET_B, doc["sender"])
            self.assertEqual("WALLET_MISMATCH", doc["reason"])
        finally:
            psemine_engine.firestore_server_ts = _orig_ts

    def test_purchase_record_keeps_its_bound_payer(self):
        """Nothing in the mismatch path rewrites the stored binding."""
        segment = self.handler[: self.handler.index('"error": "WALLET_MISMATCH"')]
        self.assertNotIn("paymentWallet':", segment)


class TestActivationPayerIsServerDerived(unittest.TestCase):
    """The activation write must not be able to adopt a client-declared wallet."""

    def setUp(self):
        self.source = tfg._read(tfg.INDEX_SRC)

    def test_activation_writes_the_binding_decision(self):
        self.assertIn(
            "'paymentWallet': (expected_sender or p_curr.to_dict().get('paymentWallet') or '').lower()",
            self.source,
        )

    def test_raw_client_sender_is_never_written_as_the_payer(self):
        self.assertNotIn(
            "'paymentWallet': (sender_wallet or p_curr.to_dict().get('paymentWallet') or '').lower()",
            self.source,
            "activation still prefers the client-declared sender over the bound payer",
        )

    def test_expected_sender_comes_from_the_binding_helper(self):
        handler = tfg._handler_body(self.source, "verify_psemine_tool_purchase")
        self.assertIn("purchase_sender_binding", handler)
        self.assertIn("expected_sender", handler)


if __name__ == "__main__":
    unittest.main()
