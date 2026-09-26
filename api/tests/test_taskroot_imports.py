"""Regression tests for the Vercel task-root import failure (incident 2026-09-19).

Production defect (authoritative traceback, requestId 4b398d2f0c5649bc):

    File "/var/task/api/index.py", line 8317, in mine_state
        import psemine_engine as _pse_engine
    ModuleNotFoundError: No module named 'psemine_engine'

On Vercel the Flask app ships as /var/task/api/index.py and is imported in
PACKAGE mode with only the task root on sys.path. Bare sibling imports
(`psemine_engine`, `psemine_core`, `psemine_public`,
`services.provider_cache`) do not resolve in that mode unless the function
directory itself is on sys.path. Locally (`python api/index.py`) the script
directory IS sys.path[0], which masked the defect in every offline test and
is why all 117 pre-incident unit tests passed.

The production boot log showed the same defect class independently:
"[Offerwall] WARNING: Failed to initialize provider cache: No module named
'services'".

The fix under test is the task-root bootstrap at the top of api/index.py:
extracted verbatim, it must put the api/ directory on sys.path in package
mode so every bare sibling import site (37 total: 26x psemine_engine,
3x psemine_core, 1x psemine_public, 6x services.provider_cache, 1x
psemine_engine->psemine_core) resolves without any import maze.

These tests are stdlib-only and run from `python3 -m unittest discover tests`
(execution mode: tests/__init__ adds api/ to sys.path), so they complement —
not duplicate — the disposable .pse-taskroot-harness.tmp.py, which exercises
package mode in an isolated temp task root.
"""
import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest

API_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# Every bare sibling module imported by api/index.py / api/psemine_engine.py.
SIBLING_NAMES = [
    "psemine_engine",
    "psemine_core",
    "psemine_public",
    "services",
    "services.provider_cache",
]


def _bootstrap_block():
    """Extract the exact bootstrap shipped in api/index.py (single source)."""
    with open(os.path.join(API_DIR, "index.py"), encoding="utf-8") as f:
        src = f.read()
    start = src.find("_HERE = os.path.dirname")
    marker = "# position 1: stdlib precedence preserved"
    end = src.find(marker)
    if start == -1 or end == -1:
        raise AssertionError(
            "task-root bootstrap not found at top of api/index.py — "
            "the Vercel package-mode import fix is missing"
        )
    return src[start:src.find("\n", end)].rstrip()


class TestBootstrapShape(unittest.TestCase):
    """Static guarantees about the bootstrap itself."""

    def test_bootstrap_present_and_positioned_before_first_lazy_import(self):
        src = open(os.path.join(API_DIR, "index.py"), encoding="utf-8").read()
        boot = _bootstrap_block()
        self.assertIn("_HERE", boot)
        # First EXECUTABLE lazy import (indented, inside a function) — the
        # commented production traceback also contains the string, so a bare
        # find() would match the comment. Match real code lines only.
        first_lazy = re.search(r"^\s+import psemine_engine", src, re.M)
        self.assertIsNotNone(first_lazy, "no lazy psemine_engine import found")
        self.assertLess(src.find(boot), first_lazy.start(),
                        "bootstrap must precede all lazy sibling imports")

    def test_all_bare_sibling_import_sites_are_covered(self):
        """Enumerate every bare sibling import site — the bootstrap covers all.

        If a future edit adds another bare sibling import, update this census:
        it documents the full blast radius of the package-mode defect.
        """
        # Phase 3A recensus (the numbers moved for two reasons, both reviewable):
        #   * psemine_core 4 -> 11: every PSEmine capacity producer now imports
        #     the canonical core at its call site instead of restating the rates
        #     (recalculate_psemine_user_mining_state, the legacy dashboard,
        #     /sessions/sync, the v1 quote, the v1 activation, the canonical
        #     activation transaction, the canonical-data seed, and the derived
        #     LOCKED_PSEMINE_TOOLS_CONFIG builder);
        #   * psemine_engine 26 -> 25: psemine_sync_session carried a duplicate
        #     `import psemine_engine as _pse_engine` in the same function body;
        #   * psemine_public 1 -> 2: the public tool projection is imported by
        #     the app's _public_tool_view, beside public_campaign_view.
        per_file = {
            "index.py": {"psemine_engine": 25, "psemine_core": 11,
                         "psemine_public": 2, "services.provider_cache": 6},
            "psemine_engine.py": {"psemine_engine": 0, "psemine_core": 1,
                                  "psemine_public": 0},
        }
        for fname, counters in per_file.items():
            src = open(os.path.join(API_DIR, fname), encoding="utf-8").read()
            self.assertEqual(
                len(re.findall(r"import psemine_engine(?:\s|$| as)", src)),
                counters["psemine_engine"], fname)
            self.assertEqual(
                len(re.findall(r"(?:import psemine_core|from psemine_core import)", src)),
                counters["psemine_core"], fname)
            if "psemine_public" in counters:
                self.assertEqual(
                    len(re.findall(r"from psemine_public import", src)),
                    counters["psemine_public"], fname)
        src = open(os.path.join(API_DIR, "index.py"), encoding="utf-8").read()
        self.assertEqual(len(re.findall(r"from services.provider_cache import", src)), 6)
        # The services package must be a REGULAR package (deterministic
        # resolution in both execution modes).
        self.assertTrue(
            os.path.isfile(os.path.join(API_DIR, "services", "__init__.py")),
            "api/services/__init__.py missing — namespace-package resolution is fragile")


class TestPackageModeResolution(unittest.TestCase):
    """Reproduce Vercel package mode (task root on sys.path, cwd=task root)
    in an isolated temp dir and prove the defect and the fix."""

    @classmethod
    def setUpClass(cls):
        cls.root = tempfile.mkdtemp(prefix="pse-taskroot-test-")
        shutil.copytree(API_DIR, os.path.join(cls.root, "api"),
                        ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.root, ignore_errors=True)

    def _py(self, code):
        env = dict(os.environ)
        env.pop("FIREBASE_SERVICE_ACCOUNT", None)  # never touch prod creds
        env["PYTHONPATH"] = self.root
        return subprocess.run(
            [sys.executable, "-c", code],
            cwd=self.root, env=env, capture_output=True, text=True, timeout=120,
        )

    def test_defect_reproduces_without_bootstrap(self):
        """Sans bootstrap, bare sibling names must NOT resolve in package mode.
        Proves the harness layout is faithful to the production failure."""
        probe = (
            "import importlib.util, json\n"
            "res = {}\n"
            "for n in " + repr(SIBLING_NAMES) + ":\n"
            "    try:\n"
            "        s = importlib.util.find_spec(n)\n"
            "        res[n] = bool(s)\n"
            "    except Exception:\n"
            "        res[n] = False\n"
            "print(json.dumps(res))\n"
        )
        proc = self._py(probe)
        data = json.loads(proc.stdout.strip().splitlines()[-1])
        self.assertTrue(all(v is False for v in data.values()),
                        f"package mode unexpectedly resolved: {data}")

    def test_bootstrap_resolves_all_siblings_in_package_mode(self):
        """With the shipped bootstrap, every bare sibling name must resolve."""
        boot = _bootstrap_block()
        probe = (
            "import os, sys\n"
            "__file__ = os.path.join(os.getcwd(), 'api', 'index.py')\n"
            + boot + "\n"
            "import importlib.util, json\n"
            "res = {}\n"
            "for n in " + repr(SIBLING_NAMES) + ":\n"
            "    try:\n"
            "        s = importlib.util.find_spec(n)\n"
            "        res[n] = bool(s)\n"
            "    except Exception:\n"
            "        res[n] = False\n"
            "print(json.dumps(res))\n"
        )
        proc = self._py(probe)
        data = json.loads(proc.stdout.strip().splitlines()[-1])
        missing = [n for n, ok in data.items() if not ok]
        self.assertEqual(missing, [],
                         f"bootstrap failed to resolve in package mode: {data}")

    def test_real_engine_import_works_in_package_mode(self):
        """The exact statement that failed in production must succeed."""
        boot = _bootstrap_block()
        proc = self._py(
            "import os, sys\n"
            "__file__ = os.path.join(os.getcwd(), 'api', 'index.py')\n"
            + boot + "\n"
            "import psemine_engine as _pse_engine\n"
            "assert _pse_engine.__file__.endswith('api/psemine_engine.py')\n"
            "print('REAL-IMPORT-OK')\n"
        )
        self.assertIn("REAL-IMPORT-OK", proc.stdout)


class TestLegacyDataShapes(unittest.TestCase):
    """The engine must keep handling the data shapes feared during the
    investigation (legacy/malformed persisted fields) — Phase 5 requirement
    that valid existing users and legacy rows both keep working."""

    @classmethod
    def setUpClass(cls):
        sys.path.insert(0, API_DIR)
        import psemine_engine as eng  # noqa: F401
        import psemine_core as core
        cls.eng = eng
        cls.core = core

    def test_engine_imports_off_sys_path_execution_mode(self):
        self.assertTrue(hasattr(self.eng, "accrual_checkpoint"))
        self.assertTrue(hasattr(self.eng, "ensure_psemine_user"))

    def test_legacy_anchorless_ownership_still_recognized(self):
        """B2 legacy shape: activatedAt present, no canonical anchors — the
        engine must recognize it and reconcile (not crash)."""
        legacy = {"toolId": "starter", "userId": "u1",
                  "activatedAt": "2026-01-01T00:00:00Z"}
        self.assertTrue(self.core.is_anchorless_legacy_ownership(legacy))
        # Canonical anchors present -> NOT anchorless.
        canonical = dict(legacy, lastAccruedAt="2026-09-19T00:00:00Z")
        self.assertFalse(self.core.is_anchorless_legacy_ownership(canonical))

    def test_derive_cycle_survives_malformed_anchors(self):
        # Malformed/legacy anchor values must not raise; engine normalizes.
        try:
            cycle = self.core.derive_cycle(
                {"toolId": "starter", "lastAccrualAt": "not-a-timestamp"},
                now=self.core.datetime.now(self.core.timezone.utc),
            )
        except Exception as e:  # malformed input may raise ValueError, not crash the request
            self.assertIsInstance(e, ValueError)
        else:
            self.assertIsNotNone(cycle)

    def test_locked_economics_unchanged(self):
        """Phase 9/13: economics must remain exactly as locked."""
        tools = self.core.LOCKED_PSEMINE_TOOLS
        self.assertEqual(tools["starter"]["price_minor_units"], 300)
        self.assertEqual(tools["builder"]["price_minor_units"], 1000)
        self.assertEqual(tools["advanced"]["price_minor_units"], 5000)
        self.assertEqual(tools["elite"]["price_minor_units"], 20000)
        self.assertEqual(tools["starter"]["hourly_rate_minor"], 10)
        self.assertEqual(tools["builder"]["hourly_rate_minor"], 50)
        self.assertEqual(tools["advanced"]["hourly_rate_minor"], 120)
        self.assertEqual(tools["elite"]["hourly_rate_minor"], 250)


if __name__ == "__main__":
    unittest.main()
