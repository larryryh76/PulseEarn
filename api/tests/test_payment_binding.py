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


class TestExpiredPaymentRecoveryAttachment(unittest.TestCase):
    def setUp(self):
        self.source = tfg._read(tfg.INDEX_SRC)
        self.verify_handler = tfg._handler_body(self.source, "verify_psemine_tool_purchase")
        self.create_handler = tfg._handler_body(self.source, "mine_create_purchase")
        self.quote_handler = tfg._handler_body(self.source, "generate_psemine_tool_quote")

    def test_legacy_unproven_intents_are_superseded_or_recovery_locked(self):
        self.assertIn("stored.get('payerBindingVerified') is not True and stored.get('walletProofVerified') is not True", self.create_handler)
        self.assertIn("'status': 'superseded'", self.create_handler)
        self.assertIn("PAYMENT_RECOVERY_LOCKED", self.create_handler)
        self.assertIn("stored.get('transactionHash')", self.create_handler)

    def test_purchase_intent_does_not_require_a_non_payment_signature(self):
        self.assertNotIn("walletSignature", self.create_handler)
        self.assertNotIn("verify_psemine_wallet_proof", self.create_handler)
        # New intents carry a payer-binding marker; legacy signed intents remain supported.
        self.assertIn("'payerBindingVerified': True", self.create_handler)
        self.assertIn("payerBindingVerified", self.verify_handler)
        self.assertNotIn("WALLET_PROOF_REQUIRED", self.create_handler)
        self.assertNotIn("WALLET_PROOF_REQUIRED", self.verify_handler)

    def test_expired_submitted_hash_is_recorded_not_silently_discarded(self):
        self.assertIn("_flag_expired_purchase", self.verify_handler)
        self.assertIn("PAYMENT_REQUIRES_REVIEW", self.verify_handler)
        self.assertIn("status': 'manual_review'", self.verify_handler)
        self.assertIn("Do not send another payment", self.verify_handler)

    def test_attached_recovery_is_required_to_retry_expired_quote(self):
        self.assertIn("recovery_authorized", self.verify_handler)
        self.assertIn("_recovery_data.get('status') == 'attached'", self.verify_handler)
        self.assertIn("_recovery_data.get('attachedPurchaseId') == purchase_id", self.verify_handler)
        self.assertIn("if expires_at_raw and not recovery_authorized", self.verify_handler)
        self.assertIn("if datetime.now(timezone.utc) > exp_dt", self.verify_handler)
        self.assertIn("if datetime.now(timezone.utc) > q_exp_dt and not recovery_authorized", self.verify_handler)
        self.assertIn("if recovery_authorized and recovery_case_id:", self.verify_handler)
        self.assertIn("'lastVerificationError'", self.verify_handler)
        self.assertIn("PAYMENT_UNDER_REVIEW", self.create_handler)
        self.assertIn("MISSING_PURCHASE_QUOTE_EXPIRY", self.verify_handler)
        self.assertIn("MISSING_SERVER_QUOTE_EXPIRY", self.verify_handler)
        self.assertIn("MISSING_LEGACY_QUOTE_EXPIRY", self.source)

    def test_admin_attachment_binds_case_to_matching_user_quote_and_tx(self):
        db = tpc.FakeDB()
        _orig_ts = psemine_engine.firestore_server_ts
        psemine_engine.firestore_server_ts = lambda: tpc.TS
        tx_hash = "0x" + "cd" * 32
        purchase_id = "purchase_user1"
        try:
            db.collection("psemine_purchases").document(purchase_id).set({
                "id": purchase_id,
                "userId": "user1",
                "quoteId": "quote_user1",
                "transactionHash": tx_hash,
                "status": "manual_review",
            })
            recovery_id = psemine_engine.create_payment_recovery(
                db, "user1", tx_hash=tx_hash, quote_id="quote_user1",
                purchase_id=purchase_id, reason="QUOTE_EXPIRED_AT_VERIFICATION",
            )
            result = psemine_engine.admin_resolve_payment_recovery(
                db, recovery_id, "admin1", "attach_to_purchase",
                notes="Verified transaction details", purchase_id=purchase_id,
            )
            self.assertTrue(result.get("ok"), result)
            purchase = db.collection("psemine_purchases").document(purchase_id).get().to_dict()
            recovery = db.collection("psemine_payment_recovery").document(recovery_id).get().to_dict()
            self.assertEqual("manual_review", purchase["status"])
            self.assertEqual(recovery_id, purchase["recoveryCaseId"])
            self.assertEqual(tx_hash, purchase["transactionHash"])
            self.assertEqual("attached", recovery["status"])
            self.assertEqual(purchase_id, recovery["attachedPurchaseId"])
        finally:
            psemine_engine.firestore_server_ts = _orig_ts

    def test_admin_cannot_attach_recovery_to_an_already_activated_purchase(self):
        db = tpc.FakeDB()
        _orig_ts = psemine_engine.firestore_server_ts
        psemine_engine.firestore_server_ts = lambda: tpc.TS
        tx_hash = "0x" + "12" * 32
        try:
            db.collection("psemine_purchases").document("purchase_user1").set({
                "id": "purchase_user1",
                "userId": "user1",
                "quoteId": "quote_user1",
                "transactionHash": tx_hash,
                "status": "activated",
            })
            recovery_id = psemine_engine.create_payment_recovery(
                db, "user1", tx_hash=tx_hash, quote_id="quote_user1",
                purchase_id="purchase_user1", reason="DUPLICATE_REVIEW_TEST",
            )
            result = psemine_engine.admin_resolve_payment_recovery(
                db, recovery_id, "admin1", "attach_to_purchase",
                purchase_id="purchase_user1",
            )
            self.assertFalse(result.get("ok"))
            self.assertEqual("PURCHASE_ALREADY_ACTIVATED", result.get("error"))
            purchase = db.collection("psemine_purchases").document("purchase_user1").get().to_dict()
            self.assertEqual("activated", purchase["status"])
        finally:
            psemine_engine.firestore_server_ts = _orig_ts

    def test_admin_cannot_attach_another_users_purchase(self):
        db = tpc.FakeDB()
        _orig_ts = psemine_engine.firestore_server_ts
        psemine_engine.firestore_server_ts = lambda: tpc.TS
        tx_hash = "0x" + "ef" * 32
        try:
            db.collection("psemine_purchases").document("purchase_user2").set({
                "id": "purchase_user2",
                "userId": "user2",
                "quoteId": "quote_user1",
                "transactionHash": tx_hash,
                "status": "manual_review",
            })
            recovery_id = psemine_engine.create_payment_recovery(
                db, "user1", tx_hash=tx_hash, quote_id="quote_user1",
                purchase_id="purchase_user1", reason="QUOTE_EXPIRED_AT_VERIFICATION",
            )
            result = psemine_engine.admin_resolve_payment_recovery(
                db, recovery_id, "admin1", "attach_to_purchase",
                purchase_id="purchase_user2",
            )
            self.assertFalse(result.get("ok"))
            self.assertEqual("PURCHASE_MISMATCH", result.get("error"))
            recovery = db.collection("psemine_payment_recovery").document(recovery_id).get().to_dict()
            self.assertEqual("open", recovery["status"])
        finally:
            psemine_engine.firestore_server_ts = _orig_ts


if __name__ == "__main__":
    unittest.main()


class TestTransactionHashValidation(unittest.TestCase):
    """The verification endpoint must reject malformed hashes before any RPC."""

    def test_verifier_requires_exact_32_byte_hex_hash(self):
        handler = tfg._handler_body(tfg._read(tfg.INDEX_SRC), "verify_psemine_tool_purchase")
        self.assertIn("_tx_re.fullmatch(r'0x[0-9a-f]{64}', tx_hash)", handler)
        self.assertIn('"error": "INVALID_TRANSACTION_HASH"', handler)
        self.assertNotIn("len(tx_hash) != 66", handler)


class TestPurchaseSubmissionStateMonotonicity(unittest.TestCase):
    """Duplicate client reports must not regress a later backend status."""

    def test_same_hash_retry_preserves_confirming_status_without_duplicate_write(self):
        handler = tfg._handler_body(tfg._read(tfg.INDEX_SRC), "mine_report_purchase_submission")
        self.assertIn("transition_purchase_state", handler)
        self.assertIn('"report_submission"', handler)
        decision = tfg._read(tfg.ENGINE_SRC) if hasattr(tfg, "ENGINE_SRC") else open(
            os.path.join(os.path.dirname(tfg.INDEX_SRC), "psemine_engine.py"), encoding="utf-8"
        ).read()
        self.assertIn('existing_hash == requested_hash', decision)
        self.assertIn('"transaction_submitted", "confirming", "manual_review"', decision)
        self.assertIn('"idempotent": True', decision)


class TestAtomicPurchaseIntentReservation(unittest.TestCase):
    """The per-user/tool lock and purchase write must share one Firestore txn."""

    def test_create_handler_uses_transactional_lock(self):
        handler = _create_handler()
        self.assertIn("psemine_purchase_locks", handler)
        self.assertIn("@firestore.transactional", handler)
        self.assertIn("lock_ref.get(transaction=txn)", handler)
        self.assertIn("txn.set(purchase_ref, payload)", handler)
        self.assertIn("txn.set(lock_ref", handler)

    def test_concurrent_reuse_and_conflict_are_decided_inside_lock_transaction(self):
        handler = _create_handler()
        txn_start = handler.index("def _create_purchase_once(txn):")
        txn_end = handler.index("try:\n        create_result", txn_start)
        txn = handler[txn_start:txn_end]
        self.assertIn("purchase_intent_reuse_decision", txn)
        self.assertIn("'kind': 'reuse'", txn)
        self.assertIn("'kind': 'mismatch'", txn)
        self.assertIn("'kind': 'blocked'", txn)
        self.assertIn("txn.update(locked_ref", txn)


class TestUncertainRecoveryPreservesKnownHash(unittest.TestCase):
    """A known transaction hash must never be downgraded to unknown submission."""

    def test_mark_uncertain_refuses_when_hash_is_already_recorded(self):
        handler = tfg._handler_body(tfg._read(tfg.INDEX_SRC), "mine_mark_purchase_uncertain")
        self.assertIn("transition_purchase_state", handler)
        self.assertIn('"mark_uncertain"', handler)
        decision = open(
            os.path.join(os.path.dirname(tfg.INDEX_SRC), "psemine_engine.py"), encoding="utf-8"
        ).read()
        self.assertIn('if existing_hash:', decision)
        self.assertIn('"TRANSACTION_HASH_ALREADY_RECORDED"', decision)


class TestAtomicPurchasePaymentStateMachine(unittest.TestCase):
    """All user submission/recovery mutations are monotonic and transactional."""

    TX_A = "0x" + "ab" * 32
    TX_B = "0x" + "cd" * 32

    def _db(self, status="awaiting_payment", tx_hash=None):
        db = tpc.FakeDB()
        db.collection("psemine_purchases").document("purchase1").set({
            "id": "purchase1",
            "userId": "user1",
            "toolId": "starter",
            "status": status,
            "paymentWallet": WALLET_A,
            "transactionHash": tx_hash,
        })
        return db

    def _transition(self, db, action, **kwargs):
        return psemine_engine.transition_purchase_state(
            db, "purchase1", "user1", action,
            updated_at="server-time", **kwargs,
        )

    def test_uncertain_to_hash_submission_advances_monotonically(self):
        db = self._db()
        uncertain = self._transition(db, "mark_uncertain")
        self.assertTrue(uncertain["ok"])
        self.assertEqual("submission_uncertain", uncertain["status"])
        submitted = self._transition(
            db, "report_submission", tx_hash=self.TX_A, sender_wallet=WALLET_A,
        )
        self.assertTrue(submitted["ok"])
        self.assertEqual("transaction_submitted", submitted["status"])
        purchase = db.collection("psemine_purchases").document("purchase1").get().to_dict()
        self.assertEqual(self.TX_A, purchase["transactionHash"])
        self.assertEqual("transaction_submitted", purchase["status"])

    def test_known_hash_cannot_be_downgraded_to_uncertain_or_closed(self):
        db = self._db("transaction_submitted", self.TX_A)
        uncertain = self._transition(db, "mark_uncertain")
        self.assertFalse(uncertain["ok"])
        self.assertEqual("TRANSACTION_HASH_ALREADY_RECORDED", uncertain["error"])
        closed = self._transition(db, "resolve_no_broadcast")
        self.assertFalse(closed["ok"])
        self.assertEqual("PURCHASE_NOT_UNCERTAIN", closed["error"])
        purchase = db.collection("psemine_purchases").document("purchase1").get().to_dict()
        self.assertEqual("transaction_submitted", purchase["status"])
        self.assertEqual(self.TX_A, purchase["transactionHash"])

    def test_conflicting_hash_is_rejected_without_overwriting_original(self):
        db = self._db("transaction_submitted", self.TX_A)
        result = self._transition(
            db, "report_submission", tx_hash=self.TX_B, sender_wallet=WALLET_A,
        )
        self.assertFalse(result["ok"])
        self.assertEqual("SUBMISSION_HASH_CONFLICT", result["error"])
        purchase = db.collection("psemine_purchases").document("purchase1").get().to_dict()
        self.assertEqual(self.TX_A, purchase["transactionHash"])

    def test_duplicate_hash_is_idempotent_and_preserves_confirming(self):
        db = self._db("confirming", self.TX_A)
        result = self._transition(
            db, "report_submission", tx_hash=self.TX_A, sender_wallet=WALLET_A,
        )
        self.assertTrue(result["ok"])
        self.assertTrue(result["idempotent"])
        self.assertEqual("confirming", result["status"])
        purchase = db.collection("psemine_purchases").document("purchase1").get().to_dict()
        self.assertEqual("confirming", purchase["status"])

    def test_manual_review_is_not_regressed_by_duplicate_hash_report(self):
        db = self._db("manual_review", self.TX_A)
        result = self._transition(
            db, "report_submission", tx_hash=self.TX_A, sender_wallet=WALLET_A,
        )
        self.assertTrue(result["ok"])
        self.assertEqual("manual_review", result["status"])
        purchase = db.collection("psemine_purchases").document("purchase1").get().to_dict()
        self.assertEqual("manual_review", purchase["status"])

    def test_wrong_owner_cannot_transition_purchase(self):
        db = self._db()
        result = psemine_engine.transition_purchase_state(
            db, "purchase1", "user2", "mark_uncertain",
            updated_at="server-time",
        )
        self.assertFalse(result["ok"])
        self.assertEqual("FORBIDDEN", result["error"])
        purchase = db.collection("psemine_purchases").document("purchase1").get().to_dict()
        self.assertEqual("awaiting_payment", purchase["status"])

    def test_no_broadcast_requires_uncertain_state_and_no_hash(self):
        db = self._db()
        refused = self._transition(db, "resolve_no_broadcast")
        self.assertFalse(refused["ok"])
        self.assertEqual("PURCHASE_NOT_UNCERTAIN", refused["error"])
        self._transition(db, "mark_uncertain")
        closed = self._transition(db, "resolve_no_broadcast")
        self.assertTrue(closed["ok"])
        self.assertEqual("abandoned_no_broadcast", closed["status"])
        purchase = db.collection("psemine_purchases").document("purchase1").get().to_dict()
        self.assertEqual("abandoned_no_broadcast", purchase["status"])

    def test_verifier_requires_persisted_hash_and_rechecks_state_inside_activation_txn(self):
        source = tfg._read(tfg.INDEX_SRC)
        handler = tfg._handler_body(source, "verify_psemine_tool_purchase")
        self.assertIn("persisted_hash != tx_hash", handler)
        self.assertIn("TRANSACTION_SUBMISSION_REQUIRED", handler)
        self.assertIn("p_curr_data.get('transactionHash')", handler)
        self.assertIn("p_curr_data.get('status') not in allowed_activation_states", handler)
        self.assertIn("transaction_submitted", handler)
        self.assertIn("manual_review", handler)

    def test_submission_and_recovery_handlers_delegate_to_transactional_guard(self):
        source = tfg._read(tfg.INDEX_SRC)
        for handler_name, action in (
            ("mine_mark_purchase_uncertain", '"mark_uncertain"'),
            ("mine_report_purchase_submission", '"report_submission"'),
            ("mine_resolve_purchase_no_broadcast", '"resolve_no_broadcast"'),
        ):
            handler = tfg._handler_body(source, handler_name)
            self.assertIn("transition_purchase_state", handler)
            self.assertIn(action, handler)
            self.assertNotIn("ref.update({", handler)



    def test_verifier_uses_bounded_bsc_rpc_failover_without_exposing_provider_errors(self):
        source = tfg._read(tfg.INDEX_SRC)
        pool_start = source.index("def _psemine_bsc_rpc_urls(")
        verifier_start = source.index("def verify_bsc_transaction(", pool_start)
        verifier_end = source.index("\ndef recalculate_psemine_user_mining_state", verifier_start)
        pool = source[pool_start:verifier_start]
        verifier = source[verifier_start:verifier_end]
        self.assertIn("PSEMINE_BSC_RPC_URL", pool)
        self.assertIn("PSEMINE_BSC_RPC_FALLBACKS", pool)
        self.assertIn("https://bsc-dataseed.bnbchain.org", pool)
        self.assertIn("https://bsc-dataseed-public.bnbchain.org", pool)
        self.assertIn("for rpc_url in rpc_urls", verifier)
        self.assertIn("rpc_deadline", verifier)
        self.assertIn("timeout=min(6.0, remaining)", verifier)
        self.assertIn("continue", verifier)
        self.assertNotIn("str(exc)", verifier)
        self.assertIn("TRANSACTION_NOT_FOUND", verifier)
        self.assertIn("INSUFFICIENT_CONFIRMATIONS", verifier)

    def test_recovery_attachment_is_revalidated_inside_activation_transaction(self):
        source = tfg._read(tfg.INDEX_SRC)
        handler = tfg._handler_body(source, "verify_psemine_tool_purchase")
        self.assertIn("recovery_ref.get(transaction=txn)", handler)
        self.assertIn("recovery_data.get('status') != 'attached'", handler)
        self.assertIn("recovery_data.get('attachedPurchaseId') != purchase_id", handler)
        self.assertIn("recovery_data.get('txHash')", handler)
        self.assertIn("RECOVERY_CASE_NOT_ATTACHED", handler)
