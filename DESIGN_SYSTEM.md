> **Scope:** the PSEmine public and authentication surfaces (`/mine`,
> `/mine/login`, `/mine/signup`, `/mine/forgot-password`, `/mine/verify-email`),
> the product loader and the brand mark. Not an authority over PulseEarn, and not
> a restatement of the synced skill library — `.agents/` remains the source
> material. Only decisions specific to PSEmine are recorded here.

# PSEmine Design System

## 1. Direction

**A financial instrument, presented on graphite.** PSEmine sells a bounded,
dated earning instrument, so it is presented the way a serious financial product
presents one: one axis, money as the loudest element in its own block, one
functional accent, and rhythm from luminance steps rather than from rules.

The unit of design is **the instrument**, not the card. A capacity gauge, a
lifecycle rail, an ordered pipeline, an application specimen and a grid of
figures say what a paragraph has to spell out. A page assembled from headings,
paragraphs and separators reads as a document however well it is typeset; a page
assembled from instruments reads as a product.

### Plane: the product is always dark

The application defaults to dark (`index.html` adds `dark` to `<html>`), and the
token set is declared for both themes — so a public surface that simply inherits
the app theme silently becomes whatever the operator's theme preference is.

The product therefore owns a **plane**. `.pse-plane` in `src/styles/psemine.css`
declares the product's own dark tokens and applies them unconditionally:

| Surface | Class | Palette |
| --- | --- | --- |
| `/mine`, auth family, loader | `.pse.pse-surface.pse-plane` | deep graphite, `color-scheme: dark` |
| authenticated console, inline loader/failure primitives | `.pse` alone | follows the application theme |

A marketing or sign-in surface belongs to the product, not to the operator's
theme preference. The console belongs to the operator, so it stays on the app
theme. `color-scheme: dark` on the plane makes the browser's own controls
(caret, autofill, scrollbars) match it.

### Why the earlier directions failed

| Attempt | What it got wrong |
| --- | --- |
| 1 | An ink-and-hairline ledger in a teal unrelated to the product's own mark, wearing a placeholder logo. Restraint, no identity. |
| 2 | Recovered the identity, then put campaign statistics, tool prices, capacity ceilings and referral terms **on the sign-in page**, and wrapped nearly every block in a bordered panel. Identity, no page ownership. |
| 3 | Inherited the application's dark default and answered it with full-width prose, rules between every section and term/value rows — a landing page that read as the manual for a console. Direction, no composition. |
| 4 | Swinging the whole product to paper to escape the dark default. Readable, but a light document with dark-mode code in it is not a fintech product. |

## 2. Two stylesheets

| File | Owns |
| --- | --- |
| `src/styles/psemine.css` | The product's visual language — tokens, plane, type roles, surfaces, instruments, landing, masthead, loader, auth shell. Loaded by `src/main.tsx`. |
| `src/styles/psemine-auth.css` | The authentication family's additions only: brand lockup at the task, the form-as-instrument surface, the password-quality meter. Loaded **after** `psemine.css`, so its four overrides sit later in the cascade by construction rather than by `!important`. |

Everything is scoped to `.pse`, so neither file can restyle PulseEarn.

## 3. Page content contracts

**The hardest rule in this document.** A route may contain only what belongs to
it, and that is verified against the rendered DOM, not by eye.

### `/mine` — PUBLIC LANDING ONLY

- **Allowed** brand, proposition, the purchase sequence, the tool family,
  capacity, the campaign lifecycle, payment, settlement and payout, security and
  transparency, FAQ, calls to action.
- **Banned** every personal or live figure — balance, accrued earnings, capacity
  held, referral count, campaign position or days remaining, purchase status,
  quote, wallet or payout address, transaction hash, payout record, activity
  history — plus any account setting, console or admin control, internal
  architecture, entitlement/access explanation, or fabricated activity or metric.
- **The landing reads nothing.** No session, no request, no campaign record: it
  renders the locked economics from `src/types/psemine.ts` and nothing else, and
  `PSEMineEntry` sends a signed-in visitor to the console before the page mounts.
  There is therefore no code path by which account state could reach it.
- Every specimen is **labelled as a specimen**. Nothing on the page is a readout.

### `/mine/login` — AUTHENTICATION ONLY

- **Allowed** identity, welcome copy, email, password, password visibility,
  primary action, forgot-password, sign-up navigation, verification messaging,
  loading/error/success state, one concise security reassurance.
- **Banned** wallet dashboard, mining capacity, tool marketplace, campaign
  statistics, referrals, earnings, platform metrics, architecture explanations,
  access/entitlement explanations.

### `/mine/signup`, `/mine/forgot-password`, `/mine/verify-email`

Account creation; recovery; verification. Nothing else — no product marketing, no
campaign terms, no capacity or tool content on any of the three.

**Cross-page leakage is a defect.** If an element does not belong to the route it
is on, it is removed — never relocated, duplicated or replaced, and never hidden
with `display: none` or opacity.

## 4. Brand

The mark is **recovered, not invented**: the faceted PSE emblem live across the
shell, console, public page and authentication family immediately before the first
design purge (`38d7a5f:src/components/psemine/PSEBrand.tsx`, re-exported by
`pse.tsx`). Geometry unchanged — five facets on one diagonal: a blue blade, a
light upper facet notched by an inner cut, a steel side facet, a cyan crest.

- **One mark, no competing identities.** Masthead, auth bar, auth brand lockup,
  hero-free landing, console, loader, footer, favicon — the same drawing at
  different sizes.
- **Flat fills only**, all from `--pse-brand-*` tokens, so the emblem survives
  16px, print and engraving. No gradient, glow or shadow on the mark.
- `tone="mono"` renders the whole emblem in one colour with the facets separated
  by opacity, for print, engraving and disabled states.
- `decorative` emits `aria-hidden`; a labelled mark emits `role="img"` +
  `aria-label`. Never an empty `role="img"`.
- The favicon (`public/psemine-mark.svg`) is the same facets on a solid ink plate.
- The mark's **cyan is brand-only** — never an interface colour.

## 5. Typography

| Role | Family | Used for |
| --- | --- | --- |
| Language | **Inter** | headings, prose, buttons, field labels, units |
| Data | **JetBrains Mono**, `tnum` | every rate, price, figure, campaign length, clause index, status label |

Both are already loaded by `index.html`; this adds no font request.

- **Authority comes from size and tracking, not weight.** Display `500` at
  `-0.035em`; h2 `500` at `-0.026em`. Nothing in the public surface is set
  heavier than 500 except a kicker index.
- Scale: display `clamp(2.25rem, 1.5rem + 3vw, 3.75rem)` · h2
  `clamp(1.5rem, 1.3rem + .85vw, 2.0625rem)` · h3 `1rem` · lead
  `clamp(1.0625rem, 1rem + .25vw, 1.1875rem)` · body `1rem` · small `.875rem` ·
  micro `.6875rem` (mono, `0.1em`, uppercase).
- **Money is its own role** (`pse-metric`): mono, tabular, `500`, `-0.035em`,
  clamped `1.5–1.9375rem`, with the unit beside it as a quieter `.8125rem` in
  `--pse-ink-3`. A figure is the loudest thing in its own block and never repeats
  its currency word.
- Every figure carries `font-variant-numeric: tabular-nums` **and** `tnum`.
- Headings use `text-wrap: balance`; prose uses `pretty`.
- Field labels are **plain** (Inter, 13px/500): a label is language, not data.

## 6. Colour

| Token | Job | Plane (dark) | Console (app theme) |
| --- | --- | --- | --- |
| `--pse-canvas` | page | `#08090b` | `#ffffff` |
| `--pse-surface` / `-2` / `-3` | raised steps | `#0f1115` / `#14171d` / `#191d24` | `#ffffff` / `#f7f8fa` / `#eef0f3` |
| `--pse-band` | band tone | `#0c0e12` | `#f7f8fa` |
| `--pse-inset` | inner fill | `rgba(255,255,255,.045)` | `rgba(16,19,24,.04)` |
| `--pse-ink` / `-2` / `-3` | primary, secondary, label | `#f2f4f8` / `#a3abba` / `#838c99` | `#0e1116` / `#545d69` / `#5b6472` |
| `--pse-rule` / `-2` / `-strong` | structure | `rgba(255,255,255,.11/.06/.2)` | `rgba(16,19,24,.13/.075/.26)` |
| `--pse-accent` / `-solid` | **interaction and state** | `#6f9bff` / `#2f5cf5` | `#1c47c9` |
| `--pse-cyan` | referral capacity, payout node | `#2fc9e6` | `#0d7c94` |
| `--pse-violet` | Advanced tier gradient only | `#8b6cff` | `#5b46d9` |
| `--pse-good` / `-warn` / `-danger` | reported outcomes | `#34d399` / `#f0b24a` / `#f87171` | semantic greens/ambers/reds |
| `--pse-bnb` | **payment context only** | `#f0b90b` | `#8a6a00` |

- **Accent is never decoration.** It marks a kicker index, a focus ring, a real
  proportion, the primary button, a live state, and the one hairline at the top
  of an auth instrument.
- **Restraint over saturation.** Cyan is functional in exactly two places
  (referral capacity, the payout node); violet exists only inside the Advanced
  tier's capacity gradient; BNB yellow appears only where the payment asset is
  named. No colour is used because a section wanted one.
- **Label ink clears AA on every surface it is used on**, because it is used at
  11–13px.
- Buttons, tags and chips carry a dot, a word or a glyph as well as a tone —
  **colour is never the sole carrier of meaning.**

## 7. Space, radius, elevation

- Shell `1180px`; gutters 20 / 32 / 40px at 0 / 768 / 1120px.
- **Section rhythm:** `padding-block: clamp(64px, 8vw, 116px)`.
- **Sections are separated by space and a luminance band — never by a rule
  between every pair.** A rule between each section is what turns a page into a
  stack of boxes; a 2% luminance step is enough to read a new chapter.
- Radii: `6px` tags/keys · `10px` small controls · `14px` panels, inputs, tools ·
  `20px` the auth instrument. Never a pill, except the kicker chip.
- **Elevation is light, not shadow.** A panel is a translucent step up with a
  shadow-as-border ring (`--pse-ring`) and an inner top highlight (`--pse-lift`),
  locked to two levels. A glow is never used to fake depth.
- One atmosphere behind the whole page: a single very wide, very low wash
  (`--pse-glow`), not a stack of decorative gradients.

## 8. Components

| Component | Rule |
| --- | --- |
| Panel (`pse-panel`) | The one raised surface. `--raised` adds the ring and lift. Head/body/foot strips carry hairlines. |
| Section head (`pse-head`) | Kicker chip (index + name) → h2 → optional lede, 48ch / 64ch wide. |
| Stat (`pse-stat`) | Label, tabular figure, optional unit and note. `StatGrid` is 1 → 3/4 columns at 720px. **Not every number is a hero statistic.** |
| Capacity gauge (`pse-gauge`) | One shared denominator. A stacked two-segment bar states the composition; three rows below are proportional to the same ceiling. Real fractions only. |
| Campaign rail (`pse-rail`) | Phases with nodes and drawn connectors. **No "you are here"** — a public page cannot know a campaign's position. Vertical on mobile, horizontal from 768px. |
| Pipeline (`pse-flow`) | Ordered steps with glyphs, indices, connectors and an optional denomination marker. 1 → 2 → 4 columns. Hover lifts the step and accents its glyph. |
| Specimen (`pse-spec`) | A window of the application: a title bar, instrument fields, and a footer that labels it a specimen. |
| Tool module (`PseTierModule`) | One drawing, tier-many filled bays; Elite adds the continuous crest. Four members of one family, never four identical cards. |
| Tool family (`pse-tools`) | 1 column (horizontal scroll) on mobile → 2 at 480px → 4 at 1024px. Each member: name + `Tier n`, a Session/Continuous chip, the module, the rate with a proportional bar, price and ownership limit, and an operating note. |
| Trust grid (`pse-trust`) | 1 → 2 → 4 columns of glyph, name and claim. |
| Input (`pse-input`) | 48px, `14px` radius, accent border plus a 3px accent-quiet ring on focus. Invalid fields get the danger edge. |
| Password control | Toggle inside the field so the field never grows; 44px target. |
| Meter (`pse-meter`) | 3px rail, four bands, driven by the real input, coloured from the semantic set. Reports a band, never a score or a percentage; `aria-hidden` because the sentence beside it says the same thing. |
| Field error | Printed under **its own** field, `role="alert"`, referenced by `aria-describedby`; focus moves to the first invalid field. |
| Chip / tag (`pse-chip`, `pse-tag`) | Mono, uppercase, small radius, dot. The **word** carries the meaning. |
| Button (`pse-btn`) | 48px (`--lg`) or 44px (`--sm`). Solid accent for the primary action, ringed inset for secondary. The arrow glyph shifts 3px on hover — the only decorative movement allowed. |
| FAQ (`pse-faq`) | Ruled rows, drawn plus/minus, `aria-expanded` + `aria-controls`. |
| Masthead (`pse-mast`) | Sticky, translucent graphite. Section anchors are a **desktop-only** affordance (≥960px); below that the bar is brand + one menu control, and navigation lives in a drawer with Sign in / Create account. Five anchors at 390px is either three wrapped rows or a sliver. |

## 9. Landing composition

```
masthead ─ brand · anchors · Sign in · Create account · ☰
hero ───── proposition + primary/secondary CTA + meta
           ▸ HeroSpecimen (campaign length · capacity ceiling ·
             capacity gauge · the four tiers)
01  the purchase ── four-step pipeline
02  the tool family ── four modules with real locked economics
03  capacity ── the gauge + how a referral qualifies
04  campaign ── the lifecycle rail + three figures
05  payment ── the purchase specimen + what a quote gives you
06  settlement ── accrual → settle → review → payout
07  security ── four trust claims + what is locked
08  questions ── FAQ
09  the close ── one CTA pair, then the footer
```

**The hero is asymmetric by intent:** the argument on the left, the product's own
capacity model on the right. The first viewport carries the brand, the
proposition, the primary CTA and a real object — never a wall of navigation.

## 10. Authentication composition

**One column, one axis. No split screen, no artwork, no marketing panel.**

```
[ PSEmine ]                                    About PSEmine
───────────────────────────────────────────────────────────
                    (vertically centred)
                     ▣ PSEmine
                     Sign in
              Enter your email and password to continue.
              [ Email ]
              [ Password                         👁 ]
              [                Sign in              ]
                     Forgot your password?
                     ─────────  or  ─────────
              [         Continue with Google        ]
                 New to PSEmine? Create an account
───────────────────────────────────────────────────────────
  🔒 PSEmine never asks for your private key or seed phrase.
```

- **Mobile:** full-bleed column, max `392px`. **Tablet and up:** the same column
  becomes an instrument — `452px`, `20px` radius, raised surface, ring + lift, and
  one accent hairline across the top edge. That hairline is the only colour on the
  screen until a control is used.
- Fields 48px, primary action 48px full-width.
- **Action order is deliberate:** the primary action, then whatever qualifies it
  (the reset link, or on sign-up the terms line), then the provider divider, then
  the alternate provider. An exception somebody has to read belongs above the
  divider, not after an unrelated button.
- At 390×844 the bar, brand lockup, heading, welcome line, both fields and the
  primary action are above the fold.

## 11. Loader

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
| stalled (25s) | states that the wait is longer than it should be, and offers a real retry (only when the caller has one) plus a reload |
| failure | `PseLoadFailure`: the real title and message, retry only when `error.retryable` |
| verification required | **not a loader** — the route guard navigates |
| onboarding required | **not a loader** — the route guard navigates |
| nothing to wait for | **no loader at all** |

The rail is indeterminate in the literal sense: it shows that work is happening
and never a position in a sequence. No percentage, no filling bar, no scan, no
terminal, no counter, no step list, no boot sequence, no invented diagnostics. The
identity and the status are centred, the rail is capped at 168px (55vw on small
screens), and it reads correctly at 390×844 and 1440×900.

## 12. Motion

Six moving things, each one explaining hierarchy or state:

| Motion | Why |
| --- | --- |
| `Reveal` — one-shot viewport entrance (`opacity` + 18px rise) | a section arrives once, so the eye reads it as new |
| Gauge fill, 820ms | a measurement reads as a measurement only once it has settled |
| Rail connector draw | a rail reads as a sequence once it is drawn |
| Tool capacity bar fill | proportional to the tier, animates once |
| 140–220ms control transitions (border, colour, background, lift) | affordance |
| Loader's 1.6s indeterminate rail | work is happening |

Elements are **visible by default** and only hidden once an `IntersectionObserver`
is present to bring them back, so a failed observer can never leave the page
blank. No scroll-jacking, no parallax, no counting numbers, no looping decoration,
no fake mining or blockchain activity.

`prefers-reduced-motion: reduce` stops all of it — reveals resolve immediately,
bars sit at their true values, and the loader rail becomes one static centred
segment, never a filled bar.

## 13. Responsive

| Viewport | Composition |
| --- | --- |
| 390×844 | brand + one menu control; drawer navigation; hero stacked; one tool per column; vertical rail; stacked figures; full-bleed auth column |
| 430×932 | as above with more breathing room |
| 768×1024 | masthead still compact; hero two columns; rail horizontal; 2-up tools and trust; the auth column becomes a surface |
| 1440×900 | 1180px shell; 4-up tools and trust; 4-step pipeline with no gaps |

No horizontal overflow at any of the four. Touch targets ≥44px.

## 14. Prohibited

Generic dark SaaS · crypto casinò styling · cyberpunk or terminal aesthetics ·
glassmorphism · gradient stacks · neon glow · a shadow per element · decorative
grids · fake charts · fake metrics · **a percentage or progress bar for an unknown
duration** · billboard display type · pill buttons · emoji as icons · a bordered
box around every block · centred everything · colour as the sole carrier of
meaning · animation without meaning · invented logos · architecture copy in the
UI · **a personal or live figure on a public route** · **a payment or payout
address printed publicly** · **any content on a route where it does not belong**.

## 15. Known divergences (recorded, not fixed here)

- `src/types/psemine.ts` mirrors `QUOTE_EXPIRATION_MINUTES: 10` while the backend
  holds `QUOTE_TTL_MINUTES = 15`. The UI deliberately never prints a quote
  lifetime, so this cannot surface to a user. Pre-existing.
- `.agents/skills/ui-ux-pro-max/` references `references/quick-reference.md` and
  `references/pro-rules.md`, which the sync does not pull; only `SKILL.md` and
  `src/` are present. The skill's searchable data (`src/data/*.csv`,
  `src/scripts/search.py`) is present and was used.
- The open-design MCP server is not registered in this environment; the design
  systems were read directly from `.agents/skills/open-design/design-systems/`.
- The public guide (`/mine/guide`) is a non-target surface: its copy was corrected
  but its presentation was not rebuilt to this system.
- The authenticated console is outside this system entirely; it uses the
  application theme and the `PseBasics` primitives.
- Authenticated QA remains blocked in this environment (no test credentials), so
  the access gate, the signed-in verify-email branch and the console routes are
  not rendered by any harness here.
