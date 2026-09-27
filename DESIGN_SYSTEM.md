> **Scope:** PSEmine only. This is the design authority for the product's public and
> authentication surfaces (`/mine`, `/mine/login`, `/mine/signup`,
> `/mine/forgot-password`, `/mine/verify-email`), its loading states and its brand
> mark. It is not an authority over PulseEarn, and it does not restate the synced
> skill library — `.agents/` remains the source material.

# PSEmine Design System

## 1. Direction

**The instrument.** PSEmine sells a bounded, dated earning instrument, so it is
presented the way a serious instrument is documented: ruled, numbered, tabular and
dated.

The consequence of that sentence is the whole system. A document earns its
credibility from typography, alignment and restraint, not from ornament, so:

- structure comes from hairline rules and one measured column, never from floating cards;
- emphasis comes from scale, weight and alignment, never from colour or effect;
- there are exactly two colours with a job, and everything else is paper and ink;
- every figure is set in a tabular figure family, so columns of numbers line up.

Anything decorative was removed rather than styled.

### Why the previous direction failed

Phase 1 was an ink-and-hairline ledger with a teal accent and an invented "ore
plate" mark. Its restraint was right; its identity was not. It had discarded the
product's own existing emblem, and its palette carried no relationship to that
emblem, so the product looked like a generic documentation site wearing a
placeholder logo. This rebuild restores the real mark and derives the palette from
it.

## 2. Brand

The mark is **recovered, not invented**: the faceted PSE emblem that was live
across the shell, console, public page and authentication family before the first
design purge (`38d7a5f:src/components/psemine/PSEBrand.tsx`). Its geometry is
unchanged — five facets cut on one diagonal: an electric-blue blade, a light upper
facet notched by an inner cut, a steel side facet, and a cyan crest.

Only its implementation changed:

| Was | Is |
| --- | --- |
| Hard-coded dark palette (`#EDEEEC`, `#0F0F12`) that vanished on light surfaces | `--pse-brand-*` tokens resolved per theme |
| `role="img"` with an empty label when decorative | `aria-hidden`, no role |
| One treatment | `tone="brand"` for colour, `tone="mono"` for single-colour contexts |

- **One mark, no competing identities.** Hero, auth, navigation, mobile and favicon
  all use the same drawing at different sizes.
- **The crest facet is the only part that ever animates** (`live`), and it animates
  only to state a running campaign. It is disabled under reduced motion.
- `public/psemine-mark.svg` is the favicon treatment: the same facets on a solid ink
  plate, because a transparent emblem loses its light upper facet against light
  browser chrome. It swaps in on PSEmine routes via `pseCore.ts`.
- **Wordmark:** "PSEmine" in the interface family; any descriptor in the figure
  family at label scale.

## 3. Typography

Two roles, never mixed in one string:

| Role | Family | Used for |
| --- | --- | --- |
| Interface and language | **Inter** | headings, prose, buttons, labels of prose fields |
| Data and names of things | **JetBrains Mono** | every rate, price, date, day count, address, hash, clause index, column head, term label, status tag |

Both are already loaded by `index.html`; this adds no font request.

- **Figures always carry `font-variant-numeric: tabular-nums`.** Rates, prices,
  day counts, addresses and hashes must align column-wise.
- Labels are mono, uppercase, `0.13em` tracked, tertiary ink. This is the
  document's voice for naming a thing, and it is what makes a spec row read as a
  spec row.
- Scale: display `clamp(2.05rem, 1.35rem + 2.5vw, 3.3rem)` · h2
  `clamp(1.4rem, 1.15rem + 1vw, 1.95rem)` · h3 `1.0313rem` · lead
  `clamp(1rem, .96rem + .22vw, 1.125rem)` · body `.9375rem` · small `.8125rem` ·
  label `.6875rem`.
- Tracking is negative on display sizes (`-0.024em` at display, `-0.008em` at h3)
  and positive on labels. Headings use `text-wrap: balance`; prose uses `pretty`.

## 4. Colour

Paper and ink carry the surface; two colours have jobs and no others exist.

| Token | Job | Light | Dark |
| --- | --- | --- | --- |
| `--pse-paper` / `--pse-paper-2` / `--pse-paper-3` | page, band, well | `#ffffff` / `#f6f6f3` / `#eceae3` | `#0b0d11` / `#101319` / `#161a21` |
| `--pse-ink` / `--pse-ink-2` / `--pse-ink-3` | primary, secondary, label ink | `#12161d` / `#4c5462` / `#7b8492` | `#f2f3f5` / `#a6aeba` / `#79818e` |
| `--pse-rule` / `--pse-rule-2` / `--pse-rule-strong` | structure | `rgba(18,22,29,.15 / .075 / .3)` | `rgba(255,255,255,.16 / .075 / .32)` |
| `--pse-accent` | **interaction and live state only** | `#1e4fd8` | `#5a8bff` |
| `--pse-capacity` | **capacity data only** | `#0e7c94` | `#38c6dc` |
| `--pse-good` / `--pse-warn` / `--pse-danger` | reported outcomes | `#146c43` / `#8a5200` / `#b3261e` | `#4cc38a` / `#e0a03a` / `#f2685c` |
| `--pse-brand-blade / -top / -side / -cut / -crest` | the emblem | per theme | per theme |

Rules:

- **Accent is never decoration.** It marks the current clause index, the current
  lifecycle phase, a live status, a focus ring, and the primary button. Nothing else.
- **Capacity colour is never interaction.** It marks capacity bars, meters and the
  BNB asset diamond.
- **Colour never carries meaning alone.** Every status states its word first; the
  colour only agrees.
- Light and dark are both first-class. No surface assumes dark.

## 5. Space and layout

- Measure: `--pse-measure: 1160px`, gutter `20px` (mobile) / `32px` (≥768px).
- Section rhythm: `padding-block: clamp(3rem, 6vw, 5.5rem)` with a full-measure
  `border-top` rule between sections and no rule above the first.
- Spacing is a small set of multiples of 4px. There are no one-off paddings.
- **Multi-column blocks are separated by rules, not gaps.** `pse-tools`,
  `pse-split` and `pse-capacity` all divide with `border-left`, and drop the rule
  when they collapse to one column.
- Borders are `1px`, plus `2px` for a section's or a rail step's top edge. There is
  no second border weight.
- Radii are `2–3px`. Nothing is a pill.

## 6. Components

| Component | Rule |
| --- | --- |
| Clause (`pse-section` + `pse-kicker`) | Numbered, rule above, rule running to the measure's edge. The index uses the accent. |
| Sheet (`pse-panel`) | `1px` border, `3px` radius, flat. Never a shadow. |
| Spec row (`pse-kv`, `pse-auth-fact`) | Term left, tabular figure right, hairline between. No leader dots. |
| Status tag (`pse-tag`) | Mono, uppercase, hairline border, 5px square dot. Word first. |
| Button (`pse-btn`) | `46px` minimum height, `2px` radius, Inter 500. `-quiet` is the secondary. `-ink` is reserved for an inverted action. |
| Field (`pse-input`) | `46px` minimum height, ruled, accent border on focus. |
| Meter (`pse-meter`) | `3px`, capacity colour. Only ever a real proportion of a real maximum. |
| Price list (`pse-tools`) | Four tiers as one ruled table with column rules — not four cards. |
| Instrument (`pse-stage-list`) | Six stations, each with a drawn glyph, index, name and one factual sentence. Carries no figure. |
| Lifecycle rail (`pse-rail`) | Five phases; the current one is marked by accent edge **and** the word "Current". |
| FAQ (`pse-faq`) | Ruled rows, drawn plus/minus, `aria-expanded` + `aria-controls`. |
| Loader (`pse-loader`) | Indeterminate rule, real stage, real escalation. See §8. |

## 7. Responsive

Verified at **390×844, 430×932, 768×1024, 1440×900**.

| Breakpoint | Behaviour |
| --- | --- |
| `≥560px` | Hero facts become two columns with an internal rule |
| `≥640px` | Instrument becomes 2 columns |
| `≥768px` | Lifecycle rail becomes 5 columns; footer becomes 2 columns |
| `≥900px` | Price list becomes 4 ruled columns |
| `≥1024px` | Auth splits into briefing + working column; instrument 3 columns; capacity and split blocks divide with a rule |
| `≥1280px` | Instrument becomes 6 columns |

Mobile is designed, not compressed: the auth briefing moves *below* the form so the
first input is reachable without scrolling past terms; the price list becomes a
stacked ruled list; the lifecycle rail becomes a vertical sequence.

Touch targets are `≥44px` everywhere, including masthead links, footer links and
inline "forgot password".

## 8. Loading, empty and failure

One loader for the whole product.

- **Indeterminate by construction.** No percentage, no filling bar, no "scanning",
  no invented mining activity, no fake diagnostics. The sweep says only "working,
  duration unknown".
- **The stage is real** (`session | identity | access | campaign | data`) and is
  passed in by the surface that knows it; the loader never guesses.
- **Escalation is honest.** At 8s it says it is slow. At 25s it stops implying a
  fast answer and offers a real retry or reload. Nobody is left with an unexplained
  spinner.
- **A retry exists only when there is something to retry** (`error.retryable`).
- **No skeleton screens**: a skeleton would promise a layout that has not been
  defined.
- A failure states which kind it is — refused, unavailable, or empty — and never
  substitutes a plausible-looking value.

## 9. Motion

- Only three things move: a `140ms` colour/border transition on controls, the
  loader's indeterminate sweep, and the crest's live pulse.
- No scroll reveal, no parallax, no counting numbers, no entrance choreography.
- `prefers-reduced-motion: reduce` removes all of it and leaves the loader a static
  partial bar, which still reads as "working".

## 10. Content rules

- **Only product language.** The interface never explains architecture, accounts,
  access resolution, routing, entitlements or how parts of the system relate. That
  belongs in developer documentation.
  - Removed in this rebuild: *"Separate product from PulseEarn — the sign-in
    identity is shared, the product access is not."*, *"PSEmine and PulseEarn share
    one sign-in identity and nothing else…"*, *"Product access: PSEmine / Not
    enrolled in PSEmine"*.
- **Only real figures.** Prices, rates, ownership limits, capacity ceilings and the
  capacity total come from the locked economics or the live campaign record.
- **No fabricated social proof**: no user counts, testimonials, earnings, payout
  history, blockchain activity or countdown urgency.
- **No financial promises**: no projection, no APY, no guaranteed return, no
  "profit". Capacity is a rate; settled earnings are what the service recorded.
- **Say what happened, then what to do.** Failures name their kind and their next
  step. Empty states state the fact and never invent a row.

## 11. Prohibited

Generic dark SaaS chrome · generic crypto dashboard · cyberpunk or terminal
aesthetics · glassmorphism · gradients · glow · drop shadows on public surfaces ·
decorative grids · fake charts · fake metrics · oversized typography · template
hero layouts · floating card stacks · pills · emoji as icons · colour as the sole
carrier of meaning · animation without meaning · invented logos · architecture copy
in the UI.

## 12. Known divergences (recorded, not fixed here)

- `src/types/psemine.ts` mirrors `QUOTE_EXPIRATION_MINUTES: 10` while the backend
  holds `QUOTE_TTL_MINUTES = 15`. The UI deliberately never prints a quote
  lifetime, so this cannot surface to a user. Pre-existing.
- `.agents/skills/ui-ux-pro-max/SKILL.md` references `references/quick-reference.md`
  and `references/pro-rules.md`, which the sync does not currently pull; only
  `SKILL.md` and `src/` are present. The searchable data in `src/data/*.csv` and
  `src/scripts/search.py` — the skill's actual database — is present and was used.
