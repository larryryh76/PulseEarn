"""
Tests for the opt-in Firestore metering wrapper.

WHY THIS EXISTS
---------------
The 2026-09-21 incident was invisible until it was fatal: `/api/mine/state`
looked like one dashboard poll while quietly issuing a variable number of
Firestore document reads. `api/services/firestore_metrics.py` makes that visible,
but a measuring tool that lies is worse than none, so its counting and its
transparency (it must not change what the wrapped object does) are tested here.

Run: python3 -m unittest discover -s api/tests -t api/tests
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.firestore_metrics import (  # noqa: E402
    FirestoreTally, metrics_available, metrics_requested, wrap_client,
)


# ---------------------------------------------------------------------------
# A minimal stand-in for the Firestore client API surface the backend uses
# ---------------------------------------------------------------------------

class _FakeSnapshot:
    def __init__(self, doc_id, data=None):
        self.id = doc_id
        self._data = data or {}
        self.exists = data is not None
        self.reference = _FakeDoc(self.id, None)

    def to_dict(self):
        return dict(self._data)


class _FakeDoc:
    def __init__(self, doc_id, collection):
        self.id = doc_id
        self._collection = collection
        self.calls = collection.calls if collection else []
        self.path = f"{collection.name}/{doc_id}" if collection else doc_id

    def get(self, transaction=None):
        self.calls.append(("read", self.path))
        return _FakeSnapshot(self.id, {"id": self.id})

    def set(self, payload, merge=False):
        self.calls.append(("write", self.path))
        return None

    def update(self, payload):
        self.calls.append(("write", self.path))
        return None

    def delete(self):
        self.calls.append(("write", self.path))
        return None


class _FakeQuery:
    def __init__(self, collection, filters=()):
        self._collection = collection
        self._filters = tuple(filters)

    def where(self, field, op, value):
        return _FakeQuery(self._collection, self._filters + ((field, op, value),))

    def limit(self, n):
        return _FakeQuery(self._collection, self._filters)

    def order_by(self, *a, **k):
        return _FakeQuery(self._collection, self._filters)

    def get(self, transaction=None):
        self._collection.calls.append(("read", self._collection.name))
        return [_FakeSnapshot(f"{self._collection.name}_1")]


class _FakeCollection:
    def __init__(self, name, calls):
        self.name = name
        self.calls = calls

    def document(self, doc_id="auto"):
        return _FakeDoc(doc_id, self)

    def where(self, field, op, value):
        return _FakeQuery(self, ((field, op, value),))

    def add(self, payload):
        self.calls.append(("write", self.name))
        return None, _FakeDoc("added", self)

    def get(self):
        self.calls.append(("read", self.name))
        return [_FakeSnapshot(f"{self.name}_1")]


class _FakeTxn:
    """Stand-in for a Firestore transaction: the engine buffers its writes here."""

    def __init__(self):
        self.ops = []

    def get(self, reference, *args, **kwargs):
        self.ops.append(("read", reference))
        return reference.get()

    def set(self, reference, payload, merge=False):
        self.ops.append(("set", reference))
        return None

    def update(self, reference, payload):
        self.ops.append(("update", reference))
        return None

    def delete(self, reference):
        self.ops.append(("delete", reference))
        return None


class _FakeClient:
    def __init__(self):
        self.calls = []
        self.transaction_count = 0
        self.batch_count = 0
        self.txns = []

    def collection(self, name):
        return _FakeCollection(name, self.calls)

    def calls_of_txn(self):
        return [op for txn in self.txns for op in txn.ops]

    def transaction(self):
        self.transaction_count += 1
        txn = _FakeTxn()
        self.txns.append(txn)
        return txn

    def batch(self):
        self.batch_count += 1
        return object()

    def close(self):
        """An attribute the wrapper must forward without counting."""
        return "closed"


class TestTally(unittest.TestCase):
    def test_counts_and_attributes_reads_and_writes(self):
        tally = FirestoreTally()
        tally.read("psemine_mining_ledger")
        tally.read("psemine_mining_ledger")
        tally.read("psemine_users")
        tally.write("psemine_users")
        snapshot = tally.snapshot()
        self.assertEqual(snapshot["reads"], 3)
        self.assertEqual(snapshot["writes"], 1)
        self.assertEqual(snapshot["byCollection"]["psemine_mining_ledger"],
                         {"reads": 2, "documents": 0, "writes": 0})
        self.assertEqual(snapshot["byCollection"]["psemine_users"],
                         {"reads": 1, "documents": 0, "writes": 1})
        self.assertGreaterEqual(snapshot["durationMs"], 0)

    def test_documents_returned_are_tracked_separately_from_read_calls(self):
        """`reads` counts operations; `documents` counts rows. The quota is spent
        on rows, so an empty query and a 400-row query must not look alike."""
        tally = FirestoreTally()
        tally.read("psemine_purchases", documents=0, query=True)
        tally.read("psemine_purchases", documents=400, query=True)
        tally.read("psemine_users", documents=1, query=False)
        snapshot = tally.snapshot()
        self.assertEqual(snapshot["reads"], 3)
        self.assertEqual(snapshot["documents"], 401)
        self.assertEqual(snapshot["queryReads"], 2)
        self.assertEqual(snapshot["documentReads"], 1)
        self.assertEqual(snapshot["byCollection"]["psemine_purchases"]["documents"], 400)

    def test_transaction_buffered_writes_are_counted_and_flagged(self):
        tally = FirestoreTally()
        tally.write("psemine_users")
        tally.write("psemine_users", in_transaction=True)
        snapshot = tally.snapshot()
        self.assertEqual(snapshot["writes"], 2)
        self.assertEqual(snapshot["transactionWrites"], 1)


class TestWrapperTransparency(unittest.TestCase):
    def setUp(self):
        self.client = _FakeClient()
        self.tally = FirestoreTally()
        self.metered = wrap_client(self.client, self.tally)

    def test_none_and_no_tally_are_passed_through(self):
        self.assertIsNone(wrap_client(None, self.tally))
        self.assertIs(self.client, wrap_client(self.client, None))

    def test_uncounted_attributes_are_forwarded(self):
        self.assertEqual(self.metered.close(), "closed")

    def test_document_read_is_counted_on_the_right_collection(self):
        self.metered.collection("psemine_users").document("u1").get()
        self.assertEqual(self.tally.reads, 1)
        self.assertEqual(list(self.tally.by_collection), ["psemine_users"])
        self.assertEqual(self.client.calls, [("read", "psemine_users/u1")])

    def test_chained_query_counts_exactly_one_read(self):
        self.metered.collection("psemine_purchases").where("userId", "==", "u1").limit(5).get()
        self.assertEqual(self.tally.reads, 1)
        self.assertEqual(self.tally.writes, 0)

    def test_writes_are_counted_and_still_reach_the_client(self):
        doc = self.metered.collection("psemine_users").document("u1")
        doc.set({"a": 1})
        doc.update({"b": 2})
        doc.delete()
        self.metered.collection("psemine_activities").add({"c": 3})
        self.assertEqual(self.tally.writes, 4)
        self.assertEqual(self.tally.reads, 0)

    def test_transactions_and_batches_are_counted_once_each(self):
        self.metered.transaction()
        self.metered.transaction()
        self.metered.batch()
        self.assertEqual(self.tally.transactions, 2)
        self.assertEqual(self.tally.batches, 1)
        self.assertEqual(self.client.transaction_count, 2)
        self.assertEqual(self.client.batch_count, 1)

    def test_transactional_read_counts_as_a_read(self):
        txn = self.metered.transaction()
        self.metered.collection("psemine_users").document("u1").get(transaction=txn)
        self.assertEqual(self.tally.reads, 1)
        self.assertEqual(self.tally.transactions, 1)

    def test_query_read_counts_the_documents_it_returned(self):
        """A query that hands back N rows spends N reads, and the meter must say
        so — this is the number that tracks the quota ceiling."""
        self.metered.collection("psemine_purchases").where("userId", "==", "u1").get()
        self.assertEqual(self.tally.reads, 1)
        self.assertEqual(self.tally.documents, 1)  # the fake query returns one row
        self.assertEqual(self.tally.query_reads, 1)
        self.assertEqual(self.tally.document_reads, 0)

    def test_a_failed_read_is_not_billed(self):
        class _Boom(_FakeCollection):
            def document(self, doc_id="auto"):
                raise RuntimeError("resource exhausted")

        client = _FakeClient()
        client.collection = lambda name: _Boom(name, client.calls)
        tally = FirestoreTally()
        metered = wrap_client(client, tally)
        with self.assertRaises(RuntimeError):
            metered.collection("psemine_users").document("u1").get()
        self.assertEqual(tally.reads, 0, "a read that never happened must not be counted")

    def test_transaction_operations_are_counted_and_refs_are_unwrapped(self):
        """The accrual checkpoint writes through the transaction object; the
        meter has to see those, and the SDK has to receive the REAL reference."""
        txn = self.metered.transaction()
        user_ref = self.metered.collection("psemine_users").document("u1")
        txn.update(user_ref, {"accruedMinor": 10})
        txn.update(user_ref, {"lastAccruedAt": "now"})
        txn.get(self.metered.collection("psemine_tool_ownership").document("own1"))
        self.assertEqual(self.tally.writes, 2)
        self.assertEqual(self.tally.transaction_writes, 2)
        self.assertEqual(self.tally.reads, 1)
        self.assertEqual(self.client.transaction_count, 1)
        # Every reference the fake transaction received is a real object, not a proxy.
        for op, reference in self.client.calls_of_txn():
            self.assertIsInstance(reference, _FakeDoc)
        self.assertEqual(self.tally.by_collection["psemine_users"]["writes"], 2)
        self.assertEqual(self.tally.by_collection["psemine_users"]["documents"], 0)

    def test_transaction_reads_are_attributed_to_their_collection(self):
        txn = self.metered.transaction()
        txn.get(self.metered.collection("psemine_tool_ownership").document("own1"))
        self.assertEqual(self.tally.by_collection["psemine_tool_ownership"]["reads"], 1)

    def test_snapshot_references_are_real_objects(self):
        """Reads hand back the client's own snapshots — the wrapper must not
        leak into return values, or downstream `.reference`/`.to_dict()` break."""
        snap = self.metered.collection("psemine_users").document("u1").get()
        self.assertTrue(snap.exists)
        self.assertEqual(snap.to_dict()["id"], "u1")
        first = self.metered.collection("psemine_users").document("u1").get()
        # The returned snapshot must be the client's own object, not a proxy:
        # `snapshot.reference` is then a real reference the engine can write to.
        self.assertIsInstance(first, _FakeSnapshot)
        self.assertIsInstance(first.reference, _FakeDoc)
        self.assertEqual(first.reference.id, "u1")


class TestEnablement(unittest.TestCase):
    def test_header_opt_in(self):
        self.assertTrue(metrics_requested("1"))
        self.assertTrue(metrics_requested(" 1 "))
        for value in (None, "", "0", "true", "yes", "1; drop table"):
            self.assertFalse(metrics_requested(value))

    def test_kill_switch(self):
        self.assertTrue(metrics_available())
        os.environ["PSE_DB_METRICS"] = "off"
        try:
            self.assertFalse(metrics_available())
        finally:
            del os.environ["PSE_DB_METRICS"]
        self.assertTrue(metrics_available())


if __name__ == "__main__":
    unittest.main()
