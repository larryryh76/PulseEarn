# PRODUCTION DIAGNOSTIC & ROOT CAUSE REPORT

**Date:** February 28, 2025
**System:** PulseEarn Platform (Vercel / Flask / Vite / React)
**Status:** RESOLVED & VERIFIED

---

## EXECUTIVE SUMMARY

A thorough diagnostic investigation was conducted across the codebase and runtime setup to identify the root causes of three critical errors blocking tool purchases and wallet connections. All three issues have been deeply investigated, diagnosed, and resolved at their core.

---

## ERROR #1: INTERNAL SERVER ERROR (500) & CORS FAILURES

### 1. Where it happens
When users or frontend clients attempt to trigger backend API operations under `/api/*`.

### 2. Stack Trace / Exception Analysis
- **Trigger Line:** `if CORS: CORS(app, resources={r"/api/*": {"origins": "*"}})`.
- **Exception Cause:** In `api/index.py`, `CORS` was declared as a module-global `None` and lazily imported inside `get_deps()`. However, the conditional initialization `if CORS: CORS(...)` ran at script import time (before `get_deps()` was ever called). Consequently, `CORS` evaluated to `None`, skipping `CORS(app)` initialization entirely and omitting `Access-Control-Allow-Origin` headers on API responses.
- **Database Failure Cause:** Unhandled missing or invalid `FIREBASE_SERVICE_ACCOUNT` credentials caused `require_db` decorators to fail or throw uncaught exceptions during Firestore connections.

### 3. Root Cause
1. CORS extension was not initialized during Flask app bootstrapping.
2. Unhandled missing service account credentials led to raw 500 errors.

### 4. Code Fix
- Initialized `from flask_cors import CORS` and `CORS(app, resources={r"/api/*": {"origins": "*"}})` at module load time.
- Updated `require_db` error handler to explicitly catch missing credentials and return a clean 503 JSON payload (`{"success": false, "error": "DATABASE_UNAVAILABLE", "message": "Database unavailable, please try again later."}`).
- Genericized production error handling in `@app.errorhandler(Exception)` so internal stack traces are logged server-side only and never leaked to the client.

---

## ERROR #2: DEAD LINK (`link.trustwallet.com/wc`) WHEN CONNECTING WALLET

### 1. Where it happens
When mobile users tap "Connect Wallet" inside in-app webviews (Telegram, Discord, Instagram, Twitter) or when asynchronous handlers trigger wallet connection modals.

### 2. Code Location
- `src/contexts/PsemineWalletContext.tsx` and `src/main.tsx` using `@trustwallet/connect-react` and `@trustwallet/connect-walletconnect`.

### 3. Root Cause
1. In mobile browsers and in-app webviews (e.g. Telegram / Twitter), attempting to trigger modal wallet popups after `async/await` microtask delays causes mobile browsers (iOS Safari / Android Chrome) to block popups, falling back to legacy/broken manual deep links like `link.trustwallet.com/wc` resulting in `DNS_PROBE_FINISHED_NXDOMAIN`.
2. In-app webviews lack native Web3 provider support and popup window handling.

### 4. Code Fix
- Refactored `connectWallet()` in `PsemineWalletContext.tsx` to execute synchronously on user click events without `await` gaps before calling `open()`.
- Added robust WebView / In-App browser detection (`isInAppWebView()`). When an in-app browser is detected, the context displays a modal warning with instructions: *"Your wallet cannot open in this app. Please tap 'Open in Safari/Chrome' or copy link."*
- Ensured TrustConnect SDK initializes `createWalletConnect({ projectId })` so all WalletConnect-compatible wallets (MetaMask, Coinbase Wallet, Trust Wallet, Rainbow) are presented in the unified modal.

---

## ERROR #3: SERVICE_UNAVAILABLE WHEN CLICKING "LOCK LIVE BNB QUOTE"

### 1. Where it happens
When users click "Lock Live BNB Quote" in `BNBPaymentCheckout.tsx` (`POST /api/psemine/orders/create`).

### 2. Trace & HTTP Analysis
- API Endpoint: `POST /api/psemine/orders/create`
- Function: `fetch_psemine_bnb_gbp_quote()`

### 3. Root Cause
The quote function previously relied heavily on a single external price feed (CoinGecko). When CoinGecko rate-limited or timed out, the endpoint threw uncaught exceptions or returned a 503 `SERVICE_UNAVAILABLE` response without fallback.

### 4. Code Fix
- Implemented a resilient multi-tier fallback chain in `fetch_psemine_bnb_gbp_quote()`:
  1. **CoinGecko** (`/api/v3/simple/price`)
  2. **CoinPaprika** (`/v1/tickers/bnb-binance-coin`)
  3. **Binance API** (`/api/v3/ticker/price?symbol=BNBGBP`)
  4. **CryptoCompare** (`/data/price?fsym=BNB&tsyms=GBP`)
  5. **In-Memory Price Cache** (60-second TTL)
  6. **Hardcoded Fallback Rate** (£500.0 GBP / BNB)
- Included the price source string (e.g. `coingecko`, `coinpaprika`, `binance`, `fallback_static`, `coingecko_cached`) in the order response.
- Updated `BNBPaymentCheckout.tsx` to display quote source transparency to the user (`Price Source: COINGECKO` / `FALLBACK`).

---

## VERIFICATION & PROOF OF FIXES

- **CORS & Flask Boot:** Verified Flask app imports `CORS` at top-level and handles all options preflight requests cleanly.
- **Wallet Connection:** Verified synchronous modal open and in-app WebView detection in `PsemineWalletContext.tsx`.
- **Quote Engine:** Verified multi-tier fallback chain and 60s memory caching in `api/index.py`.
- **Frontend Source Transparency:** Verified UI renders `Price Source: [SOURCE]` in checkout modal.

---

**Report Prepared By:** Jules, Senior Software Engineer
