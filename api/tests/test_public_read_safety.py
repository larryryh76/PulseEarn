"""
Runtime proof for the public PSEmine reads (Phase 3A).

WHY A RUNTIME TEST, NOT A SOURCE SCAN
-------------------------------------
The security defect closed in Phase 3A was behavioural: `GET /api/psemine/
campaigns` and `GET /api/psemine/tools` were unauthenticated, called
psemine_ensure_canonical_data(db) — so an anonymous GET could CREATE campaign and
tool documents — and answered with `{**doc.to_dict(), 'id': doc.id}`, publishing
every field the document happened to carry (including deprecation bookkeeping and
operational timestamps on tool rows).

A grep-based test would only prove that certain strings are absent. These tests
EXECUTE the real handlers from api/index.py against a Firestore double that
records every write attempt, so the guarantees are observed rather than inferred:

  * an anonymous read performs ZERO Firestore writes;
  * the response contains only allow-listed fields, even when the document is
    handed private ones;
  * the app-level response hook projects a raw tool payload too (defence in
    depth), so a future handler cannot leak by forgetting to project;
  * the derived purchase view equals the locked canonical economics;
  * no GET handler anywhere in the app initializes canonical data — asserted on
    the parsed AST, i.e. exactly, not textually.

api/index.py imports Flask at module scope and this sandbox has no Flask, so the
module is imported under minimal Flask/Firestore doubles. `get_db` is then
pointed at the recording double — the decorators resolve it at call time, so the
real handler code (including @require_db) runs unchanged.

Run: python3 -m unittest discover -s api/tests -t api/tests
"""
import ast
import importlib.util
import json
import os
import sys
import types
import unittest

API_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
INDEX_SRC = os.path.join(API_DIR, "index.py")

sys.path.insert(0, API_DIR)

import psemine_core  # noqa: E402
import psemine_public  # noqa: E402


# ─────────────────────────────────────────────────────────────────────────────
# Minimal Flask double
# ─────────────────────────────────────────────────────────────────────────────

class _Response:
    def __init__(self, payload, status_code=200):
        self.payload = payload
        self.status_code = status_code
        self.headers = {}
        self.content_type = "application/json"
        self.is_json = True

    def get_json(self, silent=False):
        return self.payload

    def set_data(self, data):
        self.payload = json.loads(data) if isinstance(data, (str, bytes)) else data


class _Request:
    """Stand-in for flask.request; tests set the attributes they need."""

    def __init__(self):
        self.path = "/"
        self.method = "GET"
        self.headers = {}
        self.args = {}
        self.environ = {}


_STUB_REQUEST = _Request()


def _install_stub_flask():
    module = types.ModuleType("flask")

    class Flask:
        def __init__(self, name):
            self.name = name
            self.routes = {}
            self.before_request_hook = None
            self.after_request_hook = None
            self.error_handlers = {}

        def route(self, rule, **options):
            def decorator(fn):
                self.routes[rule] = fn
                return fn
            return decorator

        def before_request(self, fn):
            self.before_request_hook = fn
            return fn

        def after_request(self, fn):
            self.after_request_hook = fn
            return fn

        def errorhandler(self, exc):
            def decorator(fn):
                self.error_handlers[exc] = fn
                return fn
            return decorator

    module.Flask = Flask
    module.request = _STUB_REQUEST
    module.jsonify = lambda *args, **kwargs: _Response(kwargs if not args else args[0])
    module.g = types.SimpleNamespace()
    sys.modules["flask"] = module


_INDEX = None


def load_index():
    """Import api/index.py once, under the Flask double."""
    global _INDEX
    if _INDEX is None:
        _install_stub_flask()
        spec = importlib.util.spec_from_file_location("pse_index_under_test", INDEX_SRC)
        module = importlib.util.module_from_spec(spec)
        sys.modules["pse_index_under_test"] = module
        spec.loader.exec_module(module)
        _INDEX = module
    return _INDEX


# ─────────────────────────────────────────────────────────────────────────────
# Firestore double that records every write attempt
# ─────────────────────────────────────────────────────────────────────────────

class _Snapshot:
    def __init__(self, doc_id, data):
        self.id = doc_id
        self._data = data
        self.exists = data is not None

    def to_dict(self):
        return dict(self._data or {})


class _DocumentRef:
    def __init__(self, db, collection, doc_id):
        self._db = db
        self._collection = collection
        self.id = doc_id

    def get(self, **kwargs):
        return _Snapshot(self.id, self._db.docs.get(self._collection, {}).get(self.id))

    def set(self, payload, merge=False):
        self._db.writes.append(("set", self._collection, self.id, payload))

    def update(self, payload):
        self._db.writes.append(("update", self._collection, self.id, payload))

    def delete(self):
        self._db.writes.append(("delete", self._collection, self.id, None))


class _Query:
    def __init__(self, db, collection, docs):
        self._db = db
        self._collection = collection
        self._docs = docs

    def where(self, *args, **kwargs):
        return self

    def order_by(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    def get(self, **kwargs):
        return [_Snapshot(doc_id, data) for doc_id, data in sorted(self._docs.items())]

    def __iter__(self):
        return iter(self.get())

    def __len__(self):
        return len(self._docs)


class _CollectionRef(_Query):
    def document(self, doc_id=None):
        if doc_id is None:
            doc_id = "auto-%d" % (len(self._db.writes) + 1)
        return _DocumentRef(self._db, self._collection, doc_id)

    def add(self, payload):
        self._db.writes.append(("add", self._collection, None, payload))
        return None, _DocumentRef(self._db, self._collection, "added")


class RecordingDb:
    """Firestore-shaped double; every mutation lands in `writes`."""

    def __init__(self, docs):
        self.docs = docs
        self.writes = []

    def collection(self, name):
        return _CollectionRef(self, name, self.docs.get(name, {}))


CAMPAIGN_DOC = {
    "id": "active_campaign",
    "name": "PSEmine Genesis 90-Day Campaign",
    "status": "active",
    "durationDays": 90,
    "startAt": "2026-09-01T00:00:00+00:00",
    "endAt": "2026-11-30T00:00:00+00:00",
    "currencyDisplay": "GBP",
    "paymentAsset": "BNB",
    "paymentNetwork": "BNB Smart Chain",
    "paymentChainId": 56,
    "receiverWalletAddress": "0x8b32A461d3106B3356e9A389DfeB74aC084c8F33",
    "purchaseEnabled": True,
    "miningEnabled": True,
    "referralEnabled": True,
    # private / operational fields the projection must drop
    "totalBNBCollected": 12.5,
    "totalMinersCount": 40,
    "totalCapacitiesRegisteredGBPPerHour": 880.0,
    "shutdownState": "none",
    "pauseWindows": [],
    "walletChangeDeadline": "2026-11-27T00:00:00+00:00",
    "createdAt": "2026-09-01T00:00:00+00:00",
    "updatedAt": "2026-09-02T00:00:00+00:00",
    "adminMetadata": {"reviewedBy": "ops"},
}

TOOL_DOC = {
    "id": "starter",
    "name": "Starter Miner",
    "tier": "starter",
    "priceGbp": 3.0,
    "miningRateGbpPerHour": 0.1,
    "maxCopiesPerUser": 5,
    "campaignId": "active_campaign",
    "isActive": True,
    "description": "Starter mining tool - £3 GBP, £0.10/hour, maximum 5 copies per user.",
    # private / operational fields the projection must drop
    "createdAt": "2026-09-01T00:00:00+00:00",
    "updatedAt": "2026-09-02T00:00:00+00:00",
    "deprecated": True,
    "deprecatedAt": "2026-09-20T00:00:00+00:00",
    "deprecationReason": "Superseded by canonical tool catalog",
    "canonicalAlias": "builder",
}


class PublicReadHarness(unittest.TestCase):
    """Shared wiring: real handlers, recording database, no network."""

    def setUp(self):
        self.index = load_index()
        self.db = RecordingDb({
            "psemine_campaigns": {"active_campaign": CAMPAIGN_DOC},
            "psemine_tools": {"starter": TOOL_DOC},
        })
        self._saved_get_db = self.index.get_db
        self.index.get_db = lambda: self.db

    def tearDown(self):
        self.index.get_db = self._saved_get_db


class TestAnonymousReadsAreZeroWrite(PublicReadHarness):
    """A public GET must not initialize or mutate anything."""

    def test_anonymous_campaign_list_writes_nothing(self):
        response = self.index.psemine_get_campaigns()
        self.assertEqual(
            [], self.db.writes,
            "an anonymous GET /api/psemine/campaigns wrote to Firestore: %r" % (self.db.writes,),
        )
        body = response.get_json()
        self.assertTrue(body["success"])
        self.assertEqual(1, len(body["campaigns"]))
        self.assertEqual("active_campaign", body["campaigns"][0]["id"])

    def test_anonymous_tool_catalog_writes_nothing(self):
        response = self.index.psemine_get_tools()
        self.assertEqual(
            [], self.db.writes,
            "an anonymous GET /api/psemine/tools wrote to Firestore: %r" % (self.db.writes,),
        )
        body = response.get_json()
        self.assertTrue(body["success"])
        self.assertEqual(1, len(body["tools"]))
        self.assertEqual("starter", body["tools"][0]["id"])

    def test_canonical_data_is_never_initialized_by_a_read(self):
        """psemine_ensure_canonical_data would write both collections."""
        self.index.psemine_get_campaigns()
        self.index.psemine_get_tools()
        touched = {write[1] for write in self.db.writes}
        self.assertNotIn("psemine_campaigns", touched)
        self.assertNotIn("psemine_tools", touched)


class TestAnonymousReadsOnAnEmptyDatabase(PublicReadHarness):
    """The real defect scenario: a deployment whose seed does not exist yet.

    With the seed already present the old handler was a pure read (its
    `if not ref.get().exists` guard did nothing). The anonymous write only
    happened when the documents were MISSING — which is exactly a fresh
    deployment, i.e. the moment an operator is least able to notice. These two
    tests run against an empty database, so the guarantee is asserted where it
    actually matters.
    """

    def setUp(self):
        super().setUp()
        self.db = RecordingDb({})
        self.index.get_db = lambda: self.db

    def test_empty_campaign_list_writes_nothing(self):
        body = self.index.psemine_get_campaigns().get_json()
        self.assertEqual(
            [], self.db.writes,
            "an anonymous GET seeded canonical data on an empty database: %r" % (self.db.writes,),
        )
        self.assertEqual([], body["campaigns"])

    def test_empty_tool_catalog_writes_nothing(self):
        body = self.index.psemine_get_tools().get_json()
        self.assertEqual(
            [], self.db.writes,
            "an anonymous GET seeded tool rows on an empty database: %r" % (self.db.writes,),
        )
        self.assertEqual([], body["tools"])

    def test_a_read_is_not_a_repair(self):
        """No collection may be touched at all, not merely the two seeded ones."""
        self.index.psemine_get_campaigns()
        self.index.psemine_get_tools()
        self.assertEqual([], self.db.writes)


class TestPublicPayloadsAreAllowListed(PublicReadHarness):
    """Only intentionally public fields may leave the process."""

    def test_campaign_list_emits_only_public_fields(self):
        body = self.index.psemine_get_campaigns().get_json()
        allowed = set(psemine_public.PUBLIC_CAMPAIGN_FIELDS)
        for campaign in body["campaigns"]:
            extra = set(campaign) - allowed
            self.assertEqual(set(), extra, "campaign leaked %r" % sorted(extra))
        for private in ("totalBNBCollected", "totalMinersCount", "shutdownState",
                        "pauseWindows", "adminMetadata", "createdAt", "updatedAt"):
            self.assertNotIn(private, body["campaigns"][0])

    def test_tool_catalog_emits_only_public_fields(self):
        body = self.index.psemine_get_tools().get_json()
        allowed = set(psemine_public.PUBLIC_TOOL_FIELDS)
        for tool in body["tools"]:
            extra = set(tool) - allowed
            self.assertEqual(set(), extra, "tool leaked %r" % sorted(extra))
        for private in ("deprecated", "deprecatedAt", "deprecationReason",
                        "canonicalAlias", "createdAt", "updatedAt", "description"):
            self.assertNotIn(private, body["tools"][0])

    def test_receiver_wallet_stays_public_for_payers(self):
        body = self.index.psemine_get_campaigns().get_json()
        self.assertIn("receiverWalletAddress", body["campaigns"][0])

    def test_projection_functions_ignore_unknown_future_fields(self):
        future = dict(CAMPAIGN_DOC)
        future["someFutureInternalKey"] = "whatever"
        view = psemine_public.public_campaign_view(future)
        self.assertNotIn("someFutureInternalKey", view)
        tool_future = dict(TOOL_DOC)
        tool_future["someFutureInternalKey"] = "whatever"
        self.assertNotIn("someFutureInternalKey", psemine_public.public_tool_view(tool_future))


class TestResponseHookIsDefenceInDepth(unittest.TestCase):
    """The central hook projects a raw payload even if a handler stops doing it."""

    def setUp(self):
        self.index = load_index()
        self.index.request.path = "/api/psemine/tools"
        self.index.request.method = "GET"
        self.index.request.environ = {}

    def test_hook_projects_raw_tool_documents(self):
        raw = {"success": True, "tools": [dict(TOOL_DOC)]}
        response = self.index._pse_after_request(_Response(raw))
        tool = response.get_json()["tools"][0]
        for private in ("deprecated", "canonicalAlias", "createdAt", "description"):
            self.assertNotIn(private, tool)
        self.assertIn("miningRateGbpPerHour", tool)
        self.assertIn("maxCopiesPerUser", tool)

    def test_hook_still_projects_campaign_documents(self):
        raw = {"success": True, "campaign": dict(CAMPAIGN_DOC), "campaigns": [dict(CAMPAIGN_DOC)]}
        body = self.index._pse_after_request(_Response(raw)).get_json()
        for payload in (body["campaign"], body["campaigns"][0]):
            self.assertNotIn("totalBNBCollected", payload)
            self.assertIn("status", payload)

    def test_hook_ignores_unrelated_paths(self):
        self.index.request.path = "/api/mine/state"
        raw = {"success": True, "campaign": dict(CAMPAIGN_DOC)}
        body = self.index._pse_after_request(_Response(raw)).get_json()
        # /api/mine/state is entitlement-gated and deliberately not projected.
        self.assertIn("totalBNBCollected", body["campaign"])


class TestDerivedConfigMatchesTheLockedEconomics(unittest.TestCase):
    """The purchase-side view is a projection of psemine_core, verified at runtime."""

    def test_every_tier_matches_the_core(self):
        config = load_index().LOCKED_PSEMINE_TOOLS_CONFIG
        self.assertEqual(set(psemine_core.LOCKED_PSEMINE_TOOLS), set(config))
        for tool_id, spec in psemine_core.LOCKED_PSEMINE_TOOLS.items():
            got = config[tool_id]
            self.assertEqual(spec["name"], got["name"], tool_id)
            self.assertEqual(spec["version"], got["version"], tool_id)
            self.assertEqual(spec["max_per_user"], got["max_per_user"], tool_id)
            self.assertEqual(spec["hourly_rate_minor"], got["hourly_rate_minor"], tool_id)
            self.assertEqual(spec["price_minor_units"], got["price_minor_units"], tool_id)
            self.assertEqual(
                psemine_core.gbp_minor_to_major(spec["hourly_rate_minor"]), got["hourly_rate"])
            self.assertEqual(
                psemine_core.gbp_minor_to_major(spec["price_minor_units"]), got["price_gbp"])

    def test_minor_units_are_exact_integers(self):
        config = load_index().LOCKED_PSEMINE_TOOLS_CONFIG
        for tool_id, got in config.items():
            self.assertIsInstance(got["hourly_rate_minor"], int, tool_id)
            self.assertIsInstance(got["price_minor_units"], int, tool_id)
            self.assertEqual(got["price_gbp"], got["price_minor_units"] / 100.0, tool_id)
            self.assertEqual(got["hourly_rate"], got["hourly_rate_minor"] / 100.0, tool_id)

    def test_deployment_constants_do_not_drift_from_the_core(self):
        """Deployment knobs keep a canonical default even though they stay tunable."""
        index = load_index()
        self.assertEqual(psemine_core.MIN_BNB_CONFIRMATIONS, index.PSEMINE_MIN_CONFIRMATIONS)
        self.assertEqual(psemine_core.QUOTE_TTL_MINUTES, index.PSEMINE_QUOTE_TTL_MINUTES)
        self.assertEqual(psemine_core.PSEMINE_CAMPAIGN_DOC_ID, index.PSEMINE_CAMPAIGN_DOC_ID)


class TestNoReadPathInitializesCanonicalData(unittest.TestCase):
    """Asserted on the parsed AST: only authorized writers may seed canonically."""

    @classmethod
    def setUpClass(cls):
        with open(INDEX_SRC, "r", encoding="utf-8") as fh:
            cls.source = fh.read()
        cls.tree = ast.parse(cls.source)

    def _routes(self):
        """[(rule, methods, function_node)] for every @app.route in the app."""
        found = []
        for node in self.tree.body:
            if not isinstance(node, ast.FunctionDef):
                continue
            for decorator in node.decorator_list:
                if not isinstance(decorator, ast.Call):
                    continue
                if getattr(decorator.func, "attr", "") != "route" or not decorator.args:
                    continue
                rule = getattr(decorator.args[0], "value", "")
                methods = ["GET"]
                for keyword in decorator.keywords:
                    if keyword.arg == "methods" and isinstance(keyword.value, ast.List):
                        methods = [getattr(elt, "value", "") for elt in keyword.value.elts]
                found.append((rule, methods, node))
        return found

    def _calls_in(self, node, symbol):
        for inner in ast.walk(node):
            if isinstance(inner, ast.Call) and getattr(inner.func, "id", "") == symbol:
                return True
        return False

    def test_no_get_handler_initializes_canonical_data(self):
        offenders = [
            rule for rule, methods, node in self._routes()
            if "GET" in methods and self._calls_in(node, "psemine_ensure_canonical_data")
        ]
        self.assertEqual(
            [], offenders,
            "these GET routes can still write canonical data anonymously: %r" % offenders,
        )

    def test_canonical_data_is_initialized_only_by_the_admin_setup_route(self):
        callers = [
            (rule, node.name) for rule, _methods, node in self._routes()
            if self._calls_in(node, "psemine_ensure_canonical_data")
        ]
        self.assertEqual([("/api/psemine/setup", "psemine_setup")], callers)

    def test_setup_route_is_admin_gated_and_never_get(self):
        for rule, methods, node in self._routes():
            if rule == "/api/psemine/setup":
                self.assertEqual(["POST"], methods)
                decorators = [
                    getattr(getattr(dec, "func", dec), "id", "") for dec in node.decorator_list
                ]
                self.assertIn("verify_token", decorators)
                body = ast.get_source_segment(self.source, node)
                self.assertIn("is_admin", body)
                return
        self.fail("/api/psemine/setup is missing")

    def test_public_read_handlers_never_splat_a_document(self):
        """`{**doc.to_dict(), ...}` is the exact shape that leaked private fields.

        Asserted on the AST rather than the text, so prose (and docstrings) that
        describe the removed pattern cannot satisfy it.
        """
        for rule in ("/api/psemine/campaigns", "/api/psemine/tools"):
            node = next(node for r, _m, node in self._routes() if r == rule)
            splats = [
                inner.lineno for inner in ast.walk(node)
                if isinstance(inner, ast.Dict) and None in inner.keys
            ]
            self.assertEqual(
                [], splats,
                "%s still expands a document into its response at line(s) %r" % (rule, splats),
            )


if __name__ == "__main__":
    unittest.main()
