"""
Single-source PSEmine economy contract (Phase 3A).

THE DEFECT THIS GUARDS
----------------------
The Phase 3 verification found the PSEmine capacity rules expressed in more than
one place. `recalculate_psemine_user_mining_state`, the legacy
/api/psemine/dashboard, /api/psemine/sessions/sync, the v1 purchase quote, the v1
on-chain activation and the canonical activation transaction each re-derived the
locked hourly rates (£0.10/£0.50/£1.20/£2.50), the referral bonus (£0.30), the
ownership caps and the £12.10 ceiling inline.

They agreed numerically, which is exactly what made them dangerous: the next
change to a rate would have had to be made in five places, and any miss would
have produced a silent divergence between what a user was quoted and what the
ledger accrued. Numbers that agree by hand are not a contract.

WHAT IS ASSERTED
----------------
  1. The locked rate / referral numerals do not appear in ANY PSEmine function.
     They still legitimately appear in the PulseEarn offerwall region, which is
     a different product's provider-share arithmetic (30% / 15%) and out of
     scope — that exclusion is pinned to named functions, and the test refuses
     an allow-list entry that looks like PSEmine.
  2. Every PSEmine capacity producer consumes psemine_core's capacity
     functions instead of restating them.
  3. The purchase-side view of the locked economics is DERIVED, not restated,
     and the seed writer derives its rows from the same constants.
  4. The canonical table itself is the locked spec (prices, rates, ownership
     caps, additive maxima) — so "derive from core" and "the spec" are the same
     statement.

Run: python3 -m unittest discover -s api/tests -t api/tests
"""
import ast
import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import psemine_core  # noqa: E402

API_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
INDEX_SRC = os.path.join(API_DIR, "index.py")

# The numerals that encode PSEmine capacity. 10.6 = max tool capacity/hour,
# 12.1 = max theoretical total/hour, 0.3 = referral bonus/hour, 0.1/0.5/1.2/2.5
# = the four locked hourly rates.
LOCKED_NUMERALS = (0.1, 0.5, 1.2, 2.5, 0.3, 10.6, 12.1)

# Functions that may legitimately contain one of those numerals, and why. Every
# entry is PulseEarn offerwall / marketplace provider-share arithmetic — NOT
# PSEmine capacity. The test below rejects any entry whose name looks like
# PSEmine, so the list cannot be used to quietly re-open the defect.
NON_PSEMINE_OWNERS = {
    "_normalize_cpagrip_offer": "PulseEarn CPAGrip provider share (15%/30%)",
    "_offerwall_callback_impl": "PulseEarn offerwall provider share (30%)",
    "calculate_marketplace_operational_intelligence": "PulseEarn marketplace split (15%/30%)",
    "cpagrip_callback": "PulseEarn CPAGrip callback share (30%)",
    "offerwall_analytics": "PulseEarn offerwall analytics share (30%)",
}

CAPACITY_CONSUMERS = {
    "recalculate_psemine_user_mining_state": (
        "compute_tool_capacity_minor",
        "compute_referral_capacity_minor",
        "compute_total_capacity_minor",
    ),
    "psemine_dashboard_data": (
        "compute_tool_capacity_minor",
        "compute_referral_capacity_minor",
        "compute_total_capacity_minor",
    ),
    "psemine_sync_session": (
        "compute_tool_capacity_minor",
        "compute_referral_capacity_minor",
        "compute_total_capacity_minor",
    ),
    "verify_psemine_tool_purchase": (
        "compute_tool_capacity_minor",
        "compute_referral_capacity_minor",
        "compute_total_capacity_minor",
    ),
}

CONSTANT_CONSUMERS = {
    "LOCKED_PSEMINE_TOOLS_CONFIG": ("psemine_create_order", "psemine_verify_payment"),
    "LOCKED_PSEMINE_TOOLS": ("psemine_ensure_canonical_data", "psemine_verify_payment"),
}


def _source():
    with open(INDEX_SRC, "r", encoding="utf-8") as fh:
        return fh.read()


def _functions():
    """Top-level functions of api/index.py, keyed by name."""
    tree = ast.parse(_source())
    return {node.name: node for node in tree.body if isinstance(node, ast.FunctionDef)}


def _function_source(name):
    tree = ast.parse(_source())
    for node in tree.body:
        if isinstance(node, ast.FunctionDef) and node.name == name:
            lines = _source().split("\n")
            return "\n".join(lines[node.lineno - 1:node.end_lineno])
    raise AssertionError("%s is missing from api/index.py" % name)


def _numeric_literal_owners():
    """Map function name -> set of LOCKED numerals found inside it."""
    tree = ast.parse(_source())
    parents = {}
    for node in ast.walk(tree):
        for child in ast.iter_child_nodes(node):
            parents[child] = node

    def owner(node):
        cur = node
        while cur in parents:
            cur = parents[cur]
            if isinstance(cur, ast.FunctionDef):
                return cur.name
        return "<module>"

    found = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.Constant) and isinstance(node.value, float):
            if node.value in LOCKED_NUMERALS:
                found.setdefault(owner(node), set()).add(node.value)
    return found


class TestNoDuplicatedEconomyNumerals(unittest.TestCase):
    """A locked rate must not be re-stated by hand anywhere in PSEmine code."""

    def test_locked_numerals_live_only_in_pulseearn_offerwall_code(self):
        owners = _numeric_literal_owners()
        unexpected = {
            name: sorted(values)
            for name, values in owners.items()
            if name not in NON_PSEMINE_OWNERS
        }
        self.assertEqual(
            {}, unexpected,
            "a PSEmine capacity rule was restated as a literal instead of being "
            "read from psemine_core (owners: %s)" % sorted(unexpected),
        )

    def test_the_exclusion_list_cannot_hide_a_psemine_function(self):
        for name in NON_PSEMINE_OWNERS:
            lowered = name.lower()
            for forbidden in ("psemine", "pse_", "mining", "mine_"):
                self.assertNotIn(
                    forbidden, lowered,
                    "the offerwall exclusion list must never contain a PSEmine "
                    "function (%s)" % name,
                )

    def test_exclusion_list_is_not_stale(self):
        """Every excluded function must still exist and still hold such a numeral."""
        owners = _numeric_literal_owners()
        names = _functions()
        for name in NON_PSEMINE_OWNERS:
            self.assertIn(name, names, "%s no longer exists" % name)
            self.assertIn(name, owners, "%s no longer holds a shared numeral" % name)


class TestCapacityProducersConsumeCore(unittest.TestCase):
    """Every producer of a capacity figure goes through psemine_core."""

    def test_each_producer_calls_the_canonical_capacity_functions(self):
        for function, required in CAPACITY_CONSUMERS.items():
            body = _function_source(function)
            self.assertIn("psemine_core", body, "%s does not import the core" % function)
            for symbol in required:
                self.assertIn(
                    symbol, body,
                    "%s computes capacity without psemine_core.%s" % (function, symbol),
                )

    def test_purchase_paths_read_the_locked_config_not_the_tool_document(self):
        for constant, functions in CONSTANT_CONSUMERS.items():
            for function in functions:
                body = _function_source(function)
                self.assertIn(
                    constant, body,
                    "%s does not consume %s" % (function, constant),
                )

    def test_ownership_caps_come_from_the_locked_table(self):
        """max_per_user is a locked rule, never a document value, for canonical ids.

        The legacy quote used `safe_int(tool.get('maxCopiesPerUser'), 1)`, i.e.
        the ownership limit came from a mutable document — a second statement of
        a locked rule. It is now the canonical constant.
        """
        body = _function_source("psemine_create_order")
        self.assertIn("max_copies = tool_cfg['max_per_user']", body)
        self.assertNotIn("maxCopiesPerUser", body)


class TestLockedConfigIsDerived(unittest.TestCase):
    """The purchase-side view must be a projection of the core, not a copy."""

    def test_locked_tools_config_is_built_from_the_core(self):
        source = _source()
        self.assertIn("LOCKED_PSEMINE_TOOLS_CONFIG = _build_locked_tools_config()", source)
        builder = _function_source("_build_locked_tools_config")
        self.assertIn("LOCKED_PSEMINE_TOOLS", builder)
        for symbol in ("gbp_minor_to_major", "hourly_rate_minor", "price_minor_units",
                       "max_per_user", "price_gbp", "hourly_rate"):
            self.assertIn(symbol, builder)
        # The minor-unit values must be carried through, never recomputed from
        # the float (the old code did `int(round(hourly_rate * 100))`). Asserted
        # on the AST so the prose above cannot satisfy or break it.
        tree = ast.parse(_source())
        node = next(
            n for n in tree.body
            if isinstance(n, ast.FunctionDef) and n.name == "_build_locked_tools_config"
        )
        rounded = [
            inner.lineno for inner in ast.walk(node)
            if isinstance(inner, ast.Call) and getattr(inner.func, "id", "") == "round"
        ]
        self.assertEqual([], rounded, "the derived view rounds money through a float again")
        scaled = [
            inner.lineno for inner in ast.walk(node)
            if isinstance(inner, ast.Constant) and inner.value == 100
        ]
        self.assertEqual([], scaled, "the derived view recomputes minor units (x100)")

    def test_locked_tools_config_is_not_a_literal_table(self):
        source = _source()
        self.assertNotRegex(
            source,
            r'LOCKED_PSEMINE_TOOLS_CONFIG = \{\s*\n\s*"starter"',
            "the locked tool table was restated as a literal dict again",
        )

    def test_seed_rows_are_derived_from_the_core(self):
        body = _function_source("psemine_ensure_canonical_data")
        self.assertIn("LOCKED_PSEMINE_TOOLS", body)
        for literal in ("'miningRateGbpPerHour': 0.10", "'priceGbp': 3.0",
                        "'maxCopiesPerUser': 5", "'name': 'Elite'"):
            self.assertNotIn(
                literal, body,
                "the canonical-data seed restates %s instead of deriving it" % literal,
            )


class TestCanonicalTableIsTheLockedSpec(unittest.TestCase):
    """`derive from core` and `the locked spec` must be the same statement."""

    def test_tier_economics(self):
        expected = {
            "starter": ("Starter Miner", 300, 10, 5),
            "builder": ("Builder Miner", 1000, 50, 3),
            "advanced": ("Advanced Miner", 5000, 120, 3),
            "elite": ("Elite Miner", 20000, 250, 2),
        }
        self.assertEqual(set(expected), set(psemine_core.LOCKED_PSEMINE_TOOLS))
        for tool_id, (name, price_minor, rate_minor, cap) in expected.items():
            spec = psemine_core.LOCKED_PSEMINE_TOOLS[tool_id]
            self.assertEqual(name, spec["name"])
            self.assertEqual(price_minor, spec["price_minor_units"])
            self.assertEqual(rate_minor, spec["hourly_rate_minor"])
            self.assertEqual(cap, spec["max_per_user"])

    def test_maximum_tool_capacity_is_the_locked_sum_of_full_ownership(self):
        full = {tid: spec["max_per_user"] for tid, spec in psemine_core.LOCKED_PSEMINE_TOOLS.items()}
        self.assertEqual(
            psemine_core.MAX_TOOL_CAPACITY_MINOR_PER_HOUR,
            psemine_core.compute_tool_capacity_minor(full),
        )
        self.assertEqual(1060, psemine_core.MAX_TOOL_CAPACITY_MINOR_PER_HOUR)

    def test_referral_capacity_and_total_caps(self):
        self.assertEqual(5, psemine_core.MAX_QUALIFIED_REFERRALS)
        self.assertEqual(30, psemine_core.REFERRAL_BONUS_MINOR_PER_HOUR)
        self.assertEqual(150, psemine_core.compute_referral_capacity_minor(99))
        self.assertEqual(150, psemine_core.MAX_REFERRAL_CAPACITY_MINOR_PER_HOUR)
        self.assertEqual(
            1210, psemine_core.MAX_THEORETICAL_CAPACITY_MINOR_PER_HOUR,
        )
        full = {tid: spec["max_per_user"] for tid, spec in psemine_core.LOCKED_PSEMINE_TOOLS.items()}
        self.assertEqual(
            1210, psemine_core.compute_total_capacity_minor(full, 99),
        )


if __name__ == "__main__":
    unittest.main()
