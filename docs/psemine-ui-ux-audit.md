# PSEmine UI/UX Research & Redesign Audit

Repository: larryryh76/PulseEarn
Audit baseline: main at 12e31f00517489a6b7810c61bad8fc93050886ee
Work branch: redesign/psemine-full-product-ui-ux
Scope: PSEmine public product, authentication, authenticated console, product documents, and PSEmine operations shell. Unrelated PulseEarn pages and backend economics are out of scope.

## Evidence and limits
- Inspected src/App.tsx routes, PSEmine shell, landing page, design stylesheets, route components, package scripts, and PSEmine-related source paths.
- The live production domain could not be fetched by the available web inspection route during this pass. Production appearance, authenticated state, and real-device behavior are therefore not visually verified yet.
- PSEmine admin is /admin/mine; /admin/psemine redirects there. /admin and /admin/overview belong to general PulseEarn admin.
- Existing repository scripts cover build, lint, API regression, isolation, visual, authenticated, console, user-journey, design-audit, accessibility, and wallet checks.

## Design principles extracted from the source
1. Graphite foundation, restrained violet and cyan: the console already defines near-black/graphite surfaces, violet primary actions, cyan for confirmed positive states, and red/amber for error/warning. Do not introduce green as a brand color.
2. Hairlines and surface hierarchy over card piles: use grouped data and elevate only decision-making surfaces.
3. Product instrument, not generic admin template: equipment, capacity, campaign lifecycle, purchase/settlement, and payout should feel like purposeful product objects.
4. Truthful financial UI: account figures must come from live backend data; examples must be labelled.
5. Campaign status must distinguish loading/unknown, scheduled, active, closed, and unavailable rather than guessing.
6. One navigation model per viewport: horizontal navigation on wide screens, five-item bottom dock on phones, with safe-area and content clearance.
7. Accessibility baseline: keyboard focus, semantic controls, contrast, readable numeric values, reduced-motion support.

## External references and lessons
- Coinbase Design System: https://cds.coinbase.com/getting-started/introduction — semantic tokens, reusable components, consistent spacing/type, accessibility defaults.
- Coinbase theming: https://cds.coinbase.com/getting-started/theming — centralize colors, spacing, radii and typography with semantic CSS variables.
- Coinbase accessibility/visual updates: https://www.coinbase.com/en-sg/blog/coinbase-for-everyone-making-economic-freedom-accessible — legible financial data and clear labels in dark mode.
- Phantom mobile Explore guidance: https://help.phantom.com/articles/use-the-explore-tab-in-phantom-on-mobile-41523165147667 — scannable categories and predictable next actions.
These are interaction/system references only; PSEmine retains its own identity and workflows.

## Complete route inventory from src/App.tsx
| Route | Surface | Auth/state | Audit focus |
|---|---|---|---|
| /mine | Public campaign landing / entry router | Public; signed-in users may route to console | Hero, campaign terms, CTAs, disclosure, mobile rhythm |
| /mine/login | Sign-in | PSEmine auth provider | Google/email flow, errors, loading, return route |
| /mine/signup | Registration | PSEmine auth provider | Google/email flow, validation, terms and error recovery |
| /mine/forgot-password | Password recovery | Public auth flow | Clear success/error; safe account-enumeration behavior |
| /mine/verify-email | Email verification | PSEmine auth provider | Resend/loading/verified states and safe navigation |
| /mine/dashboard | Dashboard | Protected | Real capacity, tools, campaign state, next actions, empty/loading/error |
| /mine/tools | Equipment | Protected | Specifications, ownership, purchase, maintenance, locked/unavailable states |
| /mine/wallet | Wallet and payouts | Protected | Actual balances, payout request, destination, history, network and errors |
| /mine/referrals | Referrals | Protected | Code/link, qualification truth, capacity, empty/error states |
| /mine/activity | Activity ledger | Protected | Event labels, timestamps, amounts, filters, responsive rows |
| /mine/me | Account/settings | Protected | Profile, security, wallet settings, sessions and support |
| /mine/guide | Guide overlay | Protected | Deep link, close/back behavior, keyboard/mobile sheet |
| /mine/guide/onboarding | Onboarding guide overlay | Protected | Steps, completion and close behavior |
| /mine/terms | Terms | Public document | Reading hierarchy and mobile contents navigation |
| /mine/privacy | Privacy | Public document | Responsive typography and readability |
| /mine/cookies | Cookie policy | Public document | Responsive typography and readability |
| /mine/campaign-terms | Campaign terms | Public document | Decision-point disclosure and links |
| /mine/purchase-terms | Purchase terms | Public document | Purchase conditions and disclosure |
| /mine/payout-policy | Payout policy | Public document | Statuses, limitations, eligibility clarity |
| /mine/referral-terms | Referral terms | Public document | Qualification and reward conditions |
| /mine/risk | Risk disclosure | Public document | Risk prominence; no implied guarantees |
| /mine/support | Support information | Public document | Support route and expectations |
| /admin/mine | PSEmine operations | Admin protected | Campaign, payment verification, tools, purchases, payouts, audit trail |
| /admin/psemine | Legacy alias | Redirect to /admin/mine | Verify redirect; no duplicate admin shell |

PSEmine console routes mount PSEmine-specific providers. Preserve isolation from PulseEarn task/reward providers. General /admin modules are out of scope except /admin/mine and its redirect.

## Current strengths found in source
- Dedicated console stylesheet and separate public landing art-direction layer already exist.
- Shell uses a six-section navigation model with five-item mobile dock and safe-area/content-offset intent.
- Console tokens already use graphite, violet and cyan rather than green.
- Public landing distinguishes example configuration from actual user data.
- Product-specific auth, context, API client and wallet modules exist and should be preserved.
- Purpose-built test scripts exist for major verification categories.

## Main risks/inconsistencies to verify
- Several stylesheets hard-code overlapping colors, spacing and typography; dashboard and admin shell have local variables that can drift.
- Console icon buttons currently include 36px dimensions, below the 44px practical touch-target goal.
- Dashboard has component-local colors and multi-column layouts that need narrow-width and long-number checks.
- Public landing, documents, authentication, console and operations use separate stylesheet layers; isolation is useful but tokens/responsive behavior need consistency.
- CSS comments describe intent, not proof of correct rendering. Real screenshots, browser console/network checks and authenticated journeys are still required.
- Live production and authenticated page rendering remain unverified because the live page fetch failed and no authorized test session was supplied.

## Design-system decisions
- Keep near-black graphite canvas, violet action accent, and sparing cyan for confirmed positive states. No green/greenish primary styling.
- Define semantic canvas/surface/raised/inset, border, text levels, brand, focus, danger and warning tokens; map existing variables to them instead of replacing the identity wholesale.
- Use tabular financial figures, permit wrapping/scaling, and never add invented balances or USD equivalents.
- Aim for at least 44px mobile targets for primary controls and icon buttons where layout permits.
- Fixed navigation must reserve env(safe-area-inset-bottom) and page content clearance.
- Respect prefers-reduced-motion, retain keyboard focus, and target WCAG AA contrast (4.5:1 body text, 3:1 meaningful controls/graphics).
- Avoid adding a component library unless inspection proves it necessary.

## Prioritized implementation and acceptance criteria
### P0 — Foundation and isolation
- Consolidate semantic PSEmine tokens without leaking into PulseEarn.
- Preserve Firebase auth, Google sign-in/sign-up, route guards, PSEmine providers, wallet signing/network guards, API contracts and backend validation.
- Pass: TypeScript build and product-isolation check; no backend/economics changes; auth behavior unchanged.
### P1 — Shell and navigation
- Align shell, gutters, focus states, controls, statuses and dock.
- Pass: no dock obstruction at 320/360/390/430px; primary targets >=44px; no horizontal overflow.
### P2 — Dashboard, tools, wallet, activity, referrals, account
- Improve hierarchy and loading/empty/error/populated/disabled/exceptional states without fake data or unsupported success messages.
- Pass: all six routes checked at 320, 360, 390, 430, 768, 1024 and 1440px; no clipped figures, dead visible controls or misleading status labels.
### P3 — Public landing, auth and documents
- Align typography, CTAs, forms, disclosures, contents navigation and long-form layouts.
- Pass: all public routes render and remain readable on phones; Google and email auth behavior is preserved.
### P4 — PSEmine operations and verification
- Review /admin/mine independently while preserving admin access, payment verification and payout safety.
- Pass: available console/authenticated/journey/accessibility/wallet/design scripts run; deployment SHA and live pages are checked before release claims.

## Verification status at audit start
- Repository and source/route inventory: inspected.
- Live public production rendering: blocked/not verified.
- Authenticated browser walkthrough: not tested; no authorized test session supplied.
- Build/lint/visual/journey tests on redesign branch: not yet run.
- Production deployment for this redesign: not created.