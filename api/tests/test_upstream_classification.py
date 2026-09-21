"""
Upstream capacity failures must be reported as retryable 503s, never as 500s.

WHY
---
Production incident 2026-09-21: Firebase project pulseearn-a4b16 exhausted its
Firestore quota, so every document read raised `ResourceExhausted` — and the API
answered `500 INTERNAL_SERVER_ERROR`. That presents an exhausted dependency as a
code defect: users are told the product is broken, and operators go hunting for
a regression that does not exist. Capacity failures are retryable, so the edge
classifies them as 503 Service Unavailable and the client renders its truthful
"temporarily unavailable, nothing was changed" state.

The decision rule is pure (`psemine_core.upstream_unavailable_kind`), so it is
tested behaviourally here. `api/index.py` cannot be imported in this environment
(Flask and Firestore are not installed for the test run), so the second half of
this module parses it with `ast` and asserts the structure of the edge that
consumes the rule — the same technique `test_transaction_ordering.py` uses.

Run: python3 -m unittest discover -s api/tests -t api/tests
"""
import ast
import os
import unittest

from psemine_core import upstream_unavailable_kind

API_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


# ---------------------------------------------------------------------------
# Stand-ins for the dependency exceptions (the real packages are not installed
# in this test environment; in production the caller also passes the real
# classes, which is covered by the extra_types case below).
# ---------------------------------------------------------------------------

class ResourceExhausted(Exception):
    """google.api_core.exceptions.ResourceExhausted — 429 quota exceeded."""


class ServiceUnavailable(Exception):
    """google.api_core.exceptions.ServiceUnavailable."""


class DeadlineExceeded(Exception):
    """google.api_core.exceptions.DeadlineExceeded."""


class QuotaHit(Exception):
    """A capacity failure whose CLASS NAME the rule does not know."""


class TestUpstreamClassification(unittest.TestCase):
    def test_quota_exhaustion_is_classified(self):
        """The exact exception from the incident must be recognised."""
        self.assertEqual(
            upstream_unavailable_kind(ResourceExhausted("429 Quota exceeded.")),
            "ResourceExhausted",
        )

    def test_availability_and_deadline_failures_are_classified(self):
        for exc in (ServiceUnavailable("down"), DeadlineExceeded("slow")):
            self.assertEqual(upstream_unavailable_kind(exc), type(exc).__name__)

    def test_application_failures_are_not_classified(self):
        """A real defect must still be a 500 — the rule is not a blanket catch."""
        for exc in (ValueError("bad input"), KeyError("missing"),
                    RuntimeError("boom"), TypeError("wrong type")):
            self.assertIsNone(upstream_unavailable_kind(exc))

    def test_raise_from_chain_is_followed(self):
        """google.api_core re-raises a gRPC status as an explicit cause chain."""
        try:
            try:
                raise ResourceExhausted("429")
            except ResourceExhausted as inner:
                raise RuntimeError("wrapped by the caller") from inner
        except RuntimeError as outer:
            self.assertEqual(upstream_unavailable_kind(outer), "ResourceExhausted")

    def test_implicit_context_chain_is_followed(self):
        """A handler that raises during cleanup keeps __context__, not __cause__."""
        try:
            try:
                raise ServiceUnavailable("503")
            except ServiceUnavailable:
                raise ValueError("cleanup failed")
        except ValueError as outer:
            self.assertEqual(upstream_unavailable_kind(outer), "ServiceUnavailable")

    def test_extra_types_give_isinstance_precision(self):
        """A dependency class with an unfamiliar name is still classified when
        the caller passes the real class."""
        self.assertIsNone(upstream_unavailable_kind(QuotaHit("out of quota")))
        self.assertEqual(
            upstream_unavailable_kind(QuotaHit("out of quota"), extra_types=(QuotaHit,)),
            "QuotaHit",
        )

    def test_non_type_extra_types_are_ignored(self):
        """A partially failed import must not turn isinstance() into a TypeError."""
        self.assertEqual(
            upstream_unavailable_kind(ResourceExhausted("429"), extra_types=(None, "nope", 3)),
            "ResourceExhausted",
        )

    def test_cycles_terminate(self):
        """A self-referential cause chain must not hang the error handler."""
        exc = RuntimeError("loops")
        exc.__cause__ = exc
        self.assertIsNone(upstream_unavailable_kind(exc))

    def test_none_is_not_classified(self):
        self.assertIsNone(upstream_unavailable_kind(None))


# ---------------------------------------------------------------------------
# Structural enforcement at the Flask edge
# ---------------------------------------------------------------------------

def _find_function(tree, name):
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == name:
            return node
    return None


class TestErrorHandlerStructure(unittest.TestCase):
    """The pure rule is only useful if the edge acts on it.

    `api/index.py` cannot be imported here, so these assertions read the real
    source. They fail if the 503 mapping is deleted, if the mapper stops
    delegating to the pure rule, or if the 500 path is reached first.
    """

    @classmethod
    def setUpClass(cls):
        with open(os.path.join(API_DIR, "index.py"), encoding="utf-8") as fh:
            cls.src = fh.read()
        cls.tree = ast.parse(cls.src)

    def _return_statuses(self, fn):
        """(lineno, status) for every numeric status returned from `fn`."""
        out = []
        for node in ast.walk(fn):
            if not isinstance(node, ast.Return) or node.value is None:
                continue
            value = node.value
            last = None
            if isinstance(value, ast.Tuple) and value.elts:
                last = value.elts[-1]
            elif isinstance(value, ast.Constant):
                last = value
            if isinstance(last, ast.Constant) and isinstance(last.value, int):
                out.append((node.lineno, last.value))
        return out

    def test_handler_maps_upstream_failure_to_503_before_the_500(self):
        handler = _find_function(self.tree, "handle_exception")
        self.assertIsNotNone(handler, "handle_exception not found")

        called = {n.func.id for n in ast.walk(handler)
                  if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)}
        self.assertIn("_upstream_unavailable_error", called,
                      "the error handler must classify upstream failures")

        statuses = dict((line, status) for line, status in self._return_statuses(handler))
        codes = sorted(line for line, status in self._return_statuses(handler) if status == 503)
        self.assertTrue(codes, "no 503 return in the error handler")
        self.assertIn(500, statuses.values(), "the generic 500 path must survive")
        self.assertLess(min(codes), max(line for line, status in self._return_statuses(handler)
                                        if status == 500),
                        "the upstream 503 branch must come BEFORE the generic 500")

    def test_503_response_never_echoes_the_upstream_exception(self):
        """The retryable body must be fixed copy. The operator sees the
        traceback in the logs; the caller must never receive `str(e)`."""
        handler = _find_function(self.tree, "handle_exception")
        consts = {c.value for c in ast.walk(handler)
                  if isinstance(c, ast.Constant) and isinstance(c.value, str)}
        self.assertIn("SERVICE_UNAVAILABLE", consts,
                      "upstream exhaustion must report SERVICE_UNAVAILABLE")
        resp_assigns = [n for n in ast.walk(handler) if isinstance(n, ast.Assign)
                        and any(isinstance(t, ast.Name) and t.id == "_resp" for t in n.targets)]
        self.assertEqual(len(resp_assigns), 1, "expected exactly one _resp assignment")
        for node in ast.walk(resp_assigns[0].value):
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
                self.assertNotEqual(node.func.id, "str",
                                    "the 503 body must not echo the raw exception")
            if isinstance(node, ast.Name):
                self.assertNotEqual(node.id, "e",
                                    "the 503 body must not reference the raised exception")

    def test_classifier_holds_no_logic_of_its_own(self):
        """The edge must delegate, not re-implement: two copies of the rule
        drift apart, and only the pure one is unit-tested."""
        fn = _find_function(self.tree, "_upstream_unavailable_error")
        self.assertIsNotNone(fn, "_upstream_unavailable_error not found")

        imports = [node for node in ast.walk(fn) if isinstance(node, ast.ImportFrom)]
        self.assertEqual([n.module for n in imports], ["psemine_core"])
        self.assertEqual([a.name for n in imports for a in n.names],
                         ["upstream_unavailable_kind"])

        # Body = docstring, import, return. No branching, no name matching.
        statements = [s for s in fn.body
                      if not (isinstance(s, ast.Expr) and isinstance(s.value, ast.Constant))]
        self.assertEqual(len(statements), 2, f"unexpected logic in the edge: {ast.dump(fn)}")
        self.assertIsInstance(statements[1], ast.Return)
        call = statements[1].value
        self.assertIsInstance(call, ast.Call)
        self.assertEqual(call.func.id, "upstream_unavailable_kind")
        self.assertEqual([a.id for a in call.args], ["exc"])
        self.assertEqual(sorted(k.arg for k in call.keywords), ["extra_types"])

    def test_no_dependency_types_are_resolved_at_module_import(self):
        """Boot order matters on Vercel: resolving google.api_core at import
        time would let a packaging change break the whole function."""
        module_imports = [n for n in self.tree.body if isinstance(n, ast.ImportFrom)]
        modules = {n.module for n in module_imports}
        self.assertNotIn("google.api_core", modules)
        self.assertNotIn("google.cloud", modules)


if __name__ == "__main__":
    unittest.main()
