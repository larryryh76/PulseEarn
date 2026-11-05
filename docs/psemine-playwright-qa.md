# PSEmine authenticated Playwright QA

This workflow replaces the unreliable saved-browser-profile inspection path with a
fresh Playwright Chromium session created inside GitHub Actions.

## One-time repository setup

Create a **dedicated PSEmine QA account**. It must be email-verified and already
have PSEmine console entitlement. Do not use an account holding funds or a wallet
used for real payments.

In GitHub, open **Settings → Secrets and variables → Actions** and add:

- `PSE_TEST_EMAIL`: the QA account email
- `PSE_TEST_PASSWORD`: the QA account password

These values are injected into the runner as environment variables. They are not
committed, printed, added to screenshots, or written to the report.

## Run it

Open **Actions → PSEmine authenticated Playwright QA → Run workflow**.

The workflow builds the PR branch locally, serves that exact frontend build to Playwright,
and proxies only `/api/*` requests to `https://www.pulseearn.online`. This tests the
proposed frontend against the real authenticated backend without relying on the
currently deployed production UI. Firebase authentication remains real. It then
checks these authenticated routes:

- `/mine/dashboard`
- `/mine/tools`
- `/mine/wallet`
- `/mine/referrals`
- `/mine/activity`
- `/mine/me`
- `/mine/guide`
- signed-in `/mine` entry

Each route is captured at 390, 375, and 430 px mobile widths, plus 768, 1024,
and 1440 px tablet/desktop widths. The existing harness records route redirects,
loading-state settlement, horizontal overflow, undersized tap targets, browser
console/page errors, and forbidden cross-product requests. Screenshots and the
JSON report are uploaded as a downloadable workflow artifact.

A weekly run is also scheduled for Monday at 04:30 UTC.

## Safety boundaries

The authenticated harness reads pages only. It does not purchase tools, connect
a wallet, sign a message, approve a transaction, send BNB, withdraw, or enroll
an account. It logs out of the QA account at the end. The workflow deliberately
does not enable the optional `PSE_ENROLL` behavior.

If sign-in fails or the account is not entitled to PSEmine, the run must be
treated as failed/inconclusive—not as a successful visual inspection.
