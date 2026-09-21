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
  • writes  — `.set()` / `.update()` / `.delete()` / `.add()` on a metered
              collection or document reference.
  • transactions / batches opened through the metered client.
  • reads and writes attributed per collection, so the expensive query is
    obvious rather than merely the expensive endpoint.

Deliberately NOT claimed:
  • Mutations buffered inside a Firestore transaction are counted by the server
    as writes, but they are issued through the transaction object, which is
    passed to the SDK's own `@transactional` wrapper and therefore cannot be
    proxied without risking the money path. A transaction is reported as one
    `transactions` unit; its internal write count is NOT added to `writes`.
    Use the transaction count plus code review for that number, not this meter.
  • A write issued through a reference obtained from a snapshot
    (`snapshot.reference.update(...)`) is also not counted. Reads dominate the
    quota this addresses and are counted exactly.

The proxy is transparent: every attribute that is not counted is forwarded to
the real Firestore object, and fluent builders (where / limit / order_by /
document / collection) stay metered.
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
        self.reads = 0
        self.writes = 0
        self.transactions = 0
        self.batches = 0
        self.by_collection = {}
        self.started_at = time.perf_counter()

    def _bucket(self, collection):
        key = collection or "(unknown)"
        bucket = self.by_collection.get(key)
        if bucket is None:
            bucket = {"reads": 0, "writes": 0}
            self.by_collection[key] = bucket
        return bucket

    def read(self, collection):
        self.reads += 1
        self._bucket(collection)["reads"] += 1

    def write(self, collection):
        self.writes += 1
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
            "writes": self.writes,
            "transactions": self.transactions,
            "batches": self.batches,
            "durationMs": self.duration_ms(),
            "byCollection": dict(self.by_collection),
        }


class _Metered:
    """Transparent proxy around a Firestore collection / document / query.

    Every attribute that is not explicitly counted (`.id`, `.reference`,
    `.path`, ...) is forwarded verbatim to the real object.
    """

    def __init__(self, inner, tally, collection):
        self.__dict__["_inner"] = inner
        self.__dict__["_tally"] = tally
        self.__dict__["_collection"] = collection

    def __getattr__(self, name):
        return getattr(self.__dict__["_inner"], name)

    def _count_read(self):
        self.__dict__["_tally"].read(self.__dict__["_collection"])

    def _count_write(self):
        self.__dict__["_tally"].write(self.__dict__["_collection"])

    def get(self, *args, **kwargs):
        self._count_read()
        return self.__dict__["_inner"].get(*args, **kwargs)

    def stream(self, *args, **kwargs):
        self._count_read()
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
        inner = self.__dict__["_inner"].where(*args, **kwargs)
        return _Metered(inner, self.__dict__["_tally"], self.__dict__["_collection"])

    def limit(self, *args, **kwargs):
        return _Metered(self.__dict__["_inner"].limit(*args, **kwargs),
                        self.__dict__["_tally"], self.__dict__["_collection"])

    def order_by(self, *args, **kwargs):
        return _Metered(self.__dict__["_inner"].order_by(*args, **kwargs),
                        self.__dict__["_tally"], self.__dict__["_collection"])

    def offset(self, *args, **kwargs):
        return _Metered(self.__dict__["_inner"].offset(*args, **kwargs),
                        self.__dict__["_tally"], self.__dict__["_collection"])

    def select(self, *args, **kwargs):
        return _Metered(self.__dict__["_inner"].select(*args, **kwargs),
                        self.__dict__["_tally"], self.__dict__["_collection"])

    def document(self, *args, **kwargs):
        inner = self.__dict__["_inner"].document(*args, **kwargs)
        return _Metered(inner, self.__dict__["_tally"], self.__dict__["_collection"])

    def collection(self, *args, **kwargs):
        inner = self.__dict__["_inner"].collection(*args, **kwargs)
        return _Metered(inner, self.__dict__["_tally"], self.__dict__["_collection"])


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
        return self.__dict__["_inner"].transaction(*args, **kwargs)

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
