"""
Source-order regression test for Firestore transaction bodies.

WHY SOURCE ORDER, NOT ONLY THE TEST DOUBLE
------------------------------------------
The bug that produced the live 500 (`FAILED_PRECONDITION` from Firestore) was a
*transaction read-after-write*. The in-memory Firestore double in
test_payout_composition.py now rejects that pattern at runtime, which is the
strongest guard there is — but it only covers the paths a test actually drives.
A transaction branch that no test reaches can still be written in the wrong
order and pass the whole suite.

This module therefore checks the real implementation: it parses the backend
source with `ast` and asserts that, inside every transaction body, the last read
appears before the first write. It needs no Firestore, no Flask and no network,
so it runs everywhere.

What counts (within a transaction body):
  read  — a `.get(...)`/`.stream(...)` call issued WITH `transaction=txn`, which is
          how every transactional read in this backend is written. Plain
          `.get('field')` on a dict is not a read and is ignored.
  write — `txn.set(...)`, `txn.update(...)`, `txn.delete(...)`

Building a DocumentReference (`db.collection('x').document()`) is NOT a read: it
performs no I/O, so it may appear anywhere.

Run: python3 -m unittest discover api/tests
"""
import ast
import os
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SOURCES = ["index.py", "psemine_engine.py", "psemine_core.py"]

READ_METHODS = {"get", "stream"}
WRITE_METHODS = {"set", "update", "delete"}


def _inner_transaction_bodies(tree):
    """Yield (outer_name, inner_node, file) for every transaction callback.

    A transaction callback is recognised structurally: a nested function whose
    parameter list includes `txn` (the Firestore `transaction=` argument all
    reads and writes in this codebase are issued against).
    """
    for outer in ast.walk(tree):
        if not isinstance(outer, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        for inner in outer.body:
            if not isinstance(inner, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            names = [a.arg for a in inner.args.args] + [a.arg for a in inner.args.kwonlyargs]
            if "txn" in names:
                yield outer.name, inner


def _is_transactional_read(node):
    """True for `ref.get(transaction=txn)` / `query.stream(transaction=txn)`."""
    if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
        return False
    if node.func.attr not in READ_METHODS:
        return False
    return any(kw.arg == "transaction" for kw in node.keywords)


def _classify(body):
    """Return (read_lines, write_lines) in source order for one transaction body."""
    reads, writes = [], []
    for node in ast.walk(body):
        if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
            continue
        attr = node.func.attr
        receiver = node.func.value
        if _is_transactional_read(node):
            reads.append(node.lineno)
        elif attr in WRITE_METHODS and isinstance(receiver, ast.Name) and receiver.id == "txn":
            writes.append(node.lineno)
    return sorted(reads), sorted(writes)


class TestTransactionOrdering(unittest.TestCase):
    """Every transaction body must read before it writes, in source order."""

    def _file_path(self, name):
        return os.path.join(ROOT, name)

    def test_every_transaction_body_reads_before_it_writes(self):
        checked = 0
        violations = []
        for name in SOURCES:
            path = self._file_path(name)
            if not os.path.exists(path):
                continue
            with open(path, "r", encoding="utf-8") as fh:
                tree = ast.parse(fh.read(), filename=name)
            for outer, body in _inner_transaction_bodies(tree):
                reads, writes = _classify(body)
                if not writes:
                    continue
                checked += 1
                if reads and max(reads) > min(writes):
                    later = [r for r in reads if r > min(writes)]
                    violations.append(
                        f"{name}:{outer}() buffers its first write at line {min(writes)} "
                        f"before read(s) at line(s) {later}"
                    )

        # Non-vacuity: if the recognition heuristic ever stops matching, this test
        # must fail rather than silently pass on an empty set.
        self.assertGreaterEqual(
            checked, 3,
            "Expected to inspect at least 3 transaction bodies; the detector found "
            f"{checked}. Update _inner_transaction_bodies() if the callbacks changed shape.",
        )
        self.assertEqual([], violations, "Transaction read-after-write detected:\n" + "\n".join(violations))

    def test_maintenance_and_accrual_are_covered(self):
        """The two money paths must be among the inspected bodies."""
        found = set()
        for name in SOURCES:
            path = self._file_path(name)
            if not os.path.exists(path):
                continue
            with open(path, "r", encoding="utf-8") as fh:
                tree = ast.parse(fh.read(), filename=name)
            for outer, _ in _inner_transaction_bodies(tree):
                found.add(outer)
        self.assertIn("accrual_checkpoint", found)
        self.assertIn("maintain_ownership", found)

    def test_maintenance_has_no_write_before_its_conditional_settle_reads(self):
        """The specific latent risk removed in this pass.

        maintain_ownership settles from a *conditional* pair of reads (user +
        ledger entry, only when a settle is due). It previously buffered the B2
        reconciliation write inside an earlier exit path, so a small reordering
        of control flow could have put a write before those reads. The body must
        now have zero writes above its last read.
        """
        path = self._file_path("psemine_engine.py")
        with open(path, "r", encoding="utf-8") as fh:
            tree = ast.parse(fh.read(), filename="psemine_engine.py")
        target = [(o, b) for o, b in _inner_transaction_bodies(tree) if o == "maintain_ownership"]
        self.assertEqual(1, len(target), "maintain_ownership transaction body not found")
        reads, writes = _classify(target[0][1])
        self.assertTrue(writes, "maintain_ownership performs no writes? detector is stale")
        self.assertLess(
            max(reads), min(writes),
            f"maintain_ownership: last read at {max(reads)} is not before first write at {min(writes)}",
        )

    def test_test_double_still_rejects_read_after_write(self):
        """The runtime double must keep enforcing the rule it exists to enforce.

        If this ever stops holding, the ordering tests above become the only
        guard and the runtime suite would stop representing production.
        """
        path = os.path.join(ROOT, "tests", "test_payout_composition.py")
        with open(path, "r", encoding="utf-8") as fh:
            source = fh.read()
        self.assertIn("transaction violation", source.lower().replace("firestore ", ""))
        self.assertIn("_ops", source, "the fake no longer tracks buffered writes")


if __name__ == "__main__":
    unittest.main()
