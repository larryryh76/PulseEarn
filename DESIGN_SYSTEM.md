> **Scope:** the PSEmine public and authentication surfaces (`/mine`,
> `/mine/login`, `/mine/signup`, `/mine/forgot-password`, `/mine/verify-email`),
> the product loader and the brand mark. Not an authority over PulseEarn, and not
> a restatement of the synced skill library — `.agents/` remains the source
> material.

# PSEmine Design System

## 1. Direction

**A disciplined financial/wallet product.** PSEmine sells a bounded, dated earning
instrument, so it is presented the way a serious financial product is: one
primary axis, dense figures inside generous frames, one functional accent, and
rhythm from tonal bands.

### Composition before decoration

The page is built from four devices and nothing else:

1. **Bands** — paper, tint, ink. Rhythm comes from tone changes, not from borders.
2. **One measure** — a 1120px shell; prose never exceeds ~62ch.
3. **Rules** — a single hairline weight, used *inside* dense data, plus a 2px
   accent edge where a section is genuinely a sequence.
4. **Two type roles** — Inter for language, JetBrains Mono (tabular) for data.

**There are exactly two real cards in the whole public product:** the hero
product specimen and the tool family. Everything else is type, rules and band
tone. This is the single rule that prevents the failure this system was written
to correct — an earlier pass made every element a bordered box, and another put
campaign statistics on the sign-in page.

### Why the two earlier directions failed

| Attempt | What it got wrong |
| --- | --- |
| 1 | An ink-and-hairline ledger in a teal that had no relationship to the product's own mark, wearing a placeholder logo. Restraint, but no identity. |
| 2 | Recovered the identity, then (a) put campaign statistics, tool prices, capacity ceilings and referral terms **on the sign-in page**, and (b) wrapped nearly every block in a bordered panel. Identity without composition. |

## 2. Page content contracts

**The hardest rule in this document.** A route may contain only what belongs to
it. Verified against the rendered DOM on every route (`scripts` harness; see §12).

### `/mine` — PUBLIC LANDING ONLY
- **Allowed** brand, proposition, explanation, tool family, capacity, campaign
  lifecycle, payment, settlement and payout, security and transparency, FAQ, CTA.
- **Banned** any wallet balance, mining balance, referral count, transaction or
  payout history, personal capacity, account setting, private wallet address,
  console or admin control, internal architecture, access/entitlement
  explanation, fabricated activity or statistics.
- The only live figure is the campaign's own **public** record, and the object
  that shows it is labelled *"Product specimen … not your account"*.

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
is on, it is removed — never relocated, duplicated or replaced.

## 3. Brand

The mark is **recovered, not invented**: the faceted PSE emblem that was live
across the shell, console, public page and authentication family immediately
before the first design purge (`38d7a5f:src/components/psemine/PSEBrand.tsx`).
Geometry unchanged — five facets on one diagonal: an electric-blue blade, a light
upper facet notched by an inner cut, a steel side facet, a cyan crest.

Only its implementation changed: `--pse-brand-*` tokens resolved per theme
instead of hard-coded dark hexes; `aria-hidden` instead of an empty `role="img"`
label; a `mono` treatment for single-colour contexts. The favicon
(`public/psemine-mark.svg`) is the same facets on a solid ink plate, because a
transparent emblem loses its light facet against light browser chrome.

- **One mark, no competing identities.** Hero, auth, navigation, mobile, favicon.
- **The crest is the only part that animates**, and only to state a running
  campaign. Disabled under reduced motion.
- The mark's **cyan is brand-only**. It is never used as an interface colour.

## 4. Typography

| Role | Family | Used for |
| --- | --- | --- |
| Language | **Inter** | headings, prose, buttons, field labels |
| Data | **JetBrains Mono**, `tnum` | every rate, price, date, day count, address, hash, clause index, column head, term label, status tag |

Both are already loaded by `index.html`; this adds no font request.

- **Authority comes from size and tracking, not weight.** Display and h2 are
  **weight 400**, never 600+. Display tracking is `-0.03em`; h2 `-0.024em`.
- **Body carries slight positive tracking** (`0.003em`), which reads airier at
  16px and contrasts with the tight display sizes.
- Scale: display `clamp(2rem, 1.35rem + 2.6vw, 3.25rem)` · h2
  `clamp(1.5rem, 1.28rem + .9vw, 2rem)` · h3 `.9375rem` · lead
  `clamp(1.0625rem, 1rem + .25vw, 1.1875rem)` · body `1rem` · small `.875rem` ·
  label `.75rem` (mono, `0.09em`, uppercase).
- Every figure carries `font-variant-numeric: tabular-nums`.
- Headings use `text-wrap: balance`; prose uses `pretty`.
- Field labels are **plain** (13px/500 Inter), not mono-uppercase: a label is
  language, not data.

## 5. Colour

| Token | Job | Light | Dark |
| --- | --- | --- | --- |
| `--pse-paper` | page | `#ffffff` | `#0b0d11` |
| `--pse-band` / `--pse-band-2` | tint band, deeper tint | `#f6f7f9` / `#eef0f3` | `#12141a` / `#171a21` |
| `--pse-ink-bg` | ink band | `#0d0f13` | `#05070a` |
| `--pse-ink` / `-2` / `-3` | primary, secondary, label ink | `#101318` / `#5c6572` / `#616977` | `#f2f4f7` / `#a7afbb` / `#8a93a1` |
| `--pse-rule` / `-2` / `-strong` | structure | `rgba(16,19,24,.13 / .075 / .28)` | `rgba(255,255,255,.16 / .08 / .3)` |
| `--pse-accent` | **interaction only** | `#1e4fd8` | `#6b93ff` |
| `--pse-good` / `-warn` / `-danger` | reported outcomes | `#146c43` / `#8a5200` / `#b3261e` | `#4cc38a` / `#e0a03a` / `#f2685c` |

- **Accent is never decoration.** It marks the clause index, the current lifecycle
  phase, a live status, a focus ring, capacity bars and the primary button.
- **One accent.** No second interface hue. (The retired cyan capacity colour is
  brand-only now, which is why the interface reads calmer.)
- **Text ink is near-black with a cool cast**, never pure `#000`.
- **Label ink is set to clear WCAG AA (4.5:1) on paper, the tint band and the
  deeper tint**, because it is used at 11–12px.
- **The ink band re-maps the token set for its own subtree**, so every descendant
  — headings, prose, rules, tags, buttons — adapts without a single override.
- Light and dark are both first-class.

## 6. Space, radius, elevation

- Shell `1120px`; gutters 20 / 32 / 40px at 0 / 768 / 1120px.
- **Section rhythm:** `padding-block: clamp(56px, 7.5vw, 104px)`.
- **Sections are separated by space and band tone — never by a rule between every
  pair.** A rule between each section is what turns a page into a stack of boxes.
- Radii: **12px** controls, cards and the specimen; 6px tags. Never a pill.
- **Whisper-only elevation:** one shadow in the entire public surface, on the hero
  specimen (`0 4px 24px rgba(16,19,24,.05)`). Everything else is flat.
- Borders are 1px, plus a 2px top edge on a stage or rail step.

## 7. Components

| Component | Rule |
| --- | --- |
| Band (`pse-band--tint` / `--ink`) | Full-width tone change. The only rhythm device. |
| Section head (`pse-head`) | Kicker (index + name) → h2 → optional lede, capped at 46ch/62ch. |
| Card (`pse-card`) | Two exist. 1px border, 12px radius, head/body/foot strips. |
| Spec row (`pse-row`) | Term left, tabular figure right, hairline between. **Proportional columns, both may wrap** — an `auto` figure column clips the term at 390px. |
| Tool family (`pse-tools`) | One ruled table, four members. Shared grammar: the same unit drawing with tier-many filled bays (`PseTierMark`), plus the Elite's continuous crest. Not four cards. |
| Capacity bar (`pse-bar`) | 4px, accent, only ever a real proportion of a real maximum. |
| Input (`pse-input`) | 48px, 12px radius, accent border plus a 3px accent-quiet ring on focus. |
| Password control | Toggle inside the field so the field never grows; 44px target. |
| Field error | Printed under **its own** field, `role="alert"`, referenced by `aria-describedby`, and focus moves to the first invalid field. |
| Tag (`pse-tag`) | Mono, uppercase, 6px radius, dot. The **word** carries the meaning. |
| FAQ (`pse-faq`) | Ruled rows, drawn plus/minus, `aria-expanded` + `aria-controls`. |

## 8. Authentication composition

**One column, one axis. No split screen.** A panel wide enough to be worth its
space would have to carry campaign terms to fill it, and a sign-in page must
contain only authentication.

```
[ PSEmine ]                                  About PSEmine
─────────────────────────────────────────────────────────
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
─────────────────────────────────────────────────────────
  🔒 PSEmine never asks for your private key or seed phrase.
```

Form column `384px`, fields 48px, primary action 48px full-width. At 390×844 the
bar, heading, welcome line, both fields and the primary action are all above the
fold.

## 9. Loader

**An application state, not a page.** Identity, one honest sentence, three dots.

| State | Presentation |
| --- | --- |
| `session` | "Preparing your account" |
| `identity` | "Confirming your identity" |
| `access` | "Checking your access" |
| `campaign` | "Loading campaign state" (inline, in a panel that is re-reading) |
| `data` | "Loading your account" |
| failure | `PseLoadFailure`: the real title and message, retry only when `error.retryable` |
| verification required | **not a loader** — the route guard navigates |
| onboarding required | **not a loader** — the route guard navigates |

No percentage, no filling bar, no scan, no terminal, no counter, no fake
diagnostics. Escalation is honest: after 8s it says the wait is longer than usual;
after 25s it offers a real retry or reload.

## 10. Motion

Three moving things only: a 140ms colour/border transition on controls, the
loader dots, and the crest's live pulse. No scroll reveal, no parallax, no
counting numbers. `prefers-reduced-motion: reduce` stops all of it and leaves the
dots static.

## 11. Prohibited

Generic dark SaaS · generic crypto dashboard · cyberpunk or terminal aesthetics ·
glassmorphism · gradients · glow · drop shadows beyond the one specimen shadow ·
decorative grids · fake charts · fake metrics · a percentage or progress bar for
an unknown duration · billboard-scale display type · pill buttons · emoji as
icons · a bordered box around every block · centred everything · colour as the
sole carrier of meaning · animation without meaning · invented logos ·
architecture copy in the UI · **any content on a route where it does not belong.**

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
