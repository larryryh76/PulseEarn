# Deployment Topology — PulseEarn

> Read this before touching Vercel. Two similarly named projects exist and
> mixing them up causes failed-deploy emails and confusion.

## Projects

| Project | Domain | Role |
|---|---|---|
| `pulse-earn` | **www.pulseearn.online** | REAL production (API + frontend) |
| `pulseearn` | none | Dead duplicate — framework misconfigured |

## Production deploy flow (correct)

1. Commit to `main` and push to GitHub (`larryryh76/PulseEarn`).
2. Vercel builds `pulse-earn` automatically from the push (commit SHA is
   attached to the deployment).
3. Verify: `vercel ls pulse-earn`, then probe `https://www.pulseearn.online/api/health`.

Do NOT deploy with `vercel deploy --prod` for normal changes — that bypasses
git metadata. (It was used once during the 2026-09-19 incident when the
GitHub webhook was stolen by the duplicate project; content parity was
verified manually afterward.)

## Known trap (2026-09-19 incident)

The `pulseearn` duplicate project was linked to the same GitHub repo with
framework `"services"` and no services declared. Every push then triggered a
3-second failed build there ("Project framework is set to services, but no
services are declared") and sent failure emails, while the real project got
nothing. Fix: `vercel git disconnect` on the duplicate (done 2026-09-19).
If failure emails for `pulseearn` reappear, disconnect it again via:
`vercel link --yes --project pulseearn && vercel git disconnect --yes`
from any temp directory.

## Backend runtime notes

- Flask app: `api/index.py`, served by Vercel Python runtime; package mode
  with task root `/var/task` — the task-root bootstrap at the top of that
  file is REQUIRED for all bare sibling imports; do not remove it
  (see `api/tests/test_taskroot_imports.py`).
- Firebase Admin initializes lazily per request; `api/services/provider_cache.py`
  intentionally does NOT force-warm at import (boot-order safety).
- Receiving wallet `0x8b32A461d3106B3356e9A389DfeB74aC084c8F33` is a locked
  code constant (`PSEMINE_PAYMENT_ADDRESS`) — do not move it to env vars.
