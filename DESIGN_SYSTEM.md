> **Scope:** the PSEmine public and authentication surfaces (`/mine`,
> `/mine/login`, `/mine/signup`, `/mine/forgot-password`, `/mine/verify-email`),
> the product loader and the brand mark. Not an authority over PulseEarn, and not
> a restatement of the synced skill library — `.agents/` remains the source
> material. Only decisions specific to PSEmine are recorded here.

# PSEmine Design System

## 1. Direction

**A financial product, not a document about one.** PSEmine sells a bounded, dated
earning instrument, so it is presented the way a serious financial product
presents one: a dark instrumented plane, money as the loudest element in its own
block, one functional accent, and rhythm from luminance steps rather than rules.

**The unit of design is the composed surface.** A capacity instrument, a
lifecycle rail a reader can step through, an equipment specification, a purchase
console, a settlement statement and a relationship map are objects; a heading
over a paragraph is not. A page assembled from headings, paragraphs and
separators reads as a document however well it is typeset, and a page with *one*
instrument dropped between each pair of paragraphs still reads as a document
with pictures in it. So every section carries a composed object, and the
composition alternates deliberately between full-bleed instruments and
asymmetric splits rather than repeating one shape nine times.

### Plane: the product is always dark

The application defaults to dark (`index.html` adds `dark` to `<html>`), and the
token set is declared for both themes — so a public surface that simply inherits
the app theme silently becomes whatever the operator's theme preference is.

The product therefore owns a **plane**. `.pse-plane` declares the product's own
dark tokens and applies them unconditionally:

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
| 5 | The right plane, the right type, the right restraint — and an article on top of it. Nine sections that each opened with a kicker, a heading, a lede and a paragraph, with an instrument between them. Correct tokens, document composition. |

Attempt 5 is the one this system exists to answer: **tokens are not a product
language.** Composition, drawn objects, interaction and recomposition per
viewport are.

## 2. Three stylesheets

| File | Owns |
| --- | --- |
| `src/styles/psemine.css` | The product's visual language — tokens, plane, type roles, the surface ladder, controls, and the shared instruments (capacity instrument, lifecycle rail, flow rail, equipment family, application window, masthead, loader and auth shell). Loaded by `src/main.tsx`. |
| `src/styles/psemine-product.css` | The landing page's **art-direction layer**: the asymmetric split, the application window's roster/footer/floating tile, the purchase console, the settlement statement, the trust map, the equipment family's tablet recomposition, the hero metadata strip, the closing band, the FAQ re-composition and the branded loader. Loaded after `psemine.css`. |
| `src/styles/psemine-auth.css` | The authentication family's additions only: the two-panel composition, the brand panel and its art, the form's per-band surface behaviour, the password-quality meter. Loaded last, so its re-compositions sit later in the cascade by construction rather than by `!important`. |

Everything is scoped to `.pse`, so none of the three can restyle PulseEarn.
Anything the later files re-compose is re-composed by **cascade order and
specificity**, never by `!important`.

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
- **A campaign rail may not mark "now".** The lifecycle rail is an interactive
  tab set over the phases and what each one changes — true for every reader —
  and never a position, a countdown or a progress claim.

### The authentication family — AUTHENTICATION ONLY

- **Allowed** identity, the product name and its descriptor, welcome copy, email,
  password, password visibility, primary action, forgot-password, sign-up
  navigation, verification messaging, loading/error/success state, one concise
  security reassurance, and the **brand panel** (an aria-hidden decorative
  surface: the mark, the lockup and drawn artwork).
- **Banned** wallet dashboard, mining capacity, tool marketplace, campaign
  statistics or position, referrals, earnings, platform metrics, architecture
  explanations, access/entitlement explanations, and campaign, settlement or
  payout education.

**Cross-page leakage is a defect.** If an element does not belong to the route it
is on, it is removed — never relocated, duplicated or replaced, and never hidden
with `display: none` or opacity.

## 4. Brand

The mark is **recovered, not invented**: the faceted PSE emblem live across the
shell, console, public page and authentication family immediately before the first
design purge (`38d7a5f:src/components/psemine/PSEBrand.tsx`, re-exported by
`pse.tsx`). Geometry unchanged — five facets on one diagonal: a blue blade, a
light upper facet notched by an inner cut, a steel side facet, a cyan crest.

- **One mark, no competing identities.** Masthead, auth bar, auth brand panel,
  auth plate, loader plate, console, footer and favicon — the same drawing at
  different sizes and plate weights, never a second mark.
- **Flat fills only**, all from `--pse-brand-*` tokens, so the emblem survives
  16px, print and engraving. No gradient, glow or shadow on the mark itself; the
  plate around it may carry a ring and one lift, because the plate is a surface.
- `tone="mono"` renders the whole emblem in one colour with the facets separated
  by opacity — used for the auth panel's watermark.
- `decorative` emits `aria-hidden`; a labelled mark emits `role="img"` +
  `aria-label`. Never an empty `role="img"`.
- The favicon (`public/psemine-mark.svg`) is the same facets on a solid ink plate.
- The mark's **cyan is brand-only** — never an interface colour.

## 5. Typography

| Role | Family | Used for |
| --- | --- | --- |
| Language | **Inter** | headings, prose, buttons, field labels, units |
| Data | **JetBrains Mono**, `tnum` | every rate, price, figure, campaign length, clause index, stage label, term value |

Both are already loaded by `index.html`; this adds no font request.

- **Authority comes from size and tracking, not weight.** Display `500` at
  `-0.035em`; h2 `500` at `-0.026em`. Nothing in the public surface is set
  heavier than 500 except a section index.
- Scale: display `clamp(2.25rem, 1.5rem + 3vw, 3.75rem)` · h2
  `clamp(1.5rem, 1.3rem + .85vw, 2.0625rem)` · h3 `1rem` · lead
  `clamp(1.0625rem, 1rem + .25vw, 1.1875rem)` · body `1rem` · small `.875rem` ·
  micro `.6875rem` (mono, `0.11em`, uppercase).
- **Money is its own role** (`pse-metric`): mono, tabular, `500`, `-0.035em`,
  clamped `1.5–1.9375rem`, with the unit beside it as a quieter `.8125rem` in
  `--pse-ink-3`. A figure is the loudest thing in its own block and never repeats
  its currency word. Not every figure is a hero: a roster rate is `.8125rem`, a
  spec rate `1.75rem`, a block metric `1.9375rem`.
- Every figure carries `font-variant-numeric: tabular-nums` **and** `tnum`.
- Headings use `text-wrap: balance`; prose uses `pretty`.
- Field labels are **plain** (Inter, 13px/500): a label is language, not data.

## 6. Colour

| Token | Job | Plane (dark) | Console (app theme) |
| --- | --- | --- | --- |
| `--pse-canvas` | page | `#08090b` | `#ffffff` |
| `--pse-surface` / `-2` / `-3` | raised steps | `#0f1115` / `#14171d` / `#191a1b` | `#ffffff` / `#f7f8fa` / `#eef0f3` |
| `--pse-band` | band tone | `#0c0e12` | `#f7f8fa` |
| `--pse-inset` | inner fill | `rgba(255,255,255,.045)` | `rgba(16,19,24,.04)` |
| `--pse-ink` / `-2` / `-3` | primary, secondary, label | `#f2f4f8` / `#a3abba` / `#838c99` | `#0e1116` / `#545d69` / `#5b6472` |
| `--pse-rule` / `-2` / `-strong` | structure | `rgba(255,255,255,.11/.06/.2)` | `rgba(16,19,24,.13/.075/.26)` |
| `--pse-accent` / `-solid` | **interaction and state** | `#6f9bff` / `#2f5cf5` | `#1c47c9` |
| `--pse-cyan` | referral capacity, the payout row, Elite's crest and rail | `#2fc9e6` | `#0d7c94` |
| `--pse-violet` | Advanced tier only | `#8b6cff` | `#5b46d9` |
| `--pse-good` / `-warn` / `-danger` | reported outcomes | `#34d399` / `#f0b24a` / `#f87171` | semantic greens/ambers/reds |
| `--pse-bnb` | **payment context only** | `#f0b90b` | `#8a6a00` |

- **Accent is never decoration.** It marks a section index, a focus ring, a real
  proportion, the primary button, a selected lifecycle phase, a live state, and
  the one hairline at the top of an auth instrument.
- **Restraint over saturation.** Cyan appears where capacity genuinely comes from
  referrals, on the payout row, and in the Elite instrument's crest and rail;
  violet exists only inside the Advanced instrument; BNB yellow appears only
  where the payment asset is named. No colour is used because a section wanted
  one.
- **Label ink clears AA on every surface it is used on**, because it is used at
  11–13px.
- Buttons, chips and status marks carry a dot, a word or a glyph as well as a
  tone — **colour is never the sole carrier of meaning.**

## 7. Space, radius, elevation, overlap

- Shell `1180px`; gutters 20 / 32 / 40px at 0 / 768 / 1120px.
- **Section rhythm:** `padding-block: clamp(64px, 8vw, 116px)`.
- **Sections are separated by space and a luminance band — never by a rule
  between every pair.** A rule between each section is what turns a page into a
  stack of boxes; a 2% luminance step is enough to read a new chapter.
- **One spine.** Each section's number sits in a left index column (≥768px) that
  draws a hairline down the full height of the header, so nine headers align to
  one column and the page reads as one composition rather than nine blocks.
- **The surface ladder**, respected by every composed surface:

  | Step | Token | Used for |
  | --- | --- | --- |
  | canvas | `--pse-canvas` | the page |
  | panel | `--pse-surface` + ring | a module grouping related controls |
  | raised | `--pse-surface-2` + ring + lift | a module carrying a decision |
  | inset | `--pse-inset` + hairline | a recessed well inside a module |

- Radii: `6px` keys and nodes · `10px` controls and small tiles · `14px` panels,
  inputs, instruments · `20px` the auth plate. Never a pill except a chip.
- **Elevation is light, not shadow.** A shadow-as-border ring (`--pse-ring`) plus
  an inner top highlight (`--pse-lift`), locked to two lifted levels. Measured on
  the rendered landing: **8 distinct shadow strings, all of them a 1px ring, a
  state ring, or the two lifts** — never a dark-on-dark blur stack.
- **Exactly one overlap exists in the whole product**: the hero's floating
  operating-mode tile over the application window's lower-right corner. It may
  cover a surface and never a sentence — the window's specimen footer *reserves*
  that corner so the text wraps before the tile's column, and the rendered
  geometry is asserted so the overlap can never creep.
- One atmosphere behind the whole page: a single very wide, very low wash
  (`--pse-glow`), not a stack of decorative gradients.

## 8. Components

| Component | Rule |
| --- | --- |
| Section header (`pse-head`) | Index column + spine hairline, kicker, h2, optional lede. Index folds above the kicker below 768px. |
| Split (`pse-split`) | Asymmetric composition. `--object-end` / `--object-start` declare which side carries the object, so the wider column is always the object's and the object never lands on the same side twice in a row. |
| Application window (`pse-console`) | The product's strongest specimen: title bar with its own state chip, a 52px instrument rail carrying a miniature of every unit in the family, the campaign figures, the capacity instrument, the tier roster and a footer that labels it a specimen. |
| Floating tile (`pse-floatcard`) | The window's one overlapping surface (operating mode). Static below 1024px — recomposed, not shrunk. |
| Capacity instrument (`pse-gauge`) | One shared denominator, a 12px two-segment composition bar, a **marker at the total** so the headroom to the ceiling is visible, a printed axis, and three proportional rows with tabular values. `--compact` for use inside the window. |
| Lifecycle rail (`pse-lifecycle`) | A **tab set**: five phases with nodes and connectors drawn in turn, arrow-key navigation, one `aria-selected` phase and a detail panel that states what that phase changes. **No "you are here".** |
| Flow rail (`pse-railflow`) | An ordered sequence as a vertical rail: a node box per stage holding that stage's own glyph, an index, and the connector to the next stage. Vertical at every width by design, because it lives in an asymmetric column. |
| Equipment family (`PseTierModule` + `pse-family`) | **One 120×96 grid, four profiles.** Shared grammar: plinth with two feet, calibration rail, a capacity mast that grows with the tier, and a frame with working cells. Starter is a low single-cell chassis; Builder stacks two; Advanced opens a 2×2 lattice with restrained violet; Elite is the tallest frame with a four-column bank and the only continuous-duty crest (cyan). Silhouette and cell topology carry the tier, so it survives 60px, monochrome and colour-blindness. |
| Equipment specification (`pse-unit`) | Not four cards: one panel, a labelled column header (≥1024px), and one row per unit — instrument, tier, mode, hourly capacity with a proportional bar and its share of the family, price and ownership limit on the header's columns. Hover lights the row and the instrument's active cells. |
| Purchase console (`pse-pay`) | A wallet flow: unit identity, then the amount as an explicit **price in GBP → quoted amount in BNB** translation through a drawn rate connector, then the network identity, then the four real purchase states with only the specimen's own state marked. Its only control is a real link. |
| Settlement statement (`pse-statement`) | The denomination change drawn once down the left (GBP → settlement → BNB), then the four stages as rows with aligned Unit / What-happens columns from 720px. |
| Trust map (`pse-trustmap`) | One account record wired to four properties, because a map says "four properties of one system" where a grid says "four features". |
| Stat (`pse-stat`) | Label, tabular figure, optional unit and note. `StatGrid` is 2 → 3/4 columns at 720px. **Not every number is a hero statistic.** |
| FAQ (`pse-faq`) | Numbered rows, drawn plus/minus, `aria-expanded` + `aria-controls`. Index column drops below 560px. |
| Chip (`pse-chip`) | Mono, uppercase, small radius, dot. The **word** carries the meaning. |
| Button (`pse-btn`) | 48px (`--lg`) or 44px (`--sm`). Solid accent for the primary action, ringed inset for secondary. The arrow shifts 3px on hover — the only decorative movement allowed. |
| Input (`pse-input`) | 48px, accent border plus a 3px accent-quiet ring on focus; invalid fields get the danger edge. |
| Password control + meter (`pse-meter`) | Toggle inside the field; a 3px four-band rail driven by the real input, reporting a band and never a score or percentage. |
| Masthead (`pse-mast`) | Sticky, translucent graphite. Section anchors are a **desktop-only** affordance (≥960px); below that the bar is brand + one menu control, with navigation in a drawer. |

## 9. Landing composition

```
masthead ── brand · anchors · Sign in · Create account · ☰

hero ─────────────  asymmetric, object right
  proposition · CTA pair · a three-cell financial metadata strip
  ▸ Application window (title bar · instrument rail · campaign ·
    capacity ceiling · capacity instrument · tier roster · specimen foot)
  ▸ Floating tile overlapping the window's lower-right corner

01  the purchase ──── asymmetric, object right
    header + footnote ·▸ the purchase flow rail (vertical, 4 stages)
02  the tool family ── FULL BLEED
    ▸ one equipment specification, 4 rows, labelled columns
03  capacity ──────── asymmetric, object right
    header + the referral ladder ·▸ the capacity instrument
04  campaign ──────── FULL BLEED
    ▸ the interactive lifecycle rail + three figures
05  payment ───────── asymmetric, object left
    ▸ the purchase console · what a quote gives you + two footnotes
06  settlement ────── FULL BLEED
    ▸ the settlement statement · two reading columns
07  security ──────── FULL BLEED
    ▸ the trust map · two reading columns
08  questions ─────── asymmetric, object right
    header ·▸ the numbered accordion
09  the close ─────── one band: the proposition, the first unit drawn, the CTAs
footer ────────────── brand, one paragraph, links, disclaimer
```

**The composition alternates on purpose** — full-bleed instrument, then
asymmetric split, then full-bleed — and the split's weight declares which side is
the object's. The hero's first viewport carries the brand, the proposition, the
primary CTA and the product window; never a wall of navigation.

## 10. Authentication composition

**Two panels from 1024px, one from below it, and the task is never centred in a
void.**

```
[ PSEmine ]                                    About PSEmine
──────────────────────────────┬──────────────────────────────────
  (brand panel, artwork)      │   Sign in
  ┌ calibration rail          │   Enter your email and password…
  │  ┌────────┐               │   [ Email ]
  │  │  mark  │  plate        │   [ Password               👁 ]
  │  └────────┘               │   [          Sign in          ]
  │  PSEmine                  │   Forgot your password?
  │  CAMPAIGN MINING          │   ─────────  or  ─────────
  │  (faint emblem watermark) │   [    Continue with Google   ]
  │      ^ inset hairline     │   New to PSEmine? Create one
  └                           │
                              │   🔒 never asks for your key…
```

- **The brand panel is artwork, not information**, and is `aria-hidden`: mark in a
  104px plate, the lockup, a calibration rail with ticks, one inset hairline
  frame, and the emblem again as a 5%-opacity watermark. It carries no figure, no
  state and no product education — which is what keeps the auth content contract
  intact while still giving the screen a designed anchor.
- **One surface owns each screen.** ≥1024px the panel is the surface and the form
  is a plain column; 768–1023px the panel is gone and the form *becomes* the
  instrument (452px, 20px radius, ring + lift, one accent hairline across its top
  edge); below 768px the form is a full-bleed column, because on a phone width is
  the scarce resource and a card would only eat it.
- **One lockup per screen.** The form's compact brand row is hidden from 1024px,
  where the panel carries it. Two lockups is what makes a sign-in page look
  assembled.
- Fields 48px, primary action 48px full-width.
- **Action order is deliberate:** the primary action, then whatever qualifies it
  (the reset link, or the terms line), then the provider divider, then the
  alternate provider.
- At 390×844 the bar, brand row, heading, welcome line, both fields and the
  primary action are above the fold.

## 11. Loader

**An application state, not a page** — and the product's brand anchor when there
is genuinely nothing to show yet.

A 76px brand plate on the raised surface (gradient surface → surface, ring plus
one lift) holding the emblem at 40px and catching a slow **sheen**; the product
name with its descriptor; one indeterminate rail; one honest sentence naming the
real stage. That is the whole composition.

| State | Presentation |
| --- | --- |
| `session` | "Preparing your account" |
| `identity` | "Confirming your identity" |
| `access` | "Checking your access" |
| `campaign` | "Loading campaign state" |
| `data` | "Loading your account" |
| slow (8s) | "Still working. A slow connection is usually the reason." |
| stalled (25s) | states that the wait is longer than it should be, and offers a real retry (only when the caller has one) plus a reload |
| failure | `PseLoadFailure`: the real title and message, retry only when `error.retryable` |
| verification required | **not a loader** — the route guard navigates |
| onboarding required | **not a loader** — the route guard navigates |
| nothing to wait for | **no loader at all** |

No percentage, no filling bar, no scan, no terminal, no counter, no step list, no
boot sequence, no invented diagnostics. The sheen circles the plate without ever
claiming a position, and the rail is indeterminate in the literal sense.

## 12. Motion

Seven moving things, each one explaining hierarchy, state or physical layering:

| Motion | Why |
| --- | --- |
| `Reveal` — one-shot viewport entrance (`opacity` + 18px rise, 620ms) | a section arrives once, so the eye reads it as new |
| Capacity bar, rows and marker, 820ms | a measurement reads as a measurement only once it has settled |
| Lifecycle + flow rail connectors, drawn in turn, 520ms + 110ms per stage | a rail reads as a sequence once it is drawn |
| Equipment capacity bar fill, 780ms | proportional to the tier, once |
| Window hover: instrument rail opacity, tile lift, equipment active cells | the specimen is a surface, so it answers the pointer |
| Loader plate sheen (2.9s) | work is happening, with no claim about how much |
| 140–220ms control transitions (border, colour, background, lift) | affordance |

Elements are **visible by default** and only hidden once an `IntersectionObserver`
is present to bring them back, so a failed observer can never leave the page
blank. No scroll-jacking, no parallax, no counting numbers, no looping
decoration, no fake mining or blockchain activity.

`prefers-reduced-motion: reduce` stops all of it — reveals resolve immediately,
bars sit at their true values, the plate's sheen is not rendered at all, and the
rail becomes one static centred segment, never a filled bar.

## 13. Responsive

| Viewport | Composition |
| --- | --- |
| 390×844 | brand + one menu control, drawer navigation; hero stacked with the window recomposed (rail dropped, roster 2-up, tile inline); the equipment family as a **horizontal reel** of self-contained units with a swipe hint; the flow rail vertical; the settlement statement single-column; the trust map single-column; the FAQ without its index column; full-bleed auth column |
| 430×932 | the same composition with more air |
| 768×1024 | the section spine appears; the hero is still stacked but the window's rail and 4-up roster are live; the equipment family becomes a **two-column specification** (instrument beside tier and capacity, figures on their own row) with the column header still absent; the lifecycle rail runs horizontally; the trust map 2-up; the statement gains its column header; the auth form becomes an instrument |
| 1440×900 | 1180px shell; the hero splits and the window gains its floating tile; the equipment family gains its 5-column header row with price and ownership aligned across rows; the trust map 4-up; the auth brand panel appears and the page splits |

No horizontal overflow at any of the four (measured), and no sub-44px touch
target.

## 14. Prohibited

Generic dark SaaS · crypto casinò styling · cyberpunk or terminal aesthetics ·
glassmorphism · gradient stacks · neon glow · a shadow per element · decorative
grids · fake charts · fake metrics · **a percentage or progress bar for an unknown
duration** · billboard display type · pill buttons · emoji as icons · a bordered
box around every block · centred everything · **four identical cards presented as
a design** · **an overlap that covers a sentence** · colour as the sole carrier of
meaning · animation without meaning · invented logos · architecture copy in the UI
· **a personal or live figure on a public route** · **a payment or payout address
printed publicly** · **any content on a route where it does not belong**.

## 15. Known divergences (recorded, not fixed here)

- **Superseded rules remain in `src/styles/psemine.css`.** The instrument blocks
  replaced by this rebuild (`.pse-spec-cell*`, the old `.pse-trust*` grid and
  `.pse-columns`) are now unused selectors. They are dead weight in that file
  rather than a live defect: nothing references them, and the surfaces that
  replaced them live in `psemine-product.css`. They were not removed because the
  editing tooling available in this environment could not patch past roughly the
  first 45KB of the file — a limitation of the tool, not a decision about the
  design. Removing them is a mechanical follow-up on a smaller edit surface.
- `src/types/psemine.ts` mirrors `QUOTE_EXPIRATION_MINUTES: 10` while the backend
  holds `QUOTE_TTL_MINUTES = 15`. The UI deliberately never prints a quote
  lifetime, so this cannot surface to a user. Pre-existing.
- `.agents/skills/ui-ux-pro-max/` references `references/quick-reference.md` and
  `references/pro-rules.md`, which the sync does not pull; only `SKILL.md` and
  `src/` are present. The skill's searchable data (`src/data/*.csv` — including
  `landing.csv`, `motion.csv` and `app-interface.csv`, all three used in this
  pass — and `src/scripts/search.py`) is present.
- The open-design MCP server is not registered in this environment; the design
  systems were read directly from `.agents/skills/open-design/design-systems/`.
- The public guide (`/mine/guide`) is a non-target surface: its copy was corrected
  but its presentation was not rebuilt to this system.
- The authenticated console is outside this system entirely; it uses the
  application theme and the `PseBasics` primitives. The presentation rebuild
  touched `.pse`-scoped files only, so the console renders exactly as it did.
- Authenticated QA remains blocked in this environment (no test credentials), so
  the access gate, the signed-in verify-email branch and the console routes are
  not rendered by any harness here.
- The loader's in-app timing is not directly observable here (the identity layer
  resolves before first paint), so its composition and CSS contract are verified
  while the live wait is not.

## 16. Art-direction layer (`src/styles/psemine-art.css`)

The rebuild that followed this record changed the public composition from a
well-typeset document into an instrument, and it did so in a fourth stylesheet
loaded after the other three. Two structural decisions are worth keeping:

- **The plate header replaces the numbered heading block.** Every section opens
  with a datum rule — a full-shell hairline carrying an index badge, the section
  subject and a right-aligned reading — with the title and lede in two columns
  *below* it, so the page's nine sections share one spine and the eye lands on the
  instrument rather than on a heading over a paragraph. Prose is set at 15px and
  never at display scale, which is the only budget the composition needs.
- **The hero is an application window, not a card.** `PseAppWindow` composes an
  application bar with the product's own navigation, a unit rail, a four-figure
  strip in the product's units, the capacity instrument, the operating-signature
  chart on a printed day axis, and the unit roster. Its figures describe an
  EXAMPLE BUILD, labelled as such in the window's bar and footer.
- **The window is a container, not a viewport.** `container-type: inline-size` on
  `.pse-app` is what lets the rail, the two-instrument pair and the roster answer
  for the window's own width — which ranges from 492px to 704px across the same
  viewport widths, because the hero splits at 1024px. A viewport breakpoint
  cannot express that, and the layout silently breaks when one is used.
- **The family plate has two registers.** The `ELEVATION` (four units drawn large
  on one datum, the section's artwork) and the `SPECIFICATION` (four rows of
  aligned figures, each marked by a 96px `mark`). The row's `mark` is not a
  smaller copy of the plate: below 132px the drawing drops its extrusion, its
  calibration rail, its dimension line and its price, because five pixels of
  annotation is noise pretending to be information.
- **Printed scales.** `PseScale` states the range of the capacity instrument, the
  equipment family and the campaign rail, so a bar is a measurement rather than a
  decoration that happens to be a certain percentage wide.

Divergences introduced by this layer:

- `.pse-console*` and `.pse-roster*` in `psemine.css` and `psemine-product.css`
  are now superseded by `.pse-app*` and are unused selectors, for the same
  45KB-edit-tool reason recorded above. The `.pse-floatcard` overlap device is
  still live and still positioned by `psemine-product.css`.
- `psemine-art.css` is the fourth stylesheet in `src/main.tsx`; load order is
  `psemine.css` → `psemine-product.css` → `psemine-auth.css` → `psemine-art.css`.

## 17. Polish pass — lifecycle, documents, and the states around them

This pass added no new visual language. It fixed a lifecycle defect, completed
the product's document surfaces, and put the states a financial product needs
where a person meets them.

- **The loader was never broken; its presentation was unreachable.**
  `AuthProvider` renders no children until the shared Firebase session and the
  `users/{uid}` entitlement document resolve, so the wait a PSEmine visitor
  actually saw was the shared **neutral** splash — a PulseEarn-coloured bar on
  `#050507` — and never `PseLoader`. The lifecycle is unchanged: the same gate,
  the same 30s timeout, the same failure handling. `src/components/RestoreSplash.tsx`
  now selects the identity shown during that wait from the URL, so `/mine/*`
  renders the product's own loader on the product's own plane and every other
  route keeps the neutral splash byte-for-byte. This is the one shared-infrastructure
  change of the pass, and it is presentation-only.
- **`src/components/psemine/pseDocs.ts` is the document registry** — ids, order,
  routes and labels, with no JSX — so the landing footer, the sign-up form, the
authentication footer and the guide all name the same set. The prose lives in
  `src/pages/psemine/PSEminePolicy.tsx`, keyed by stable section id, so a clause
  can be reviewed and replaced on its own. Every document states its review
  status, revision and date, and every figure in it is interpolated from
  `src/types/psemine.ts` rather than retyped.
- **`src/styles/psemine-docs.css`** is the fifth stylesheet and carries one
  surface type only (the document). The footer grows a third column at ≥1024px
  via `.pse-foot-grid--navs`; `.pse-foot-links` must stay single-column wherever
  a nav shares its footer column with another nav, or a label ends up in a 44px
  box with clipped text.
- **Sign-up carries a real agreement control** that gates submission and moves
  focus onto itself when it is the reason the form did not submit. It is not
  persisted: `UserData` has no acceptance field and none was invented, so
  recording it needs an account-model change outside presentation scope.
- **Empty and failure states stay honest.** `PseEmptyNote` gained an optional
  title and action; the action is always a real destination, never a dismissal.

Deliberately not done here, and why: the authenticated purchase console
(`PSEMineTools`) already renders quote, network, receiving address and
verification state, but no route behind the identity gate can be rendered in this
environment, so it was not restyled; wallet/network error states (`Wrong network`,
`Quote expired`, `Session expired`) live in those same unverifiable paths.

## 18. The console layer (`src/styles/psemine-console.css`)

THE CONSOLE WAS THE MISSING HALF. The public surfaces, the authentication family
and the loader were rebuilt by the passes above; the authenticated product was
still the pre-purge "minimal functional presentation", so the product had a
finished front door and an unfinished room behind it. This pass gives the console
the same vocabulary, and it is the same vocabulary rather than a second one:
the console is composed from the primitives in `src/styles/psemine.css` that
were already there (`.pse-panel`, `.pse-tag`, `.pse-notice`, `.pse-field`,
`.pse-input`, `.pse-btn`, `.pse-gauge`, `.pse-railflow`, `.pse-ladder`,
`.pse-lifecycle`) plus the six additions below.

WHAT THE LAYER ADDS, AND WHY EACH ONE EXISTS:

- **The product bar** (`.pse-bar`, `.pse-nav`, `.pse-nav-link`). Seven section
  names with a 2px indicator under the current one — no pill, no filled tab,
  because at console density a filled chip competes with the figures below it.
  44px targets; below 960px the sections move into a sheet, because seven names
  cannot be made to fit a phone by shrinking them.
- **The campaign strip** (`.pse-strip`). The campaign's position on every
  console route: the status the backend reports, the real day inside the real
  window, a day rail drawn against that window, and the account's real capacity.
  While the campaign read is in flight it says **"Reading campaign"** rather than
  defaulting to "Scheduled" — an unknown status printed as a known one is the
  quietest way a console can lie.
- **The fact register** (`.pse-facts`, `.pse-fact`, `PseFacts`/`PseFact`). The
  replacement for the underlined `<dl>` that used to appear on six console pages.
  Cells are separated by the page's own hairline, the value is tabular and
  right-aligned in a column so eight figures can be compared by scanning down,
  and a value that is a sentence rather than a figure takes the text family back.
- **The ledger** (`.pse-ledger`, `PseTable`'s `numeric` and `PseCell`'s `sub`).
  Column heads in the data-label role, hairline rows, `td.pse-num` for figures
  so the digits of one row sit under the digits of the last. It scrolls inside
  its own wrapper and only the identifying column wraps: a figure split across
  two lines is unreadable, a tool name is not.
- **Empty, dialog, sheet** (`.pse-empty`, `.pse-dialog`, `.pse-sheet`) and one
  shared **scrim** for all three overlays, so a dialog, the notification sheet
  and the guide read as the same kind of interruption.
- **The guide plate** (`.pse-guide*`), below.

TWO RULES THAT LIVE HERE AND NOWHERE ELSE:

- `button.pse-link` — a text action that performs something rather than
  navigating (a refresh, a reveal) carries the link role **and behaves like a
  link**, laid out in the flow of the sentence around it with no button chrome.
  A control in the middle of a line of text belongs in the line.
- `.pse-meta-action` — a section's own control in its label row. Its hit area is
  44px; its footprint is the height of the text beside it, so a register header
  stays a line instead of becoming a toolbar.

## 19. The guide (`src/components/psemine/PseGuide.tsx`)

AN OVERLAY, NOT A PAGE. `/mine/guide` and `/mine/guide/onboarding` render the
console and the shell opens the guide's plate **over** it. Learning the product
no longer costs the reader the product, the campaign strip stays visible beneath
the plate, and finishing onboarding reveals a console that is already loaded
rather than routing the reader to a page they have to trust is there.

EIGHT CONCEPTS, IN THE PRODUCT'S OWN INSTRUMENTS: the campaign rail, the
equipment family, the capacity instrument, the qualification ladder, the accrual
rail, the settlement statement, the payment pipeline and a closing register. The
guide teaches the interface by being the interface.

ONBOARDING IS RECORDED IN THE ACCOUNT, ONCE. Completion writes
`users/{uid}.onboardingCompleted` — the field the route guard reads — so a
returning reader on another device is not shown the walkthrough again. **Skipping
also records completion**: skipping without recording would send the guard
straight back to the plate, which is a loop the reader cannot escape. Escape
follows the same rule, which is why the onboarding plate has no dismiss that
does not record.

GEOMETRY FROM MEASUREMENT, NOT TASTE. The plate compacts the product's full-size
instruments so each stage's visual and the sentence that explains it are on
screen together:

- the campaign rail runs **across at every width inside the guide**, because the
  public page's vertical form measured 741px on a 390×844 screen — the reader
  met the diagram and never reached the explanation;
- the settlement statement drops its denomination side-note, which repeated the
  stage's own lede and, at the plate's width, was setting the height of all four
  rows (measured 717px);
- `.pse-guide-visual` is **not** a frame. Several instruments bring their own
  surface, and a framed panel inside a framed panel is how a product starts
  reading as a set of boxes. The instruments that carry no chrome are
  measurements, and a measurement needs no frame to be legible.

`.pse-lifecycle-rail` was generalised to one equal column per phase
(`grid-auto-flow: column`) in `src/styles/psemine.css`: the hard-coded five
columns were correct only for the five-phase campaign rail, and the guide's four
phases left every tab narrower than its own label.

### Two defects found by measuring, and fixed

- **`CapacityInstrument` printed the ceiling as its total.** The total row was
  passed `ceiling` instead of `units + referrals`, so the instrument's loudest
  figure — "Total capacity" — stated the campaign maximum instead of the
  account's composition, in every place the instrument appears, including the
  hero's application window on the landing page. It now prints the composition
  and draws its bar against the same value as the marker above it. A financial
  instrument that misstates its own total is the one kind of defect this product
  cannot ship.
- **Public surfaces linked into the console.** Making `/mine/guide` a protected
  console route meant the landing's closing CTA, the landing footer and both
  document pages were linking signed-out readers at a sign-in wall. Public
  surfaces now point at the public explanation — `#campaign` on the landing — and
  the document pages cross into it with a plain anchor, because a fragment has to
  be honoured on load and a pushState navigation does not do that.

## 20. Known divergences (continued)

- **The console cannot be rendered in this environment.** No Firebase
  credentials exist here, so no session can be created and every console route
  correctly redirects to sign-in. The console's layout was therefore measured
  through a **temporary development route** that rendered the real components
  over fixture data; it was deleted before this pass was committed, and it is
  never part of the product. What that leaves unverified: the shell's wiring (the
  bar's navigation, the notification sheet's mark-read, the guide's completion
  write) is verified by typecheck and by reading the code, not by running it.
- **`pse-visual-check` reports `/mine/guide` and `/mine/login` as identical.**
  That is the new behaviour and it is correct: `/mine/guide` is now a protected
  console route, so an unauthenticated read of it lands on sign-in.
- **Landing footer document links are 23px tall.** They are inline links in a
  link column, which WCAG 2.5.8 exempts and `pse-a11y-check` reports as exempt;
  making nine of them 44px would add roughly 200px to the page and loosen the
  footer. The console footer's equivalent links ARE 44px, because that footer
  shares a row with the account controls.
- **The landing's own length** (measured 9,910px at 1440) is a consequence of
  its nine-section structure, which this pass was explicitly forbidden from
  changing. No section was added; none was removed.

## 21. Hierarchy pass — what the console was getting wrong

This pass began by making the rendered output actually inspectable, and that
changed what could be judged. Three findings, all measured, all corrected here.

**1. Reading text was set at the label weight.** `.pse-body`, `.pse-lead` and
`.pse-plate-lede` declared a size and a colour but no weight, so they inherited
`500` — the interactive/label weight — while §1 of this document states the
contract *400 reads, 500 interacts and labels, 600 announces once*. The landing
was therefore set in one weight and hierarchy rested on size alone, which is
what makes a composition read as a template however good its scale is. The three
reading classes now declare `font-weight: 400`. Display type still takes its
authority from size and tracking, as §1 requires.

**2. The console's section headings were smaller than its body text.** Every
`.pse-block-title` was `11px` mono caps, so `Capacity` and `Settlement` sat
*below* the 14px body under them and every register carried equal weight: eight
sections, five ledger tables, one flat texture. Section headings are now
sentence case at `0.9375rem/600`, above body. The mono letterspaced caps remain
where they belong — values, states, chips and ledger columns — so the product's
technical voice survives without letting labels outrank the content they label.

**3. The dashboard had no dominant figure.** It was eight registers of equal
weight, so the page answered everything and led with nothing. It is now: one
verdict, **one hero figure** (accrued, at `clamp(2rem, 5.2vw, 2.875rem)` — the
only oversized type in the console), the capacity instrument, an equipment list,
a settlement position read from the backend's payout records, referrals, and the
five most recent records. The six-column equipment table became a list; the
four-column ownership table became a headroom strip. No figure was invented and
no information was dropped — the full ledger still lives on `/mine/activity`.

**4. The authentication panel was an empty room.** Measured, the brand panel
covered 928×839px while carrying 2.5% content: a plate, a wordmark, four
hairlines and a 5%-opacity watermark. Its frame was drawn at 7.5% alpha —
invisible on this product's dark surface — so it read as undrawn rather than as
restrained. The frame is now `--pse-rule`, the watermark is 8.5%, and the lockup
is followed by a quiet legend of five **published** campaign facts taken from the
same constants the landing and the guide print. It states nothing about an
account, which is why the panel stays `aria-hidden`.

**5. Long values were clipped on mobile.** `.pse-facts` used an implicit `auto`
track, which grows to its content's min-content width; a 42-character wallet
address therefore widened the grid past its column and `overflow: hidden` cut
the value off at 390px. The track is now `minmax(0, 1fr)` and long values break
inside themselves. `table.pse-ledger` still exceeds the viewport on mobile — it
is inside `.pse-ledger-wrap { overflow-x: auto }`, which is the intended
behaviour, and nothing is clipped.

**How the output was inspected.** The rendering harness used here screenshots
the real build and then decodes the PNG itself (zlib + scanlines) into
per-cell maps: *ink* (fraction of pixels above a luminance threshold, which
preserves text masses and fills at coarse resolution), *structure* (high-pass
edges: borders, panels, alignment), *saturation* (where colour lives), plus a
per-band ink profile for vertical rhythm and a DOM type-ramp dump. Two limits
are worth stating plainly: hairline rules below roughly 13% alpha fall under the
ink threshold and so read as empty, and no pixel map reveals letterform quality,
kerning or type rendering. Two defects in this pass were found only because the
maps were cross-checked against DOM geometry: a *page* that looked 2,271px blank
was my own harness screenshotting without scrolling (scroll-reveal children were
still at `opacity: 0`), and the auth form that looked flush to the viewport edge
actually sits at x 992–1384.

## 22. Landing composition pass — the chain, the plate, and the decision

The information architecture is unchanged: the same sections, in the same order,
with the same ids (plus `#campaign` restored to the menu, which had no way in).
What changed is what each section *is*, section by section.

### The product story is drawn once, not argued four times

The page previously made the core relationship — units and qualified referrals
become capacity, capacity becomes a rate, the rate accrues for 90 days, that
accrues into a GBP settlement, the settlement is paid in BNB — in prose, in a
ladder, in a gauge and in a lifecycle rail, none of which contained the whole
sentence. `CapacityChain` (§03) is that sentence as one object: a full-width
plate bounded by two hairlines, two sources carrying their own capacity token on
their own left edge, and the four things capacity becomes, in order. The arrow
between links is a rotated `→`: down the page below 1024px, across it above.

Measured at 768px first: five columns of 118px left every note three lines deep
and the source pair 112px taller than the step beside it, so the plate read as a
ragged block. The chain therefore runs across the page only from 1024px, and
stacks below it.

### The specimen states the chain too

`PseAppWindow` gained a `spine` — five links along the foot of the window, in the
product's own units, ending in the payout asset, with the build's total as the
only loud figure. It is inside the window's own container query (two columns by
three below a 520px window, one row of five above), so it answers for the width
the window actually has. The hero's terms strip became four decisions instead of
three facts (campaign, unit price, capacity, settlement), two by two except while
the hero is one full-width column.

*Measured defect, fixed:* at 1440 the hero column is ~484px, so four cells of
121px wrapped `£0.10 – £2.50/hour` and made one cell 21px taller than its three
neighbours. Four across now applies only in the 640–1023px range.

### The elevation is a plate, and it is drawn to capacity

The equipment elevation drew four units at one width and captioned them with tier
codes: a claim ("one product line, four units") that the table below already made
and the drawing said nothing about. Now a unit's drawing width encodes its locked
hourly rate (root-scaled, 56% → 100%), the caption prints the rate the encoding
stands for, and the ground is *drawn* — the section claimed one datum and never
showed one.

*Measured defects, fixed:* the 208px cap on the SVG flattened Builder, Advanced
and Elite to one width (Advanced and Elite both rendered 176px tall); the cap now
sits on the wrapper at 18rem, and the four heights measure 118/147/176/204. The
datum sat 12px below the drawings because a grid gap separated them; the datum
now meets the row exactly at 1440 (both y=2250) and is drawn only where the four
units share one ground — below 900px the row is two rows of two, each with its own
floor, and one line under the second pair would claim something untrue.

The radial accent wash behind the elevation is gone. It was the one piece of
decoration on the page that stated nothing.

### Ownership limits are a shape

The per-account maximum was the only locked economic represented by a number
alone. It now also has a form: five pips, three, three, two.

### The lifecycle is a timeline

Seven phases, not five, and named for what the product actually does: a campaign
is *dated* before it is active. Each phase carries **when** it happens in campaign
days, so the rail states a timeline rather than an order. Still no "now": no
marker, no countdown, no progress, no live state.

### Quote terms instead of four stat blocks

The payment section's right column summarised what the specimen beside it already
showed. It is now a quotation — titled head, ruled rows, note — stating the five
rules a buyer agrees to, including the two failure modes the product records
rather than absorbs (expired, underpaid).

### The close is a decision, not three equal buttons

The closing band drew one Elite unit beside three equally weighted controls. It
now carries the whole price list — four rows, each a real link into sign-up, each
stating price, hourly capacity and ownership limit — under one primary action,
with the guide demoted to a text link.

### Navigation states position

The bar carries the network the product settles on (a fact, with no green dot and
no "live"), and the menu marks the section the reader is in with a hairline and
full ink. The drawer echoes the section indices the plates print. The FAQ's own
header holds at 88px while its nine answers are read.

*Measured defect, fixed:* the first attempt put `position: sticky` on the split's
column, which is aligned `start` and therefore only as tall as the header — a
sticky child had nowhere to travel. `align-self: stretch` on the column is what
makes it work; verified holding at 88px at 1024/1280/1440.

### What is deliberately still absent

No new section, no section removed, no card added: the chain is a plate bounded by
hairlines, and the elevation, the quote and the price list reuse the surface
ladder already declared. Every figure on the page remains either a locked product
constant or the 90-day campaign's own length. The page still reads nothing — no
session, no campaign record, no request.

### Limits of the evidence for this pass

Collected against the running dev server at 390/430/768/1440: DOM geometry per
object (rects, line counts, column counts), the computed type ramp, clipping and
off-screen probes, and a decoded-PNG luminance map with a per-band ink profile.
The map is what makes an unintentional hole or a mis-sized object visible; it
does not show kerning, letterforms or type rendering, and no claim about those is
made here. Contrast for every new text style was computed from its tokens rather
than measured: the lightest new text is `--pse-ink-3` on `#08090b` at 5.79:1.
