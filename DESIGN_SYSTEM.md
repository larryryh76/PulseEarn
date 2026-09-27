# PSEmine design system

**Scope: PSEmine only.** This file records the decisions taken for the PSEmine
product. It is not a general design guide, it does not restate the repository
design skills (`. agents/skills/open-design`, `. agents/skills/ui-ux-pro-max`),
and it is not a second authority — where this file and a repository skill
disagree, the skill wins and this file is wrong.

**Status.** Phase 1 of the PSEmine interface rebuild (brand, loader,
authentication family, public landing page). The authenticated console is still
the minimal functional presentation in `src/components/psemine/PseBasics.tsx`
and gets its own phase; nothing here prescribes the console's layout yet.

Implementation: `src/styles/psemine.css` (the whole visual layer), tokens scoped
to `.pse`. `src/index.css` remains the application theme and is never overridden
from here.

---

## 1. Direction — "Capacity Ledger"

PSEmine sells measured capacity (GBP/hour) inside a dated campaign, settles in
GBP, and pays out in BNB. The interface therefore behaves like a financial
instrument: ink-dominant neutrals, hairline rules instead of card stacks, every
figure in mono with tabular numerals, and **one** accent that marks capacity and
live state.

Premium comes from hierarchy, spacing, restraint and product specificity — not
from decoration.

## 2. Brand

| Element | Rule |
|---|---|
| Mark | "Ore plate": a rounded plate with a 45° chamfered top-right corner holding three ascending capacity bars, each cut on the same 45° shear as the corner. One angle, used four times. |
| Why | Reads as a measured quantity rising inside a bounded vessel — capacity, controlled growth. Legible at 16px because it is three shapes and one outline. |
| Colours | Plate = `currentColor`; bars = `var(--pse-accent)`. `tone="mono"` renders everything in `currentColor`. |
| Wordmark | `PSEmine`, tight negative tracking; optional sub-line `Campaign mining` in mono small caps. Never a number (the campaign length is data, not brand). |
| Favicon | `public/psemine-mark.svg` — solid plate + accent bars, because a hairline outline disappears at 16px. Swapped in on PSEmine routes by `usePseDocumentTitle` and restored on unmount. |
| Prohibited | Pickaxes, coins, banknotes, lightning bolts, arrows, AI sparkles, shields, gradients, glow, shadows, and any promise of return. |

Components: `PSEmineMark`, `PSEmineLogo`, `PSE_MARK_BARS` in
`src/components/psemine/PSEBrand.tsx`.

## 3. Colour

Every value lives in `.pse` (light) and `.dark .pse` (dark) in
`src/styles/psemine.css`. Components use the custom properties — **no raw hex in
JSX**.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--pse-paper` | `#f2f3f4` | `#0a0c0f` | page surface |
| `--pse-panel` | `#fbfbfc` | `#12161a` | panels, inputs, cells |
| `--pse-panel-alt` | `#e9ebee` | `#171c21` | the auth briefing column |
| `--pse-sunken` | `#e4e7ea` | `#0e1215` | inline wells |
| `--pse-ink` | `#0b0e12` | `#f1f3f4` | primary text, ink buttons |
| `--pse-ink-soft` | `#333c45` | `#c9d0d6` | body copy |
| `--pse-mute` | `#5b646e` | `#97a1ab` | secondary copy, labels |
| `--pse-faint` | `#666f79` | `#78828c` | micro labels and placeholders only, never body copy |
| `--pse-rule` / `--pse-rule-strong` | ink at 13% / 26% | white at 14% / 28% | hairlines, dividers, control borders |
| `--pse-accent` | `#0b6e7f` | `#38c2d2` | capacity, live state, primary action |
| `--pse-accent-bright` | `#0a5d6c` | `#5ad3e0` | hover/emphasis tone (further from the surface in both themes) |
| `--pse-accent-wash` / `--pse-accent-edge` | accent at 9% / 32% | accent at 13% / 36% | tinted current-state surfaces |
| `--pse-bnb` | `#9a7300` | `#e8c14a` | the BNB asset marker only |

Rules:

- **Accent discipline.** The accent means capacity, live state, or the primary
  action. It is not a decoration and never fills a large surface. Its wash is for
  the current step of a sequence, not for emphasis.
- **Semantic status colours are the app's** (`success`/`danger`/`warning` in
  `src/index.css`). PSEmine does not redefine them; where a state has an honest
  word ("Unavailable", "Current"), the word carries it.
- **`--pse-bnb` is a marker, never a surface**: a 7px dot inside a text label.
- **Contrast floor: 4.5:1** for all text, enforced by
  `scripts/pse-a11y-check.mjs` in both themes. `--pse-faint` is the lightest tone
  allowed as text, and only for micro labels/placeholders.

## 4. Typography

- Families: `Inter` (text) and `JetBrains Mono` (figures), both already loaded by
  `index.html`. No new webfonts.
- Roles: `.pse-display` (hero), `.pse-h2` (section), `.pse-h3` (card/step),
  `.pse-lead`, `.pse-body` (16px — the body floor), `.pse-small` (14px copy),
  `.pse-micro` (11px uppercase tracked label).
- **Numbers are mono and tabular** (`.pse-figure`, `.pse-figure-lg`): every rate,
  price, cap, day count and address. Tabular numerals so a column of figures
  aligns.
- Display and section headings use `text-wrap: balance`; body copy uses
  `text-wrap: pretty`.
- Nothing below 12px. Upper-case tracking is for labels, never for sentences.

## 5. Spacing and layout

- 4px base; `--pse-gutter` 18 → 32 → 40px, `--pse-measure` 1180px content width.
- Rhythm: page sections use `.pse-section` (44 → 80 → 104px, `border-top`
  hairline). Panels use `.pse-panel` + `.pse-panel-head`/`.pse-panel-body`.
- **Rules before boxes.** Prefer a hairline and a label to a bordered card.
  Grids join cells with 1px gaps (`.pse-stage-list`, `.pse-tools`, `.pse-rail`)
  so a group reads as one instrument, not as four unrelated cards.
- Key/value rows (`.pse-kv`) wrap onto two right-aligned lines rather than
  clipping a label — a single-word key can never shrink further.

## 6. Components

| Component | Class / export | Rule |
|---|---|---|
| Button | `.pse-btn` (+ `-ink`, `-quiet`, `-sm`, `-block`) | ≥44×44px always, including compact chrome. `-ink` for the highest-emphasis action on a light surface. |
| Input | `.pse-input` + `.pse-field-label` (+ `.pse-field-hint`) | Visible label above the control, hint inline with the label, error adjacent to the action that triggers it. |
| Notice | `.pse-notice[data-tone]` | `danger` = blocked, `attention` = degraded, `good` = a real success. Never a status colour without text. |
| Tag | `.pse-tag[data-tone]` | Word first, dot second. `live` = operating, `hold` = paused/unavailable, `idle` = planned/off. |
| Loader | `PseLoader` (`page`/`section`/`inline`) | Indeterminate. States the real stage from a fixed set (`session`, `identity`, `access`, `campaign`, `data`). Says "slow" at 8s and offers Retry/Reload at 25s. Never fabricates progress. |
| Failure | `PseLoadFailure` | Retry offered only when `error.retryable`. |
| Unavailable | `PseUnavailable` | The service did not answer; distinct from a refused action. |
| Instrument | `PseFlowRail`, `PseFlowGlyph` | The six-stage mechanism drawing. Schematic only: no live figure, no progress, no "you are here". |
| FAQ | `.pse-faq` + button/`aria-expanded`/`aria-controls` | Real disclosure, keyboard operable, first item open. |

## 7. Interaction and motion

- Timings: 140ms (`--pse-fast`) for hover/press, 220ms (`--pse-settle`) for
  disclosure. Easing `--pse-ease`.
- Focus is never removed: `.pse :focus-visible` draws a 2px accent outline with
  2px offset.
- `prefers-reduced-motion: reduce` disables all PSEmine animation.
- Motion only ever indicates state (the loader's bar sweep and the mark's bar
  pulse). Nothing moves for decoration.

## 8. Responsive rules

Breakpoints: 640 / 768 / 900 / 1024 / 1100 / 1200px.

- **Mobile is composed, not shrunk.** Single column below 768px; the auth
  briefing column collapses into a compact masthead plus the same facts below the
  form; the mechanism becomes six stacked stations; the lifecycle rail becomes
  one column (2 columns from 640px, 5 from 1100px).
- **No horizontal scrolling, ever.** Long values wrap (`overflow-wrap: anywhere`)
  instead of widening the page; tabular data becomes wrapped key/value rows
  rather than a scrolling table.
- Verified at **390×844, 430×932, 768×1024, 1440×900** by
  `scripts/pse-visual-check.mjs --viewports …` (overflow, paint, page errors,
  cross-product calls, title ownership) and `scripts/pse-a11y-check.mjs`
  (contrast, touch targets, clipping) in both themes.

## 9. Data honesty (PSEmine-specific, non-negotiable)

- Every figure comes from the **locked economics** (`src/types/psemine.ts`,
  mirroring `api/psemine_core.py`) or from a **server response**. Nothing is
  invented, rounded up, or projected.
- No APY, no projected earnings, no user counts, no testimonials, no fake
  countdown, no fake scarcity, no fake diagnostics.
- Campaign status, day, remaining time and the purchase window come from
  `GET /api/mine/campaign/status` (`usePublicCampaign`). If it cannot be read,
  the surface **says so** and offers a retry — it never prints a default status
  as if it were live.
- The console reads the campaign document only for an enrolled, signed-in
  account; public surfaces never read it directly.

## 10. Prohibited patterns

Gradients (especially on text), glow, glassmorphism, neon/crypto-casino
styling, decorative grids or scanlines, giant cards, oversized type, stock
imagery, 3D objects, emoji as icons, animated percentages, invented metrics,
colour-only status, raw hex in JSX, removing focus rings, sub-12px text, tap
targets under 44px, and any layout that can scroll horizontally.

## 11. Known divergences to resolve later

- `src/types/psemine.ts` mirrors `QUOTE_EXPIRATION_MINUTES: 10` while the
  backend's authoritative `QUOTE_TTL_MINUTES = 15`. The rebuild therefore states
  only that a quote is time-limited, and never prints a quote lifetime. The
  mirror should be reconciled with the backend in a later phase.
- PSEmine's activity, notification, wallet, tools, referral and admin screens are
  still the pre-Phase-1 minimal presentation.
