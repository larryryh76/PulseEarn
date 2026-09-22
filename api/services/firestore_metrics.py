"""
Opt-in Firestore operation metering for PSEmine requests.

WHY
---
Production incident 2026-09-21 was a Firestore quota exhaustion. The service
recovered only when the quota was raised, but the deeper problem was that nobody
could see how expensive a request actually was: `/api/mine/state` looked like a
single dashboard poll while quietly issuing a variable number of Firestore
document reads. Read amplification is invisible until it exhausts a ceiling, so
this module makes it measurable.

HOW IT IS ENABLED
-----------------
Per request, by the caller, with the header `X-Pse-Db-Metrics: 1`. Ordinary
users never send it, so the wrapper is never installed for them and production
behaviour is byte-identical when it is absent. QA harnesses opt in explicitly.

WHAT IS COUNTED, AND WHAT IS NOT
--------------------------------
Counted exactly:
  • reads   — `.get()` / `.stream()` on a metered collection, document or query,
              including transactional reads (they are issued through the same
              reference API).
  • documents — rows actually RETURNED by a query read. This is the number that
              tracks the quota ceiling: a query that returns 400 documents costs
              400 document reads, while one that returns none still costs the
              minimum of one. Counting only "read calls" cannot tell those two
              situations apart, which is exactly how the 2026-09-21 fan-out went
              unnoticed.
  • documentReads / queryReads — the same reads split by shape, so a pathological
              point lookup (per-document) is distinguishable from a collection
              query (per-row).
  • writes  — `.set()` / `.update()` / `.delete()` / `.add()` on a metered
              collection or document reference, PLUS writes buffered inside a
              metered transaction (`transactionWrites`) — the accrual checkpoint
              writes that way, and "does merely opening the dashboard write?" is
              a question this meter has to be able to answer.
  • transactions / batches opened through the metered client.
  • reads and writes attributed per collection, so the expensive query is
    obvious rather than merely the expensive endpoint.

Deliberately NOT claimed:
  • `.stream()` results are generators: the row count cannot be measured without
    consuming them, so `documents` counts `.get()` results only (the whole
    PSEmine backend uses `.get()`).
  • Writes issued through a reference taken from a snapshot
    (`snapshot.reference.update(...)`) are not counted by collection: the
    snapshot is the client's own object and the wrapper must not replace it
    (`snapshot.reference` has to stay a real reference for the money path).
    Those writes ARE counted in the total when they pass through a metered
    document reference; reads dominate the quota this addresses and are counted
    exactly.
  • Listener deliveries are a client-side (Firebase SDK) read and are not
    observable here. The client listener inventory is a code-level fact (see
    `api/tests/test_client_listener_bounds.py`), not a server measurement.

SAFETY
------
The proxy is transparent: every attribute that is not counted is forwarded to
the real Firestore object, fluent builders (where / limit / order_by / document /
collection) stay metered, and a transaction proxy unwraps metered references
before handing them to the SDK so the money path always receives real
references. Metering only ever runs for a request that opted in with the
`X-Pse-Db-Metrics: 1` header (never an ordinary user), and `wrap_client` can
never raise: on any failure the caller gets its real client back.
"""

import os
import time

# Methods that spend the read budget.
_READ_METHODS = ("get", "stream")
# Methods that spend the write budget.
_WRITE_METHODS = ("set", "update", "delete", "add")
# Fluent builders that must return a metered object so counts follow the chain.
_BUILDER_METHODS = (
    "where", "limit", "order_by", "offset", "start_at", "start_after",
    "end_at", "end_before", "select", "document", "collection",
)

METRICS_HEADER = "X-Pse-Db-Metrics"


def metrics_requested(header_value):
    """True when a caller explicitly asked for metering on this request."""
    return (header_value or "").strip() == "1"


def metrics_available():
    """Kill switch: metering can be disabled deployment-wide with
    PSE_DB_METRICS=off, even for callers that send the header."""
    return (os.environ.get("PSE_DB_METRICS") or "").strip().lower() not in ("off", "0", "false", "no")


class FirestoreTally:
    """Per-request Firestore operation tally."""

    def __init__(self):
        self.reads = 0              # read operations (document gets + query gets)
        self.documents = 0          # documents returned by those reads
        self.document_reads = 0     # reads shaped as a single-document lookup
        self.query_reads = 0        # reads shaped as a collection/query read
        self.writes = 0             # writes issued on a reference
        self.transaction_writes = 0  # writes buffered inside a transaction
        self.transactions = 0
        self.batches = 0
        self.by_collection = {}
        self.started_at = time.perf_counter()

    def _bucket(self, collection):
        key = collection or "(unknown)"
        bucket = self.by_collection.get(key)
        if bucket is None:
            bucket = {"reads": 0, "documents": 0, "writes": 0}
            self.by_collection[key] = bucket
        return bucket

    def read(self, collection, documents=0, query=False):
        self.reads += 1
        self.documents += int(documents or 0)
        if query:
            self.query_reads += 1
        else:
            self.document_reads += 1
        bucket = self._bucket(collection)
        bucket["reads"] += 1
        bucket["documents"] += int(documents or 0)

    def write(self, collection, in_transaction=False):
        self.writes += 1
        if in_transaction:
            self.transaction_writes += 1
        self._bucket(collection)["writes"] += 1

    def transaction(self):
        self.transactions += 1

    def batch(self):
        self.batches += 1

    def duration_ms(self):
        return round((time.perf_counter() - self.started_at) * 1000, 2)

    def snapshot(self):
        return {
            "reads": self.reads,
            "documents": self.documents,
            "documentReads": self.document_reads,
            "queryReads": self.query_reads,
            "writes": self.writes,
            "transactionWrites": self.transaction_writes,
            "transactions": self.transactions,
            "batches": self.batches,
            "durationMs": self.duration_ms(),
            "byCollection": dict(self.by_collection),
        }


def _count_rows(result):
    """Rows returned by a query read, or 0 when the shape cannot be counted
    without consuming it (generators, single snapshots)."""
    try:
        return len(result)
    except TypeError:
        return 0


def unwrap(reference):
    """The real Firestore object behind a metered proxy (or the value itself)."""
    inner = getattr(reference, "__dict__", {}).get("_inner") if hasattr(reference, "__dict__") else None
    return inner if inner is not None else reference


def _collection_of(reference):
    """Collection name behind a metered reference, a real reference or a path."""
    ref = unwrap(reference)
    if isinstance(ref, str):
        return ref.split("/")[0] if ref else "(unknown)"
    for attr in ("_collection", "collection"):
        value = getattr(ref, attr, None)
        if isinstance(value, str):
            return value
        name = getattr(value, "name", None) if value is not None else None
        if isinstance(name, str):
            return name
    path = getattr(ref, "path", None)
    if isinstance(path, str) and "/" in path:
        return path.split("/")[0]
    return "(unknown)"


class _Metered:
    """Transparent proxy around a Firestore collection / document / query.

    Every attribute that is not explicitly counted (`.id`, `.reference`,
    `.path`, ...) is forwarded verbatim to the real object.
    """

    def __init__(self, inner, tally, collection, kind="collection"):
        self.__dict__["_inner"] = inner
        self.__dict__["_tally"] = tally
        self.__dict__["_collection"] = collection
        self.__dict__["_kind"] = kind

    def __getattr__(self, name):
        return getattr(self.__dict__["_inner"], name)

    def _count_write(self):
        self.__dict__["_tally"].write(self.__dict__["_collection"])

    def _narrow(self, inner, kind=None):
        return _Metered(inner, self.__dict__["_tally"], self.__dict__["_collection"],
                        kind or self.__dict__["_kind"])

    def get(self, *args, **kwargs):
        result = self.__dict__["_inner"].get(*args, **kwargs)
        kind = self.__dict__["_kind"]
        documents = 1 if kind == "document" else _count_rows(result)
        self.__dict__["_tally"].read(self.__dict__["_collection"],
                                     documents=documents, query=(kind != "document"))
        return result

    def stream(self, *args, **kwargs):
        # A generator cannot be measured without consuming it: count the read,
        # attribute no documents, and say so in the module docstring.
        self.__dict__["_tally"].read(self.__dict__["_collection"], query=True)
        return self.__dict__["_inner"].stream(*args, **kwargs)

    def set(self, *args, **kwargs):
        self._count_write()
        return self.__dict__["_inner"].set(*args, **kwargs)

    def update(self, *args, **kwargs):
        self._count_write()
        return self.__dict__["_inner"].update(*args, **kwargs)

    def delete(self, *args, **kwargs):
        self._count_write()
        return self.__dict__["_inner"].delete(*args, **kwargs)

    def add(self, *args, **kwargs):
        self._count_write()
        return self.__dict__["_inner"].add(*args, **kwargs)

    def where(self, *args, **kwargs):
        return self._narrow(self.__dict__["_inner"].where(*args, **kwargs), "query")

    def limit(self, *args, **kwargs):
        return self._narrow(self.__dict__["_inner"].limit(*args, **kwargs), "query")

    def order_by(self, *args, **kwargs):
        return self._narrow(self.__dict__["_inner"].order_by(*args, **kwargs), "query")

    def offset(self, *args, **kwargs):
        return self._narrow(self.__dict__["_inner"].offset(*args, **kwargs), "query")

    def select(self, *args, **kwargs):
        return self._narrow(self.__dict__["_inner"].select(*args, **kwargs), "query")

    def document(self, *args, **kwargs):
        return self._narrow(self.__dict__["_inner"].document(*args, **kwargs), "document")

    def collection(self, *args, **kwargs):
        return self._narrow(self.__dict__["_inner"].collection(*args, **kwargs), "collection")


class _MeteredTxn:
    """Proxy around a transaction that counts every operation it buffers.

    WHY: the canonical accrual checkpoint performs its writes through the
    transaction object, so without this the meter could not answer the question
    the 2026-09-21 remediation turned on — "does merely opening the dashboard
    write to Firestore?". Every operation is forwarded to the REAL transaction
    with the reference unwrapped, so the SDK always receives real references and
    the money path is unchanged; only the request that opted into metering ever
    sees this wrapper.
    """

    def __init__(self, inner, tally):
        self.__dict__["_inner"] = inner
        self.__dict__["_tally"] = tally

    def __getattr__(self, name):
        # _begin / _commit / _rollback / _clean_up and anything else the SDK's
        # @transactional decorator calls are forwarded to the REAL transaction.
        return getattr(self.__dict__["_inner"], name)

    def get(self, reference, *args, **kwargs):
        self.__dict__["_tally"].read(_collection_of(reference))
        return self.__dict__["_inner"].get(unwrap(reference), *args, **kwargs)

    def set(self, reference, *args, **kwargs):
        self.__dict__["_tally"].write(_collection_of(reference), in_transaction=True)
        return self.__dict__["_inner"].set(unwrap(reference), *args, **kwargs)

    def update(self, reference, *args, **kwargs):
        self.__dict__["_tally"].write(_collection_of(reference), in_transaction=True)
        return self.__dict__["_inner"].update(unwrap(reference), *args, **kwargs)

    def delete(self, reference, *args, **kwargs):
        self.__dict__["_tally"].write(_collection_of(reference), in_transaction=True)
        return self.__dict__["_inner"].delete(unwrap(reference), *args, **kwargs)


class _MeteredClient:
    """Transparent proxy around the Firestore client."""

    def __init__(self, inner, tally):
        self.__dict__["_inner"] = inner
        self.__dict__["_tally"] = tally

    def __getattr__(self, name):
        return getattr(self.__dict__["_inner"], name)

    def _collection_name(self, name):
        return name if isinstance(name, str) else getattr(name, "id", None)

    def collection(self, name, *args, **kwargs):
        inner = self.__dict__["_inner"].collection(name, *args, **kwargs)
        return _Metered(inner, self.__dict__["_tally"], self._collection_name(name))

    def collection_group(self, name, *args, **kwargs):
        inner = self.__dict__["_inner"].collection_group(name, *args, **kwargs)
        return _Metered(inner, self.__dict__["_tally"], self._collection_name(name))

    def document(self, path, *args, **kwargs):
        inner = self.__dict__["_inner"].document(path, *args, **kwargs)
        first = path.split("/")[0] if isinstance(path, str) else None
        return _Metered(inner, self.__dict__["_tally"], first)

    def transaction(self, *args, **kwargs):
        self.__dict__["_tally"].transaction()
        inner = self.__dict__["_inner"].transaction(*args, **kwargs)
        try:
            return _MeteredTxn(inner, self.__dict__["_tally"])
        except Exception:  # pragma: no cover - never break a transaction
            return inner

    def batch(self, *args, **kwargs):
        self.__dict__["_tally"].batch()
        return self.__dict__["_inner"].batch(*args, **kwargs)


def wrap_client(client, tally):
    """Return a metered view of `client` bound to `tally` (or the client itself
    when metering is not possible, so a failure here can never break a request)."""
    if client is None or tally is None:
        return client
    try:
        return _MeteredClient(client, tally)
    except Exception:  # pragma: no cover - defensive: never fail a request
        return client
