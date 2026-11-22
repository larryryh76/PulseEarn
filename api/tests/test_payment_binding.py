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

    def test_admin_cannot_reject_recovery_with_purchase_or_hash_evidence(self):
        db = tpc.FakeDB()
        tx_hash = self.TX_A
        recovery_id = psemine_engine.create_payment_recovery(
            db, "user1", tx_hash=tx_hash, quote_id="quote1",
            purchase_id="purchase1", reason="RPC_ERROR",
        )
        result = psemine_engine.admin_resolve_payment_recovery(
            db, recovery_id, "admin1", "reject", notes="Reviewed",
        )
        self.assertFalse(result["ok"])
        self.assertEqual("PAYMENT_CASE_REQUIRES_RECONCILIATION", result["error"])
        recovery = db.collection("psemine_payment_recovery").document(recovery_id).get().to_dict()
        self.assertEqual("open", recovery["status"])

    def test_recovery_filter_route_only_accepts_known_statuses(self):
        source = tfg._read(tfg.INDEX_SRC)
        handler = tfg._handler_body(source, "admin_mine_payment_recovery")
        self.assertIn("allowed_statuses", handler)
        self.assertIn("'attached'", handler)
        self.assertIn("'reviewed'", handler)
        self.assertIn("INVALID_RECOVERY_STATUS", handler)

    def test_admin_overview_exposes_separate_purchase_gate_state(self):
        source = tfg._read(tfg.INDEX_SRC)
        handler = tfg._handler_body(source, "admin_psemine_overview")
        self.assertIn('"purchaseReady": bool(configured_receiver)', handler)
        self.assertIn('"purchaseEnabled": campaign_config.get("purchaseEnabled") is True', handler)
        self.assertIn('"canManageCampaign": is_admin(request.user["uid"])', handler)

    def test_repeated_admin_recovery_attachment_is_idempotent(self):
        db = tpc.FakeDB()
        original_ts = psemine_engine.firestore_server_ts
        psemine_engine.firestore_server_ts = lambda: tpc.TS
        tx_hash = self.TX_A
        try:
            db.collection("psemine_purchases").document("purchase1").set({
                "id": "purchase1", "userId": "user1", "quoteId": "quote1",
                "transactionHash": tx_hash, "status": "manual_review",
            })
            recovery_id = psemine_engine.create_payment_recovery(
                db, "user1", tx_hash=tx_hash, quote_id="quote1",
                purchase_id="purchase1", reason="RPC_ERROR",
            )
            first = psemine_engine.admin_resolve_payment_recovery(
                db, recovery_id, "admin1", "attach_to_purchase",
                purchase_id="purchase1",
            )
            second = psemine_engine.admin_resolve_payment_recovery(
                db, recovery_id, "admin1", "attach_to_purchase",
                purchase_id="purchase1",
            )
            self.assertTrue(first["ok"])
            self.assertTrue(second["ok"])
            self.assertTrue(second.get("idempotent"))
            self.assertEqual("attached", second["status"])
            audit_rows = db.collection("admin_audit_logs").get()
            self.assertEqual(1, len(audit_rows), "idempotent retries must not duplicate audit entries")
        finally:
            psemine_engine.firestore_server_ts = original_ts

    def test_admin_can_attach_hash_evidence_to_uncertain_or_user_closed_intent(self):
        for status in ("submission_uncertain", "abandoned_no_broadcast"):
            db = tpc.FakeDB()
            original_ts = psemine_engine.firestore_server_ts
            psemine_engine.firestore_server_ts = lambda: tpc.TS
            try:
                db.collection("psemine_purchases").document("purchase1").set({
                    "id": "purchase1", "userId": "user1", "quoteId": "quote1",
                    "status": status, "transactionHash": None,
                })
                recovery_id = psemine_engine.create_payment_recovery(
                    db, "user1", tx_hash=self.TX_A, quote_id="quote1",
                    purchase_id="purchase1", reason="LATE_HASH_RECOVERY",
                )
                result = psemine_engine.admin_resolve_payment_recovery(
                    db, recovery_id, "admin1", "attach_to_purchase",
                    purchase_id="purchase1",
                )
                self.assertTrue(result["ok"], f"status={status}: {result}")
                purchase = db.collection("psemine_purchases").document("purchase1").get().to_dict()
                self.assertEqual("manual_review", purchase["status"])
                self.assertEqual(self.TX_A, purchase["transactionHash"])
            finally:
                psemine_engine.firestore_server_ts = original_ts

    def test_admin_recovery_cannot_orphan_another_live_purchase_lock(self):
        import uuid
        db = tpc.FakeDB()
        original_ts = psemine_engine.firestore_server_ts
        psemine_engine.firestore_server_ts = lambda: tpc.TS
        try:
            db.collection("psemine_purchases").document("purchase1").set({
                "id": "purchase1", "userId": "user1", "toolId": "starter",
                "quoteId": "quote1", "status": "manual_review",
            })
            db.collection("psemine_purchases").document("purchase2").set({
                "id": "purchase2", "userId": "user1", "toolId": "starter",
                "quoteId": "quote2", "status": "awaiting_payment",
            })
            lock_id = uuid.uuid5(uuid.NAMESPACE_URL, "psemine-purchase:user1:starter").hex
            db.collection("psemine_purchase_locks").document(lock_id).set({
                "userId": "user1", "toolId": "starter", "purchaseId": "purchase2",
            })
            recovery_id = psemine_engine.create_payment_recovery(
                db, "user1", tx_hash=self.TX_A, quote_id="quote1",
                purchase_id="purchase1", reason="LATE_HASH_RECOVERY",
            )
            result = psemine_engine.admin_resolve_payment_recovery(
                db, recovery_id, "admin1", "attach_to_purchase",
                purchase_id="purchase1",
            )
            self.assertFalse(result["ok"])
            self.assertEqual("PURCHASE_LOCK_CONFLICT", result["error"])
            lock = db.collection("psemine_purchase_locks").document(lock_id).get().to_dict()
            self.assertEqual("purchase2", lock["purchaseId"])
            recovery = db.collection("psemine_payment_recovery").document(recovery_id).get().to_dict()
            self.assertEqual("open", recovery["status"])
        finally:
            psemine_engine.firestore_server_ts = original_ts


class TestPurchaseIntentResponseProjection(unittest.TestCase):
    """The create-intent response must be JSON-safe BEFORE it is sent.

    A firestore.SERVER_TIMESTAMP Sentinel is only resolved at commit. Returning
    the raw payload to jsonify raised a 500 after the intent transaction had
    already committed, so the checkout created an orphaned awaiting_payment
    intent and the client never received its purchaseId.
    """

    def test_committed_timestamp_sentinels_are_projected_to_iso(self):
        import json
        sentinel = object()  # stands in for firestore.SERVER_TIMESTAMP
        now_iso = "2026-11-17T17:00:00+00:00"
        payload = {
            "id": "pse_pur_starter_test",
            "userId": "user1",
            "toolId": "starter",
            "paymentWallet": WALLET_A,
            "status": "awaiting_payment",
            "createdAt": sentinel,
            "expiresAt": "2026-11-17T17:15:00+00:00",
            "payerBindingVerifiedAt": sentinel,
        }
        projected = psemine_engine.purchase_intent_response(payload, now_iso)

        # Must serialize exactly as Flask will serialize it.
        encoded = json.dumps(projected)
        self.assertIn(now_iso, encoded)
        self.assertEqual(now_iso, projected["createdAt"])
        self.assertEqual("awaiting_payment", projected["status"])
        self.assertEqual(WALLET_A, projected["paymentWallet"])
        self.assertNotIn("payerBindingVerifiedAt", projected)

    def test_iso_string_expiry_is_preserved_verbatim(self):
        """A live quote's ISO expiry must not be replaced by the creation time.

        Replacing it made the returned intent look already expired, which both
        dead-ended checkout and let a different wallet supersede a live intent.
        """
        expires = "2026-11-17T17:26:11.017977+00:00"
        projected = psemine_engine.purchase_intent_response({
            "id": "p1",
            "createdAt": "2026-11-17T17:11:11.017977+00:00",
            "expiresAt": expires,
        })
        self.assertEqual(expires, projected["expiresAt"])

    def test_datetime_timestamps_are_iso_strings(self):
        import json
        payload = {
            "id": "p1",
            "createdAt": datetime.now(timezone.utc),
            "confirmedAt": None,
        }
        projected = psemine_engine.purchase_intent_response(payload)
        self.assertIsInstance(projected["createdAt"], str)
        self.assertIn("T", projected["createdAt"])
        self.assertIsNone(projected["confirmedAt"])
        json.dumps(projected)

    def test_create_handler_uses_the_json_safe_projection(self):
        body = _create_handler()
        self.assertIn("_pse_engine.purchase_intent_response(", body)
        self.assertNotIn("response_payload = dict(payload)", body,
                         "the raw payload (with Sentinels) must never be returned")


class TestReadOnlyTransactionCommit(unittest.TestCase):
    """A rejected transition buffers no writes; its decision must still surface.

    The Firestore SDK's transactional wrapper commits unconditionally. Firestore
    rejects an empty commit, so every rejection (superseded purchase, wrong
    owner, conflicting hash) surfaced as HTTP 500 instead of its correct 409.
    """

    class _Txn:
        def __init__(self):
            self._write_pbs = []

    class _DB:
        def transaction(self):
            return TestReadOnlyTransactionCommit._Txn()

    @staticmethod
    def _fake_firestore():
        class _FS:
            @staticmethod
            def transactional(fn):
                def run(txn):
                    fn(txn)
                    raise RuntimeError("empty commit rejected")
                return run
        return _FS

    def test_rejected_transition_returns_its_decision_when_empty_commit_fails(self):
        original = psemine_engine._firestore
        psemine_engine._firestore = self._fake_firestore()
        try:
            result = psemine_engine._run_transaction(
                self._DB(),
                lambda txn: {"ok": False, "error": "PURCHASE_NOT_RECOVERABLE"},
            )
        finally:
            psemine_engine._firestore = original
        self.assertFalse(result["ok"])
        self.assertEqual("PURCHASE_NOT_RECOVERABLE", result["error"])

    def test_write_transition_commit_failure_still_propagates(self):
        original = psemine_engine._firestore
        psemine_engine._firestore = self._fake_firestore()
        try:
            with self.assertRaises(RuntimeError):
                psemine_engine._run_transaction(
                    self._DB(),
                    lambda txn: (txn._write_pbs.append(1), {"ok": True})[1],
                )
        finally:
            psemine_engine._firestore = original

    def test_live_intent_with_payer_binding_cannot_be_superseded(self):
        body = _create_handler()
        combined = "stored.get('payerBindingVerified') is not True and stored.get('walletProofVerified') is not True"
        self.assertGreaterEqual(
            body.count(combined), 2,
            "the preflight supersede branch must also accept payerBindingVerified as proof",
        )


class TestTransactionReadApi(unittest.TestCase):
    """Production reads must use ref.get(transaction=txn), not txn.get(ref).

    google-cloud-firestore's Transaction.get(document_ref) returns a GENERATOR,
    so `.exists` on it raises AttributeError. The in-memory test double returns
    a snapshot, which hid this from every unit test while report-submission
    returned HTTP 500 in production.
    """

    def test_engine_does_not_read_through_transaction_get(self):
        import os
        path = os.path.join(os.path.dirname(__file__), "..", "psemine_engine.py")
        with open(path, encoding="utf-8") as handle:
            source = handle.read()
        import re
        self.assertNotRegex(source, r"(?m)^\s*\w+\s*=\s*txn\.get\(")

    def test_transition_reads_the_snapshot_through_the_document_ref(self):
        import os
        path = os.path.join(os.path.dirname(__file__), "..", "psemine_engine.py")
        with open(path, encoding="utf-8") as handle:
            source = handle.read()
        self.assertIn("snap = ref.get(transaction=txn)", source)


class TestStalePurchaseCancellation(unittest.TestCase):
    """A user may clear ONLY a checkout that provably never reached the chain.

    The risk being fenced off is a "reset" that discards a real broadcast: if a
    transaction hash exists (or the status says one might), cancellation must
    refuse and the intent must stay on the verification/recovery path.
    """

    UID = "u-cancel"

    def _purchase(self, **overrides):
        base = {
            "id": "pse_pur_starter_x",
            "userId": self.UID,
            "toolId": "starter",
            "status": "awaiting_payment",
            "paymentWallet": WALLET_A,
            "transactionHash": None,
        }
        base.update(overrides)
        return base

    def _cancel(self, purchase, reason=None):
        return psemine_engine.purchase_transition_decision(
            purchase, self.UID, "cancel", cancel_reason=reason,
        )

    def test_unsubmitted_checkout_can_be_cancelled(self):
        result = self._cancel(self._purchase(), reason="USER_CANCELLED")
        self.assertTrue(result["ok"])
        self.assertEqual("cancelled", result["status"])
        self.assertEqual("cancelled", result["updates"]["status"])
        self.assertEqual(self.UID, result["updates"]["cancelledBy"])
        self.assertEqual("USER_CANCELLED", result["updates"]["cancellationReason"])

    def test_default_reason_is_recorded(self):
        result = self._cancel(self._purchase())
        self.assertEqual("USER_CANCELLED_INCOMPLETE_CHECKOUT",
                         result["updates"]["cancellationReason"])

    def test_expired_and_failed_quotes_are_cancellable(self):
        for status in ("expired", "failed", "created"):
            with self.subTest(status=status):
                result = self._cancel(self._purchase(status=status))
                self.assertTrue(result["ok"])
                self.assertEqual("cancelled", result["status"])

    def test_repeated_cancellation_is_idempotent(self):
        result = self._cancel(self._purchase(status="cancelled"))
        self.assertTrue(result["ok"])
        self.assertTrue(result["idempotent"])
        self.assertIsNone(result["updates"])

    def test_already_closed_records_do_not_trap_the_user(self):
        for status in ("superseded", "abandoned_no_broadcast"):
            with self.subTest(status=status):
                result = self._cancel(self._purchase(status=status))
                self.assertTrue(result["ok"])
                self.assertTrue(result["idempotent"])

    def test_any_transaction_hash_blocks_cancellation(self):
        # Even an "awaiting_payment" record with a hash (a submission that
        # landed between reads) must never be cleared.
        result = self._cancel(self._purchase(
            transactionHash="0x" + "ab" * 32,
        ))
        self.assertFalse(result["ok"])
        self.assertEqual("PURCHASE_HAS_TRANSACTION", result["error"])
        self.assertIn("transactionHash", result)

    def test_maybe_broadcast_statuses_are_refused(self):
        for status in ("submission_uncertain", "transaction_submitted",
                       "confirming", "manual_review"):
            with self.subTest(status=status):
                result = self._cancel(self._purchase(status=status))
                self.assertFalse(result["ok"])
                self.assertEqual("PAYMENT_MAY_BE_IN_FLIGHT", result["error"])
                self.assertEqual(status, result["status"])

    def test_activated_purchase_is_never_cancelled(self):
        result = self._cancel(self._purchase(
            status="activated", transactionHash="0x" + "cd" * 32,
        ))
        self.assertFalse(result["ok"])
        self.assertEqual("PURCHASE_ALREADY_ACTIVATED", result["error"])

    def test_another_users_purchase_is_forbidden(self):
        result = psemine_engine.purchase_transition_decision(
            self._purchase(), "someone-else", "cancel",
        )
        self.assertFalse(result["ok"])
        self.assertEqual("FORBIDDEN", result["error"])

    def test_cancel_transition_persists_and_releases_the_lock(self):
        import uuid
        db = tpc.FakeDB()
        pid = "pse_pur_starter_cancel"
        db.collection("psemine_purchases").document(pid).set(self._purchase(id=pid))
        lock_id = uuid.uuid5(uuid.NAMESPACE_URL,
                             f"psemine-purchase:{self.UID}:starter").hex
        db.collection("psemine_purchase_locks").document(lock_id).set({
            "userId": self.UID, "toolId": "starter", "purchaseId": pid,
        })

        result = psemine_engine.transition_purchase_state(
            db, pid, self.UID, "cancel", updated_at="T1",
        )
        self.assertTrue(result["ok"])
        stored = db.collection("psemine_purchases").document(pid).get().to_dict()
        self.assertEqual("cancelled", stored["status"])
        self.assertEqual("T1", stored["cancelledAt"])
        self.assertEqual(self.UID, stored["cancelledBy"])
        self.assertEqual({}, db.coll("psemine_purchase_locks"),
                         "the checkout lock must be released by the cancel")

        # Repeated cancel: no rewrite of the audit trail.
        again = psemine_engine.transition_purchase_state(
            db, pid, self.UID, "cancel", updated_at="T2",
        )
        self.assertTrue(again["ok"])
        self.assertTrue(again["idempotent"])
        self.assertEqual("T1", db.collection("psemine_purchases")
                         .document(pid).get().to_dict()["cancelledAt"])

    def test_cancel_does_not_release_a_lock_owned_by_another_intent(self):
        import uuid
        db = tpc.FakeDB()
        pid = "pse_pur_starter_mine"
        other = "pse_pur_starter_other"
        db.collection("psemine_purchases").document(pid).set(self._purchase(id=pid))
        lock_id = uuid.uuid5(uuid.NAMESPACE_URL,
                             f"psemine-purchase:{self.UID}:starter").hex
        db.collection("psemine_purchase_locks").document(lock_id).set({
            "userId": self.UID, "toolId": "starter", "purchaseId": other,
        })
        result = psemine_engine.transition_purchase_state(db, pid, self.UID, "cancel")
        self.assertTrue(result["ok"])
        self.assertIn(lock_id, db.coll("psemine_purchase_locks"),
                      "a lock pointing at another intent must survive")

    def test_cancelled_intent_cannot_accept_a_hash(self):
        db = tpc.FakeDB()
        pid = "pse_pur_starter_after_cancel"
        db.collection("psemine_purchases").document(pid).set(self._purchase(id=pid))
        self.assertTrue(psemine_engine.transition_purchase_state(
            db, pid, self.UID, "cancel",
        )["ok"])
        result = psemine_engine.transition_purchase_state(
            db, pid, self.UID, "report_submission",
            tx_hash="0x" + "ef" * 32, sender_wallet=WALLET_A,
        )
        self.assertFalse(result["ok"])
        self.assertEqual("PURCHASE_NOT_RECOVERABLE", result["error"])
        self.assertIsNone(db.collection("psemine_purchases").document(pid)
                          .get().to_dict().get("transactionHash"))

    def test_submission_then_cancel_is_refused(self):
        db = tpc.FakeDB()
        pid = "pse_pur_starter_after_submit"
        db.collection("psemine_purchases").document(pid).set(self._purchase(id=pid))
        submitted = psemine_engine.transition_purchase_state(
            db, pid, self.UID, "report_submission",
            tx_hash="0x" + "12" * 32, sender_wallet=WALLET_A,
        )
        self.assertTrue(submitted["ok"])
        result = psemine_engine.transition_purchase_state(db, pid, self.UID, "cancel")
        self.assertFalse(result["ok"])
        self.assertEqual("PURCHASE_HAS_TRANSACTION", result["error"])
        self.assertEqual("0x" + "12" * 32,
                         db.collection("psemine_purchases").document(pid)
                         .get().to_dict()["transactionHash"])

    def test_verification_rejects_a_closed_checkout(self):
        source = tfg._read(tfg.INDEX_SRC)
        self.assertIn('purchase.get(\'status\') in (\'cancelled\', \'superseded\')', source)
        self.assertIn('"PURCHASE_CLOSED"', source)

    def test_cancel_route_is_authenticated_and_engine_backed(self):
        source = tfg._read(tfg.INDEX_SRC)
        body = tfg._handler_body(source, "mine_cancel_purchase")
        prefix = source[:source.index("def mine_cancel_purchase")][-400:]
        self.assertIn("@app.route('/api/mine/purchases/cancel', methods=['POST'])", prefix)
        self.assertIn("@verify_token", prefix)
        self.assertIn("@require_psemine_access", prefix)
        self.assertIn("transition_purchase_state", body)
        self.assertIn('"cancel"', body)


class TestAuthoritativePricing(unittest.TestCase):
    """One arithmetic authority: integer pence + Decimal rate -> integer wei.

    The payable amount must never be a display-rounded float, and it must never
    be possible to bind an intent to a quote whose wei does not match the
    canonical tool price at the quote's own rate.
    """

    def test_ceiling_conversion_never_underpays(self):
        from decimal import Decimal, ROUND_CEILING
        for price_minor, rate in ((300, "422.76"), (1000, "418.04"),
                                  (5000, "500"), (20000, "611.13")):
            with self.subTest(price=price_minor, rate=rate):
                wei = psemine_engine.expected_wei_for_price_minor(price_minor, rate)
                self.assertIsInstance(wei, int)
                raw = (Decimal(price_minor) / Decimal(100)) / Decimal(rate) * Decimal(10) ** 18
                self.assertEqual(wei, int(raw.to_integral_value(rounding=ROUND_CEILING)))
                # The collected GBP value covers the price, and one fewer wei
                # would not: the rounding policy is minimal, never generous.
                self.assertGreaterEqual(Decimal(wei) / Decimal(10) ** 18 * Decimal(rate),
                                        Decimal(price_minor) / Decimal(100))
                self.assertLess(Decimal(wei - 1) / Decimal(10) ** 18 * Decimal(rate),
                                Decimal(price_minor) / Decimal(100))

    def test_conversion_rejects_non_positive_inputs(self):
        for price, rate in ((0, 400), (300, 0), (-1, 400), (300, "-1")):
            with self.subTest(price=price, rate=rate):
                with self.assertRaises(ValueError):
                    psemine_engine.expected_wei_for_price_minor(price, rate)

    def _quote(self, **overrides):
        wei = psemine_engine.expected_wei_for_price_minor(300, "422.76")
        base = {
            "gbpPrice": 3.0, "priceMinor": 300,
            "exchangeRateBNBGBP": 422.76,
            "bnbAmountWei": str(wei), "pricingVersion": 2,
        }
        base.update(overrides)
        return base

    def test_exact_v2_quote_is_accepted(self):
        ok, expected, error = psemine_engine.quote_amount_integrity(
            self._quote(), tool_price_minor=300,
        )
        self.assertTrue(ok, error)
        self.assertEqual(expected, int(self._quote()["bnbAmountWei"]))

    def test_one_wei_off_is_rejected_for_v2(self):
        wei = int(self._quote()["bnbAmountWei"])
        for delta in (-1, 1):
            with self.subTest(delta=delta):
                ok, _, error = psemine_engine.quote_amount_integrity(
                    self._quote(bnbAmountWei=str(wei + delta)),
                )
                self.assertFalse(ok)
                self.assertEqual("QUOTE_AMOUNT_INCOHERENT", error)

    def test_price_substitution_is_rejected(self):
        # A £3 quote cannot be paid under the £10 tier's price.
        ok, _, error = psemine_engine.quote_amount_integrity(
            self._quote(), tool_price_minor=1000,
        )
        self.assertFalse(ok)
        self.assertEqual("QUOTE_PRICE_MISMATCH", error)

    def test_legacy_six_decimal_quote_is_tolerated_but_not_tampered(self):
        # Legacy quotes quantized BNB to 6dp: up to half a micro-BNB away.
        wei = psemine_engine.expected_wei_for_price_minor(300, "422.76")
        legacy = self._quote(pricingVersion=1, bnbAmountWei=str(wei - 400_000_000_000))
        self.assertTrue(psemine_engine.quote_amount_integrity(legacy)[0])
        tampered = self._quote(pricingVersion=1, bnbAmountWei=str(wei - 5_000_000_000_000))
        ok, _, error = psemine_engine.quote_amount_integrity(tampered)
        self.assertFalse(ok)
        self.assertEqual("QUOTE_AMOUNT_INCOHERENT", error)

    def test_missing_or_malformed_amount_is_rejected(self):
        for bad in ("", None, "abc", "0", "-1"):
            with self.subTest(value=bad):
                ok, _, error = psemine_engine.quote_amount_integrity(
                    self._quote(bnbAmountWei=bad),
                )
                self.assertFalse(ok)
                self.assertEqual("INVALID_QUOTE_AMOUNT", error)

    def test_quote_route_is_the_single_pricing_authority(self):
        src = tfg._read(tfg.INDEX_SRC)
        self.assertIn("expected_wei_for_price_minor(price_minor, exchange_rate)", src)
        self.assertIn('"pricingVersion": 2', src)
        # The float-derived amount that used to be the source of wei is gone.
        self.assertNotIn("round(tool_cfg['price_gbp'] / exchange_rate", src)
        self.assertIn("quote_amount_integrity(", src)
        self.assertIn("PURCHASE_QUOTE_AMOUNT_MISMATCH", src)
        self.assertIn("PURCHASE_QUOTE_RECEIVER_MISMATCH", src)

    def test_frontend_never_pays_a_quote_from_another_tool(self):
        root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        with open(os.path.join(root, "src", "pages", "psemine", "PSEMineTools.tsx"),
                  encoding="utf-8") as handle:
            source = handle.read()
        self.assertIn("candidateQuote.toolId === tool.id", source)
        self.assertIn("value: String(wei)", source)


class TestSettlementActivatesOnlyItsTool(unittest.TestCase):
    """A verified payment settles the tool it was quoted for, once."""

    def test_activation_uses_the_purchase_tool_only(self):
        body = tfg._handler_body(tfg._read(tfg.INDEX_SRC), "verify_psemine_tool_purchase")
        self.assertIn("tool_id = purchase.get('toolId')", body)
        self.assertIn("counts[tool_id] = counts.get(tool_id, 0) + 1", body)
        self.assertIn("hydrate_ownership_for_activation(", body)
        self.assertIn("purchase_id, now_dt", body)
        # The activation transaction re-reads the purchase and refuses any
        # state that is not an allowed pre-activation state, so a replayed or
        # concurrent verification cannot create a second entitlement.
        self.assertIn("allowed_activation_states", body)
        self.assertIn("PURCHASE_STATE_NOT_ACTIVATABLE", body)
        self.assertIn("SUBMISSION_HASH_CONFLICT", body)

    def test_no_client_supplied_tool_can_activate(self):
        body = tfg._handler_body(tfg._read(tfg.INDEX_SRC), "verify_psemine_tool_purchase")
        self.assertNotIn("tool_id = data.get('toolId')", body)
        self.assertNotIn("counts[data.get('toolId')]", body)

    def test_verified_receipt_is_the_only_income_source(self):
        body = tfg._handler_body(tfg._read(tfg.INDEX_SRC), "verify_psemine_tool_purchase")
        self.assertIn("'verificationSource': 'bsc_rpc_receipt'", body)
        self.assertIn("if onchain_verified:", body)
