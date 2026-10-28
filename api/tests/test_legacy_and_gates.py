"""
Legacy surface, request-gate and Firestore-rules contract tests.

Three boundaries are asserted here, none of which can be exercised by running
the Flask app in this environment (no Flask / no Firebase in the test sandbox):

  1. LEGACY v1 SURFACE — /api/psemine/* predates @require_psemine_access, yet
     four of its routes write economic state. A pure decision function decides
     which v1 requests must present entitlement; the app enforces it before
     routing. The decision table is tested directly.

  2. CRON GATE COUPLING — the central request hook and the route-level handler
     must not be able to bypass each other. The hook is fail-closed
     (cron_lifecycle_authorized), the hook runs for every request to that path,
     and the source records that the route-level check is defence in depth.

  3. FIRESTORE RULES CONTRACT — entitlement may not be forged by a client, the
     backfill's trust anchor must be Admin-SDK-only, and campaign documents must
     not be world-readable.

Run: python3 -m unittest discover api/tests
"""
import os
import re
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import psemine_engine  # noqa: E402

API_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ROOT_DIR = os.path.abspath(os.path.join(API_DIR, ".."))
INDEX_SRC = os.path.join(API_DIR, "index.py")
RULES_SRC = os.path.join(ROOT_DIR, "firestore.rules")


def _read(path):
    with open(path, "r", encoding="utf-8") as fh:
        return fh.read()


class TestLegacyV1EntitlementRule(unittest.TestCase):
    """Which legacy v1 requests must present PSEmine entitlement."""

    def test_economic_writes_require_entitlement(self):
        for path in (
            "/api/psemine/orders/create",
            "/api/psemine/orders/verify-payment",
            "/api/psemine/sessions/sync",
            "/api/psemine/withdrawals/create",
        ):
            self.assertTrue(
                psemine_engine.legacy_v1_write_requires_entitlement("POST", path),
                f"{path} writes economic state but is not entitlement-gated",
            )

    def test_public_reads_are_not_gated(self):
        for path in ("/api/psemine/campaigns", "/api/psemine/tools"):
            self.assertFalse(psemine_engine.legacy_v1_write_requires_entitlement("GET", path))

    def test_admin_setup_keeps_its_own_admin_gate(self):
        self.assertFalse(
            psemine_engine.legacy_v1_write_requires_entitlement("POST", "/api/psemine/setup")
        )

    def test_trailing_slash_and_case_tolerated(self):
        self.assertTrue(psemine_engine.legacy_v1_write_requires_entitlement("post", "/api/psemine/orders/create/"))

    def test_non_v1_paths_and_v2_paths_unaffected(self):
        self.assertFalse(psemine_engine.legacy_v1_write_requires_entitlement("POST", "/api/mine/tools/quote"))
        self.assertFalse(psemine_engine.legacy_v1_write_requires_entitlement("POST", "/api/pulseearn/anything"))
        self.assertFalse(psemine_engine.legacy_v1_write_requires_entitlement("POST", "/api/psemineX/orders"))

    def test_decisions_do_not_touch_the_network(self):
        """The rule must be pure — it is called on every request, pre-routing."""
        import inspect
        source = inspect.getsource(psemine_engine.legacy_v1_write_requires_entitlement)
        for forbidden in ("get_db(", "db.collection", "requests.", "firestore"):
            self.assertNotIn(forbidden, source)


class TestLegacySurfaceInventory(unittest.TestCase):
    """The v1 surface is known and bounded — no accidental additions."""

    def test_expected_v1_routes_are_the_ones_present(self):
        source = _read(INDEX_SRC)
        found = sorted(set(re.findall(r"@app\.route\('(/api/psemine/[^']*)'", source)))
        self.assertEqual(
            [
                "/api/psemine/campaigns",
                "/api/psemine/dashboard",
                "/api/psemine/orders/create",
                "/api/psemine/orders/verify-payment",
                "/api/psemine/sessions/sync",
                "/api/psemine/setup",
                "/api/psemine/tools",
                "/api/psemine/withdrawals/create",
            ],
            found,
            "the legacy v1 surface changed; update the deprecation finding before merging",
        )

    def test_app_enforces_the_rule_before_routing(self):
        source = _read(INDEX_SRC)
        hook_start = source.index("def _pse_before_request")
        hook_end = source.index("@app.after_request")
        hook = source[hook_start:hook_end]
        self.assertIn("legacy_v1_write_requires_entitlement", hook)
        self.assertIn("PSEMINE_ACCESS_DENIED", hook)
        self.assertIn("AUTHENTICATION_REQUIRED", hook)
        self.assertIn("auth.verify_id_token", hook)


class TestCronGateCoupling(unittest.TestCase):
    """The central hook and the route handler must not bypass one another."""

    def setUp(self):
        self.source = _read(INDEX_SRC)

    def test_hook_is_fail_closed_and_precedes_routing(self):
        hook = self.source[self.source.index("def _pse_before_request"):self.source.index("@app.after_request")]
        self.assertIn("@app.before_request", self.source)
        self.assertIn("cron_lifecycle_authorized", hook)
        self.assertIn("CRON_NOT_CONFIGURED", hook)
        # The hook must deny for this path on BOTH verbs the route accepts.
        self.assertIn("'/api/mine/cron/lifecycle'", hook)

    def test_route_level_check_is_documented_defence_in_depth(self):
        hook = self.source[self.source.index("def _pse_before_request"):self.source.index("@app.after_request")]
        self.assertRegex(
            hook,
            r"defence in depth",
            "the relationship between the hook and the route-level check must stay documented",
        )

    def test_fail_closed_helper_is_used_by_the_hook(self):
        allowed, code = psemine_engine.cron_lifecycle_authorized("", None)
        self.assertFalse(allowed)
        self.assertEqual(psemine_engine.CRON_NOT_CONFIGURED, code)


class TestFirestoreRulesContract(unittest.TestCase):
    """Rules-level guarantees the backend depends on."""

    def setUp(self):
        self.rules = _read(RULES_SRC)

    def test_client_cannot_grant_itself_psemine(self):
        create_rule = self.rules[self.rules.index("allow create: if isOwner(userId)"):]
        create_rule = create_rule[: create_rule.index("// CRITICAL: Field-restricted updates")]
        self.assertIn("productAccess", create_rule)
        self.assertRegex(create_rule, r"get\('psemine', false\) != true")

    def test_new_profile_cannot_self_grant_root_privilege(self):
        block = self.rules[self.rules.index("match /users/{userId}"):]
        block = block[:block.index("// CRITICAL: Field-restricted updates")]
        self.assertIn("request.resource.data.role == 'user'", block)
        self.assertIn("!request.resource.data.keys().hasAny(['isRoot'])", block)
        self.assertIn("request.resource.data.points == 0", block)

    def test_backfill_anchor_is_admin_only(self):
        """has_psemine_access() trusts psemine_tool_ownership; clients must not write it."""
        block = self.rules[self.rules.index("match /psemine_tool_ownership/"):]
        block = block[: block.index("match /psemine_purchases/")]
        self.assertIn("allow write: if isAdmin();", block)

    def test_campaign_document_is_not_world_readable(self):
        block = self.rules[self.rules.index("match /psemine_campaigns/"):]
        block = block[: block.index("match /psemine_tools/")]
        self.assertNotIn("allow read: if true;", block)
        self.assertNotIn("allow list: if true;", block)

    def test_legacy_policy_import_failure_fails_closed(self):
        source = _read(INDEX_SRC)
        hook = source[source.index("def _pse_before_request"):source.index("@app.after_request")]
        self.assertIn("SECURITY_POLICY_UNAVAILABLE", hook)
        self.assertIn("legacy entitlement policy unavailable; denying request", hook)
        self.assertIn("request.path.startswith('/api/psemine/')", hook)

    def test_task_claims_are_owner_private(self):
        block = self.rules[self.rules.index("match /task_claims/"):]
        block = block[:block.index("match /system_task_definitions/")]
        self.assertIn("resource.data.userId == request.auth.uid || isModerator()", block)
        self.assertNotIn("allow read: if isAuthenticated();", block)

    def test_referral_creation_cannot_forge_rewards(self):
        block = self.rules[self.rules.index("match /referrals/"):]
        block = block[:block.index("match /support_tickets/")]
        self.assertIn("request.resource.data.status == 'REGISTERED'", block)
        self.assertIn("request.resource.data.product == 'pulseearn'", block)
        self.assertIn("request.resource.data.referrerId != request.auth.uid", block)
        self.assertIn("allow update: if isAdmin() ||", block)

    def test_audit_and_anomaly_writes_are_scoped(self):
        anomaly = self.rules[self.rules.index("match /system_anomalies/"):]
        anomaly = anomaly[:anomaly.index("match /system_audit/")]
        self.assertIn("request.resource.data.userId == request.auth.uid", anomaly)
        self.assertIn("request.resource.data.context == 'SYSTEM_VALIDATION_FAILURE'", anomaly)
        audit = self.rules[self.rules.index("match /system_audit/"):]
        audit = audit[:audit.index("match /system_security/")]
        self.assertIn("allow create: if isAdmin();", audit)
        self.assertNotIn("allow create: if isAuthenticated();", audit)

    def test_system_uploads_are_owner_attributed(self):
        block = self.rules[self.rules.index("match /system_uploads/"):]
        block = block[:block.index("match /system_fingerprints/")]
        self.assertIn("allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;", block)

    def test_ledger_and_purchases_are_not_client_writable(self):
        for collection in ("psemine_mining_ledger", "psemine_purchases", "psemine_referrals"):
            block = self.rules[self.rules.index(f"match /{collection}/"):]
            block = block[: block.index("match /", 10)]
            self.assertRegex(
                block,
                r"allow (create, update, delete|write|read, write): if (false|isAdmin\(\));",
                f"{collection} is client-writable",
            )


if __name__ == "__main__":
    unittest.main()
