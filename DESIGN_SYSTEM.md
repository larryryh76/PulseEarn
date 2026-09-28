> **Scope:** the PSEmine public and authentication surfaces (`/mine`,
> `/mine/login`, `/mine/signup`, `/mine/forgot-password`, `/mine/verify-email`),
> the product loader and the brand mark. Not an authority over PulseEarn, and not
> a restatement of the synced skill library — `.agents/` remains the source
> material. Only decisions specific to PSEmine are recorded here.

# PSEmine Design System

## 1. Direction

**A disciplined financial/wallet product, presented on paper.** PSEmine sells a
bounded, dated earning instrument, so it is presented the way a serious financial
product presents one: one primary axis, money as the loudest element in its own
block, one functional accent, and rhythm from tonal bands.

### The public plane is always light

The application defaults to dark (`index.html` adds `dark` to `<html>`), and the
previous token set was declared for both themes — so every PSEmine public surface
silently inherited near-black and read as a console. That was the whole defect.

The product therefore owns a **plane**. `src/styles/psemine.css` scopes its dark
tokens to `.dark .pse:not(.pse-plane)`:

| Surface | Class | Palette |
| --- | --- | --- |
| `/mine`, auth family, loader | `.pse.pse-plane` | always light, `color-scheme: light` |
| authenticated console, inline loader/failure primitives | `.pse` alone | follows the application theme |

A marketing or sign-in surface belongs to the product, not to the application's
theme default. The operating console belongs to the operator, so it stays on the
app theme. This one selector is the boundary, and deleting it restores the defect.

### Composition before decoration

A public page is built from four devices and nothing else:

1. **Bands** — paper, tint, ink. Rhythm comes from tone changes, not from borders.
2. **One measure** — a 1140px shell; prose never exceeds ~62ch.
3. **Rules** — a single hairline weight, used *inside* dense data, plus a 2px
   accent edge where a section is genuinely a sequence.
4. **Two type roles** — Inter for language, JetBrains Mono (tabular) for data.

**There are exactly two real cards in the whole public surface:** the hero
product specimen and the tool family. Everything else is type, rules and band
tone. This is the single rule that prevents the failure this system was written to
correct.

### Why the three earlier directions failed

| Attempt | What it got wrong |
| --- | --- |
| 1 | An ink-and-hairline ledger in a teal that had no relationship to the product's own mark, wearing a placeholder logo. Restraint, but no identity. |
| 2 | Recovered the identity, then (a) put campaign statistics, tool prices, capacity ceilings and referral terms **on the sign-in page**, and (b) wrapped nearly every block in a bordered panel. Identity without composition. |
| 3 | Inherited the application's dark default, so the public product rendered as a dark documentation surface — a landing that looked like the manual for a console. Direction without a plane. |

## 2. Page content contracts

**The hardest rule in this document.** A route may contain only what belongs to
it, and that is verified against the rendered DOM (`scripts/pse-a11y-check.mjs`,
`scripts/pse-design-audit.mjs`).

### `/mine` — PUBLIC LANDING ONLY
- **Allowed** brand, proposition, explanation, tool family, capacity, campaign
  lifecycle, payment, settlement and payout, security and transparency, FAQ, CTA.
- **Banned** every personal or live figure — balance, accrued earnings, capacity
  held, referral count, campaign position or days remaining, purchase status,
  quote, wallet or payout address, transaction hash, payout record, activity
  history — plus any account setting, console or admin control, internal
  architecture, entitlement/access explanation, or fabricated activity or metric.
- **The landing reads nothing.** It holds no session and makes no request: the
  route guard (`PSEMineEntry`) sends a signed-in visitor to the console before the
  page mounts, so the page can only ever be the static explanation of the product.
  Its only figures come from the locked economics in `src/types/psemine.ts`.
- The hero object is a **product specimen** — a labelled illustration of the
  product's own capacity model, never a readout of anyone's account.

### `/mine/login` — AUTHENTICATION ONLY
- **Allowed** identity, welcome copy, email, password, password visibility, sign
  in, forgot password, sign-up navigation, verification messaging,
  loading/error/success state, one concise security reassurance.
- **Banned** wallet dashboard, mining capacity, tool marketplace, campaign
  statistics, referrals, earnings, platform metrics, architecture explanations,
  access/entitlement explanations.

### `/mine/signup` — ACCOUNT CREATION ONLY
- **Allowed** identity, account fields, password requirements, referral code (the
  real flow), terms and privacy links, create account, sign-in navigation,
  validation, loading/error state.
- **Banned** dashboard information, wallet balance, mining earnings, campaign
  statistics, tool cards, referral statistics, architecture.

### `/mine/forgot-password` and `/mine/verify-email`
Recovery and verification only. No product marketing, no campaign terms, no
capacity or tool content.

**Cross-page leakage is a defect.** If an element does not belong to the route it
is on, it is removed — never relocated, duplicated or replaced, and never hidden
with `display: none` or opacity.

## 3. Brand

The mark is **recovered, not invented**: the faceted PSE emblem that was live
across the shell, console, public page and authentication family immediately
before the first design purge (`38d7a5f:src/components/psemine/PSEBrand.tsx`).
Geometry unchanged — five facets on one diagonal: an electric-blue blade, a light
upper facet notched by an inner cut, a steel side facet, a cyan crest.

Only its implementation changed: `--pse-brand-*` tokens resolved per plane instead
of hard-coded dark hexes; `aria-hidden` instead of an empty `role="img"` label; a
`mono` treatment for single-colour contexts; geometric-precision rendering so the
facet edges stay crisp at 18px. The favicon (`public/psemine-mark.svg`) is the
same facets on a solid ink plate, because a transparent emblem loses its light
facet against light browser chrome.

- **One mark, no competing identities.** Hero, auth bar, console, loader, footer,
  favicon — same drawing at different sizes.
- **Flat fills only.** No gradient, glow or shadow on the mark: it has to survive
  16px, print and engraving.
- **The crest is the only animated facet, and nothing animates it today.** `live`
  marks a running campaign, but no public surface may state a live position, so
  the capability sits unused on the mark with the default off.
- The mark's **cyan is brand-only**. It is never used as an interface colour.

## 4. Typography

| Role | Family | Used for |
| --- | --- | --- |
| Language | **Inter** | headings, prose, buttons, field labels |
| Data | **JetBrains Mono**, `tnum` | every rate, price, term label, clause index, column head, status tag |

Both are already loaded by `index.html`; this adds no font request.

- **Authority comes from size and tracking, not weight.** Display and h2 are
  **weight 400**, never 600+. Display tracking is `-0.032em`; h2 `-0.024em`.
- **Body carries slight positive tracking** (`0.003em`), which reads airier at
  16px and contrasts with the tight display sizes.
- Scale: display `clamp(2.125rem, 1.4rem + 2.85vw, 3.5rem)` · h2
  `clamp(1.5rem, 1.28rem + .9vw, 2rem)` · h3 `.9375rem` · lead
  `clamp(1.0625rem, 1rem + .25vw, 1.1875rem)` · body `1rem` · small `.875rem` ·
  label `.75rem` (mono, `0.09em`, uppercase).
- **Money is its own role** (`pse-metric`): mono, tabular, `500` weight, tracking
  `-0.035em`, clamped to `1.75–2.25rem`, with the unit (`/ hour`) beside it as a
  quieter `.875rem` in `--pse-ink-3`. A figure is the loudest thing in its own
  block and never repeats its currency word.
- Every figure carries `font-variant-numeric: tabular-nums` as well as `tnum`.
- Headings use `text-wrap: balance`; prose uses `pretty`.
- Field labels are **plain** (13px/500 Inter), not mono-uppercase: a label is
  language, not data.

## 5. Colour

| Token | Job | Light plane | Console (dark) |
| --- | --- | --- | --- |
| `--pse-paper` | page | `#ffffff` | `#0b0d11` |
| `--pse-band` / `--pse-band-2` | tint band, deeper tint | `#f7f8fa` / `#eef0f3` | `#12141a` / `#171a21` |
| `--pse-ink-bg` | ink band | `#0d0f13` | `#05070a` |
| `--pse-ink` / `-2` / `-3` | primary, secondary, label ink | `#0e1116` / `#545d69` / `#5b6472` | `#f2f4f7` / `#a7afbb` / `#8a93a1` |
| `--pse-rule` / `-2` / `-strong` | structure | `rgba(16,19,24,.13 / .075 / .26)` | `rgba(255,255,255,.16 / .08 / .3)` |
| `--pse-accent` | **interaction and state only** | `#1c47c9` | `#6b93ff` |
| `--pse-good` / `-warn` / `-danger` | reported outcomes | `#0f6240` / `#7d4b00` / `#a51f19` | `#4cc38a` / `#e0a03a` / `#f2685c` |

- **Accent is never decoration.** It marks the clause index, a focus ring, a real
  proportion, the primary button and a live state.
- **One accent.** No second interface hue; the retired cyan is brand-only, which
  is why the interface reads calmer.
- **Text ink is near-black with a cool cast**, never pure `#000`.
- **Label ink clears WCAG AA (4.5:1) on paper, on the tint band and on the deeper
  tint**, because it is used at 11–13px.
- **The ink band re-maps the token set for its own subtree**, so every descendant
  — headings, prose, rules, tags, buttons — adapts with no override.
- `color-scheme: light` on the plane makes the browser's own controls (caret,
  autofill, scrollbars) match it instead of the OS dark default.

## 6. Space, radius, elevation

- Shell `1140px`; gutters 20 / 32 / 40px at 0 / 768 / 1120px.
- **Section rhythm:** `padding-block: clamp(56px, 7.5vw, 104px)`.
- **Sections are separated by space and band tone — never by a rule between every
  pair.** A rule between each section is what turns a page into a stack of boxes.
- Radii: **12px** controls, cards and the specimen; 6px tags. Never a pill.
- **Whisper-only elevation:** one shadow in the entire public surface, on the hero
  specimen (`0 4px 24px rgba(16,19,24,.05)`). Everything else is flat.
- Borders are 1px, plus a 2px top edge on a stage.

## 7. Components

| Component | Rule |
| --- | --- |
| Band (`pse-band--tint` / `--ink`) | Full-width tone change. The only rhythm device. |
| Section head (`pse-head`) | Kicker (index + name) → h2 → optional lede, capped at 46ch/62ch. |
| Card (`pse-card`) | Two exist. 1px border, 12px radius, head/body/foot strips. |
| Spec row (`pse-row`) | Term left, tabular figure right, hairline between. **Proportional columns, both may wrap** — an `auto` figure column clips the term at 390px. |
| Metric (`pse-metric`) | One money figure per block, with its unit beside it. |
| Proportion bar (`pse-bar`) | 4–6px. Only ever a real fraction of a real maximum. `--split` composes two real segments, and a `pse-legend` beside it labels both, so colour is never the only carrier of meaning. |
| Tool family (`pse-tools`) | One ruled table, four members. Shared grammar: the same unit drawing with tier-many filled bays (`PseTierMark`), plus the Elite's continuous crest. Not four cards. |
| Input (`pse-input`) | 48px, 12px radius, accent border plus a 3px accent-quiet ring on focus. |
| Password control | Toggle inside the field so the field never grows; 44px target. |
| Field error | Printed under **its own** field, `role="alert"`, referenced by `aria-describedby`; focus moves to the first invalid field. |
| Tag (`pse-tag`) | Mono, uppercase, 6px radius, dot. The **word** carries the meaning. |
| FAQ (`pse-faq`) | Ruled rows, drawn plus/minus, `aria-expanded` + `aria-controls`. |
| Masthead (`pse-mast`) | Sticky, translucent paper. Section anchors are a **desktop-only** affordance (`≥900px`); on small screens the bar carries the brand and the two real actions, because five anchors at 390px is either three wrapped rows or a sliver. |

## 8. Authentication composition

**One column, one axis. No split screen, no card, no artwork.** A panel wide enough
to be worth its space would have to carry product terms to fill it, and a sign-in
page must contain only authentication; a border around the form would add a box to
a page whose hierarchy already comes from type and field rhythm.

```
[ PSEmine ]                                    About PSEmine
───────────────────────────────────────────────────────────
                  (vertically centred)
                     Sign in
              Enter your email and password to continue.
              [ Email ]
              [ Password                        👁 ]
              [               Sign in               ]
                    Forgot your password?
                    ─────────  or  ─────────
              [          Continue with Google        ]
                 New to PSEmine? Create an account
───────────────────────────────────────────────────────────
  🔒 PSEmine never asks for your private key or seed phrase.
```

Form column `392px`, fields 48px, primary action 48px full-width.

**Action order is deliberate:** the primary action, then whatever qualifies it
(the reset link, or on sign-up the terms line), then the provider divider, then
the alternate provider. An exception somebody has to read belongs above the
divider, not after an unrelated button. At 390×844 the bar, heading, welcome line,
both fields and the primary action are above the fold.

## 9. Loader

**An application state, not a page.** Identity, one indeterminate rail, one honest
sentence.

| State | Presentation |
| --- | --- |
| `session` | "Preparing your account" |
| `identity` | "Confirming your identity" |
| `access` | "Checking your access" |
| `campaign` | "Loading campaign state" (inline, in a panel that is re-reading) |
| `data` | "Loading your account" |
| slow (8s) | "Still working. A slow connection is usually the reason." |
| stalled (25s) | states the wait is longer than it should be, and offers a real retry (only if the caller has one) plus a reload |
| failure | `PseLoadFailure`: the real title and message, retry only when `error.retryable` |
| verification required | **not a loader** — the route guard navigates |
| onboarding required | **not a loader** — the route guard navigates |
| nothing to wait for | **no loader at all** |

The rail is indeterminate in the literal sense: it shows that work is happening
and never a position in a sequence. No percentage, no filling bar, no scan, no
terminal, no counter, no step list, no boot sequence, no invented diagnostics. It
must read correctly at 390×844 and 1440×900 — the identity and the status are
centred, the rail is capped at 168px (55vw on small screens), and nothing overflows.

## 10. Motion

Three moving things only: a 140ms colour/border transition on controls, the
loader's 1.6s indeterminate rail, and the crest's live pulse (currently unset).
No scroll reveal, no parallax, no counting numbers. `prefers-reduced-motion:
reduce` stops all of it — the rail becomes one static centred segment, never a
filled bar.

## 11. Prohibited

Generic dark SaaS · generic crypto dashboard · cyberpunk or terminal aesthetics ·
glassmorphism · gradients · glow · drop shadows beyond the one specimen shadow ·
decorative grids · fake charts · fake metrics · a percentage or progress bar for
an unknown duration · billboard-scale display type · pill buttons · emoji as icons ·
a bordered box around every block · centred everything · colour as the sole carrier
of meaning · animation without meaning · invented logos · architecture copy in the
UI · **a personal or live figure on a public route** · **a payment or payout
address printed publicly** · **any content on a route where it does not belong**.

## 12. Known divergences (recorded, not fixed here)

- `src/types/psemine.ts` mirrors `QUOTE_EXPIRATION_MINUTES: 10` while the backend
  holds `QUOTE_TTL_MINUTES = 15`. The UI deliberately never prints a quote
  lifetime, so this cannot surface to a user. Pre-existing.
- `.agents/skills/ui-ux-pro-max/` references `references/quick-reference.md` and
  `references/pro-rules.md`, which the sync does not pull; only `SKILL.md` and
  `src/` are present. The skill's searchable data (`src/data/*.csv`,
  `src/scripts/search.py`) is present and was used.
- The public guide (`/mine/guide`) is a non-target surface: its copy was corrected
  but its presentation was not rebuilt to this system.
- The authenticated console is outside this system entirely; it uses the
  application theme and the `PseBasics` primitives.
- Authenticated QA remains blocked in this environment (no test credentials), so
  the access gate, the signed-in verify-email branch and the console routes are
  not rendered by any harness here.
