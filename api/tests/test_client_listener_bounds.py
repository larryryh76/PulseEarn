"""
Source census of the PSEmine client's Firestore listeners and state cadence.

WHY THIS EXISTS
---------------
The 2026-09-21 Firestore quota exhaustion had two client-side contributors that
no backend test could see:

  • three UNBOUNDED `onSnapshot` listeners (tool ownership, purchases, referrals)
    — each re-read the account's entire history every time the console mounted;
  • a campaign listener that attached for every visitor, including signed-out
    ones, even though `firestore.rules` scope the campaign document to
    `hasPSEMineAccess(uid)`, so it could only ever resolve as a denied
    subscription before falling back to a one-shot fetch anyway;
  • a 60-second state poll per visible console.

There is no JavaScript test runner in this project (playwright is used for
whole-browser journeys, not unit tests), so these properties are pinned the way
`test_taskroot_imports.py` pins the task-root bootstrap: by asserting on the
source that produces them. The assertions are deliberately about STRUCTURE
(which query carries a bound, which effect is gated, which constant drives the
interval) rather than formatting, so ordinary refactors do not trip them while a
reintroduced unbounded listener or a reintroduced 60-second poll fails loudly.

Run: python3 -m unittest discover -s api/tests -t api/tests
"""
import os
import re
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CONTEXT = os.path.join(ROOT, "src", "contexts", "PSEMineContext.tsx")
STATE_PROVIDER = os.path.join(ROOT, "src", "components", "psemine", "PseStateProvider.tsx")


def _read(path):
    with open(path, encoding="utf-8") as handle:
        return handle.read()


def _query_block(source, variable):
    """The full `const <variable> = query( ... );` statement."""
    match = re.search(r"const\s+" + re.escape(variable) + r"\s*=\s*query\((?P<body>.*?)\n\s*\);",
                      source, re.DOTALL)
    return match.group(0) if match else None


class TestListenerBounds(unittest.TestCase):
    """Every PSEmine listener must be bounded and must be attributed to identity."""

    def setUp(self):
        self.source = _read(CONTEXT)

    def test_the_listener_inventory_is_the_expected_set(self):
        """One gated campaign listener + four user-scoped listeners, plus ONE
        documented degradation path: the ordered purchases read re-attaches the
        same bounded query without the order clause if its composite index is
        not deployed. A new listener is a new recurring read cost, so it has to
        be a deliberate change to this number."""
        self.assertEqual(self.source.count("onSnapshot("), 6,
                         "unexpected number of PSEmine listeners — audit the new one")

    def test_each_user_scoped_listener_carries_a_limit(self):
        for variable, collection in (
            ("ownQuery", "psemine_tool_ownership"),
            ("purQuery", "psemine_purchases"),
            ("purFallbackQuery", "psemine_purchases"),
            ("refQuery", "psemine_referrals"),
        ):
            block = _query_block(self.source, variable)
            self.assertIsNotNone(block, f"{variable} query not found in PSEMineContext.tsx")
            self.assertIn(collection, block)
            self.assertIn("limit(", block,
                          f"{variable} ({collection}) must be bounded with limit()")

    def test_purchases_are_read_most_recent_first(self):
        """A plain limit() would return an arbitrary subset, which would make the
        dashboard's 'recent purchases' wrong rather than merely partial."""
        block = _query_block(self.source, "purQuery")
        self.assertIn("orderBy('createdAt', 'desc')", block)

    def test_the_ordered_purchases_read_degrades_instead_of_going_empty(self):
        """FAILED_PRECONDITION (index not deployed yet) must not present an empty
        purchase history: the ordered listener hands over to the unordered but
        still BOUNDED query, and detaches itself so it cannot error-loop."""
        block = _query_block(self.source, "purFallbackQuery")
        self.assertIsNotNone(block, "the degraded purchases query must exist")
        self.assertNotIn("orderBy", block,
                         "the degraded read must not need the composite index")
        self.assertIn("limit(", block, "the degraded read must still be bounded")
        start = self.source.find("unsubPurchases = onSnapshot(purQuery")
        self.assertNotEqual(start, -1, "the ordered purchases listener must be attached first")
        handler = self.source[start:self.source.find("// Referrals", start)]
        self.assertIn("purFallbackQuery", handler,
                      "the purchases error path must attach the bounded fallback")
        self.assertIn("failed()", handler,
                      "the failing ordered listener must be detached (no error loop)")

    def test_every_listener_is_unsubscribed(self):
        for unsub in ("unsubUser", "unsubOwnerships", "unsubPurchases", "unsubReferrals"):
            self.assertIn(f"{unsub} = onSnapshot(", self.source)
            self.assertIn(f"if ({unsub}) {unsub}();", self.source,
                          f"{unsub} must be released on unmount/identity change")

    def test_the_purchases_composite_index_is_declared(self):
        """The ordered listener needs (userId ASC, createdAt DESC); the index has
        to ship in the repo's authoritative indexes file, not be created by hand."""
        import json
        with open(os.path.join(ROOT, "firestore.indexes.json"), encoding="utf-8") as handle:
            indexes = json.load(handle)["indexes"]
        self.assertIn(
            {
                "collectionGroup": "psemine_purchases",
                "queryScope": "COLLECTION",
                "fields": [
                    {"fieldPath": "userId", "order": "ASCENDING"},
                    {"fieldPath": "createdAt", "order": "DESCENDING"},
                ],
            },
            indexes,
        )


class TestCampaignListenerEntitlement(unittest.TestCase):
    """The campaign document is entitlement-scoped in the rules; so is the listen."""

    def setUp(self):
        self.source = _read(CONTEXT)

    def test_campaign_effect_is_gated_on_pse_mine_access(self):
        start = self.source.find("Subscribe to Authoritative Campaign State")
        self.assertNotEqual(start, -1)
        end = self.source.find("Subscribe to PSE User Data", start)
        self.assertNotEqual(end, -1, "could not bound the campaign listener effect")
        effect = self.source[start:end]
        self.assertIn("hasPSEmineAccess", effect,
                      "a non-entitled visitor must not create a PSEmine campaign listener")
        self.assertIn("getOrCreateActiveCampaign", effect,
                      "non-entitled visitors must fall back to the public projection")

    def test_campaign_effect_depends_on_identity_not_mount_only(self):
        start = self.source.find("Subscribe to Authoritative Campaign State")
        end = self.source.find("Subscribe to PSE User Data", start)
        effect = self.source[start:end]
        self.assertIn("[currentUserUid, hasPSEmineAccess]", effect,
                      "the campaign listener must re-attach when identity/entitlement changes")


class TestStateCadence(unittest.TestCase):
    """The console's state refresh must not be a per-minute poll any more."""

    def setUp(self):
        self.source = _read(STATE_PROVIDER)

    def test_the_interval_is_five_minutes(self):
        self.assertIn("const STATE_REFRESH_MS = 5 * 60_000;", self.source)
        self.assertIn("window.setInterval(tick, STATE_REFRESH_MS)", self.source)
        self.assertNotIn("window.setInterval(tick, 60_000)", self.source,
                         "the 60-second dashboard poll is what this remediation removed")

    def test_visibility_and_focus_refresh_are_rate_limited(self):
        self.assertIn("FOCUS_REFRESH_MIN_GAP_MS", self.source)
        self.assertIn("addEventListener('visibilitychange', onFocusLike)", self.source)
        self.assertIn("addEventListener('focus', onFocusLike)", self.source)
        self.assertIn("Date.now() - lastLoadAt.current < FOCUS_REFRESH_MIN_GAP_MS", self.source)

    def test_refresh_paths_are_explicit(self):
        """Every refresh trigger the remediation promised: user action, mutation
        epoch, campaign transition, focus, background tick."""
        self.assertIn("refresh: () => load(true)", self.source)
        self.assertIn("if (stateEpoch === handledEpoch.current) return;", self.source)
        self.assertIn("campaignStatusRef", self.source)
        self.assertIn("void load(true, 'if-due')", self.source)

    def test_listener_fires_do_not_drive_requests(self):
        """The accrual checkpoint writes the user document the listener watches,
        so a listener-driven refresh would feed request traffic back into its own
        writes. The mutation epoch must be the only listener-adjacent trigger."""
        self.assertNotIn("onSnapshot", self.source)
        self.assertIn("stateEpoch", self.source)


if __name__ == "__main__":
    unittest.main()
