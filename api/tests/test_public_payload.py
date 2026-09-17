"""
Public payload contract tests.

The unauthenticated `GET /api/mine/campaign/status` must return an allow-listed
projection of the campaign document, never the document itself. The specific
regression this guards: someone adds a private field (collected BNB, shutdown
state, admin metadata) to `psemine_campaigns/active_campaign`, and it silently
appears in a public API response because the endpoint returned `to_dict()`.

api/index.py cannot be imported here (it imports Flask at module scope), so the
projection itself lives in the pure module api/psemine_public.py and the app's
use of it is asserted structurally against the source.

Run: python3 -m unittest discover api/tests
"""
import os
import re
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import psemine_public  # noqa: E402

API_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
INDEX_SRC = os.path.join(API_DIR, "index.py")


class TestPublicCampaignProjection(unittest.TestCase):
    """Only allow-listed campaign fields may leave the process."""

    def test_private_fields_are_dropped(self):
        camp = {
            "id": "active_campaign",
            "name": "PSEmine Genesis 90-Day Campaign",
            "status": "active",
            "durationDays": 90,
            "purchaseEnabled": True,
            # private / operational
            "collectedBNB": "12.4",
            "shutdownState": "none",
            "adminMetadata": {"reviewedBy": "ops"},
            "internalNotes": "do not publish",
        }
        view = psemine_public.public_campaign_view(camp)
        for private in ("collectedBNB", "shutdownState", "adminMetadata", "internalNotes"):
            self.assertNotIn(private, view, f"{private} leaked into the public campaign payload")
        self.assertIn("status", view)
        self.assertIn("purchaseEnabled", view)

    def test_previously_unknown_field_is_dropped(self):
        """A field nobody has thought of yet must not become public by default."""
        camp = {"status": "active", "someFutureInternalKey": "whatever", "_private": 1}
        view = psemine_public.public_campaign_view(camp)
        self.assertEqual({"status": "active"}, view)

    def test_allow_list_is_exactly_the_public_contract(self):
        camp = {name: f"value-{name}" for name in psemine_public.PUBLIC_CAMPAIGN_FIELDS}
        view = psemine_public.public_campaign_view(camp)
        self.assertEqual(set(psemine_public.PUBLIC_CAMPAIGN_FIELDS), set(view))

    def test_receiver_wallet_is_intentionally_public(self):
        """Payers must see the receiving address before they sign in."""
        self.assertIn("receiverWalletAddress", psemine_public.PUBLIC_CAMPAIGN_FIELDS)
        self.assertIn("receiverWalletAddress", psemine_public.PUBLIC_CAMPAIGN_FIELD_NOTES)

    def test_empty_document_returns_none(self):
        self.assertIsNone(psemine_public.public_campaign_view({}))
        self.assertIsNone(psemine_public.public_campaign_view(None))

    def test_leak_detector_recognises_private_fields(self):
        self.assertEqual(
            ["adminMetadata", "collectedBNB"],
            psemine_public.leaked_public_keys({"collectedBNB": 1, "adminMetadata": 2, "status": "active"}),
        )


class TestAppAppliesTheProjection(unittest.TestCase):
    """The app must route the public campaign response through the projection."""

    def setUp(self):
        with open(INDEX_SRC, "r", encoding="utf-8") as fh:
            self.source = fh.read()

    def test_campaign_endpoint_is_projected_in_the_response_hook(self):
        # Response hook: /api/mine/campaign/status -> _public_campaign_view
        self.assertRegex(
            self.source,
            r"_public_campaign_view\(body\['campaign'\]\)",
            "the public campaign response is no longer projected before it leaves the app",
        )
        self.assertRegex(
            self.source,
            r"path == '/api/mine/campaign/status'",
            "the projection is no longer applied to the public campaign endpoint",
        )

    def test_every_raw_campaign_return_is_on_a_projected_path(self):
        """Handlers that return a raw campaign document must be hook-covered.

        Two handlers build their response from a campaign document and are
        covered by the response hook rather than by inline projection:
        /api/mine/campaign/status (anonymous) and the legacy /api/psemine/*
        reads, whose /dashboard and /campaigns handlers call to_dict(). This
        test pins the pairing: if a raw return is moved onto a path the hook
        does not cover, it fails.
        """
        raw_returns = []
        for match in re.finditer(
            r"return jsonify\(\{[^}]*?campaign(?:s)?[\"']?\s*:\s*([^,}]+)", self.source
        ):
            expression = match.group(1).strip()
            if expression in ("camp_doc.to_dict()", "campaign", "camp.to_dict()",
                              "campaigns", "c.to_dict()", "[c.to_dict() for c in snaps]"):
                line = self.source[: match.start()].count("\n") + 1
                raw_returns.append((line, expression))

        # Exactly the covered handlers are allowed to do this; anything else is a leak.
        self.assertGreaterEqual(len(raw_returns), 1, "detector went stale: no raw campaign returns found")
        for line, expression in raw_returns:
            handler = self._enclosing_route(line)
            self.assertTrue(
                handler in ("/api/mine/campaign/status",) or handler.startswith("/api/psemine/"),
                f"line {line} ({expression}) returns a raw campaign document from {handler}, "
                "which the response hook does not project",
            )

    def test_hook_covers_the_legacy_v1_surface(self):
        """/api/psemine/* responses carry campaign documents too."""
        self.assertRegex(self.source, r"path\.startswith\('/api/psemine/'\)")
        self.assertRegex(
            self.source,
            r"isinstance\(body\.get\('campaigns'\), list\)",
            "legacy campaign lists are no longer projected element-wise",
        )

    def _enclosing_route(self, line_number):
        """Route decorator that owns `line_number`."""
        lines = self.source.split("\n")
        for i in range(line_number - 1, -1, -1):
            match = re.match(r"@app\.route\('([^']+)'", lines[i])
            if match:
                return match.group(1)
        return "<unknown>"

    def test_public_endpoint_requires_the_shared_projection_module(self):
        self.assertIn("from psemine_public import public_campaign_view", self.source)


if __name__ == "__main__":
    unittest.main()
