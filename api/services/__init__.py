"""PulseEarn backend services package (Offerwall provider cache, etc.).

Kept as an explicit regular package so `services.*` resolves deterministically
under both execution modes:
  - local:    `python api/index.py`   (api/ on sys.path)
  - Vercel:   package `api.index` rooted at /var/task (bootstrap in
              api/index.py puts the function directory on sys.path)
"""

__all__ = ["provider_cache"]
