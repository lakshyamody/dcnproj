# Design system — Routing VLab

A restyle of the existing Routing Algorithm VLab to the **lab0.ai** design language.
Presentation layer only: `lib/routing/`, `data/` and `tests/` are untouched.

> **On the reference material.** The brief pointed at `/design-ref/01-hero.png … 10-cta-footer-cube.png`.
> That folder did not exist in the project or anywhere on this machine, so the tokens below were
> extracted from **lab0.ai itself** — loaded in headless Chromium at 1440px and 390px, reading
> `getComputedStyle` off the live DOM. The frames captured during that pass are checked in under
> `design-ref/` (`d-01…d-12` desktop, `m-01…m-08` mobile, `d-nav-dropdown` for the blur state) so the
> comparison is reproducible. Every number in this document is measured, not eyeballed.

We copy the **design language**. None of lab0's assets, marks, copy or artwork are used: no `>_`
glyph, no cube render, no YC badge, no partner logos. Our hero ribbon is a fragment shader we wrote,
our footer object is a canvas dot-matrix cube we wrote, and every icon is lucide.

---

## 1. Tokens

### 1.1 Colour

Measured from lab0.ai unless noted. Hex is what we ship.

| Role | Measured | Ships as | Notes |
|---|---|---|---|
| Page background | `rgb(5,8,7)` | `#050807` | near-black, faint green tint |
| Section (lifted) | `rgb(8,13,10)` | `#080d0a` | alternating bands |
| Card / panel | — | `#0a0f0d` | panels inside sections |
| Deep-green CTA band | `rgb(10,34,26)` | `#0a221a` | the footer/CTA shift |
| Hairline border | `rgb(38,54,45)` | `#26362d` | the workhorse 1px |
| Border (translucent) | `rgba(139,178,154,0.19)` | same | navbar, glass tiles |
| Foreground | `rgb(248,248,247)` | `#f8f8f7` | headlines |
| Muted foreground | `rgb(171,171,170)` | `#ababaa` | body copy |
| Dim | — | `#8a9a92` | labels, table chrome — lifted from `#6b7a72` to clear AA on the deep-green band |
| **Accent (solid)** | `rgb(4,121,88)` | **`#047958`** | primary buttons, underlines |
| Accent bright | — | `#34d399` | highlights, glow, active lines |
| Accent deep | — | `#163d2b` | chip fills, tile gradients |
| Paper (sage) | — | `#c9dccf` | "document" cards, dark text on top |
| Gold / champagne | — | `#c8b27a → #8a7440` | the single "result" card |

The whole theme keys off **one** variable, `--accent` in `app/globals.css`. Changing it moves the
buttons, focus rings, glow, active tabs, chart strokes and console tags together.

### 1.2 Type

**Family: Satoshi** (Fontshare), self-hosted as a single variable woff2 (300–900, 42 KB) in
`public/fonts/`. Chosen over General Sans by rendering the reference headline
"Full-Stack Encapsulation." in both at matched cap height and measuring against
`design-ref/typography-ref.png`:

| Metric | Reference | Satoshi | General Sans |
|---|---|---|---|
| "Full-Stack" width ÷ cap height | 6.175 | **5.909** | 6.560 |
| hyphen midpoint ÷ cap height | 0.368 | **0.365** | 0.382 |
| hyphen thickness ÷ cap height | 0.158 | **0.148** | 0.214 |

Satoshi wins on the low-slung hyphen — both its height and, decisively, its weight: General Sans's
hyphen is a third thicker than the reference's. Visually General Sans is also far denser at 700,
with smaller counters and tighter apertures, where the reference and Satoshi share the circular
`a` bowl, flat terminals and open-but-tight aperture. The bake-off render is
`design-ref/` alongside the reference.

Stack: `'Satoshi', 'Satoshi Fallback', 'General Sans', ui-sans-serif, system-ui, sans-serif`.
General Sans stays in the stack as a named local fallback but is not shipped — exactly one sans and
one mono are downloaded.

**Mono: JetBrains Mono**, self-hosted by `next/font`, for terminal output, command text, packet
dumps, table data and every number-heavy control. `.mono` sets `font-variant-numeric: tabular-nums`
and resets letter-spacing so mono data never inherits a heading's negative tracking.

#### The scale

Defined once in `app/globals.css`. Components use the token classes and never set a raw
`font-size`, `font-weight`, `letter-spacing` or `line-height`.

| Token | Size | Weight | Tracking | Leading | Use |
|---|---|---|---|---|---|
| `.t-display` | `clamp(44px, 9vw, 96px)` | 700 | −0.03em | 0.95 | hero headline |
| `.t-h1` | `clamp(36px, 6vw, 64px)` | 700 | −0.025em | 1.05 | section headings |
| `.t-h2` | `clamp(26px, 4vw, 40px)` | 600 | −0.02em | 1.15 | sub-sections, the aim statement |
| `.t-h3` | 20px | 600 | −0.01em | 1.3 | card titles, wordmark |
| `.t-lead` | `clamp(18px, 2.4vw, 24px)` | 400 | 0 | 1.5 | hero subline, section intros |
| `.t-body` | 16px | 400 | 0 | 1.6 | paragraphs |
| `.t-small` | 14px | 400 | 0 | 1.5 | captions, nav, table and console text |
| `.t-label` | 12px | 500 | 0.18em | 1.2 | UPPERCASE eyebrows, panel headers |
| `.t-pill` | 11px | 500 | 0.16em | 1 | UPPERCASE badges |

`.h-hero`, `.h-section`, `.h-card` and `.eyebrow` are kept as aliases of `.t-display`, `.t-h1`,
`.t-h3` and `.t-label` so existing markup resolves through one definition.

Measures: `.measure-lead` (34ch) on centred leads, `.measure-body` (68ch) on left-aligned body.

**Rules in force.** Negative tracking only at 26px and up, never on body. Headlines end in a full
stop. Only eyebrows, badges and panel headers are uppercase — never a heading or a paragraph.
Hierarchy is weight and grey, not colour: `#fafafa`-class foreground against `#ababaa` muted.

#### Loading

One preload (`<link rel="preload" as="font">`) for the variable woff2, `font-display: swap`, and a
two-face metric-matched fallback:

```css
@font-face { font-family: "Satoshi Fallback"; src: local("Arial"); font-weight: 300 550;
             size-adjust: 92.28%; ascent-override: 97.53%; descent-override: 27.09%; }
@font-face { font-family: "Satoshi Fallback"; src: local("Arial Bold"); font-weight: 551 900;
             size-adjust: 91.24%; ascent-override: 98.64%; descent-override: 27.40%; }
```

Two faces, not one: a single `local()` face ignores the requested weight and renders bold headlines
at regular width, an 8.7% error. Split at 550 each face tracks Satoshi's advance width to within
~1%. Measured CLS is **0** — with the preload the fallback never paints, so there is no swap to
shift.


### 1.3 Radius, borders, elevation

- `--radius: 0.75rem` (12px). Navbar `8px`; pills `9999px`; windows `12px`.
- Borders are always **1px**. Never 2px, never a heavier "focus" border — focus is a ring.
- Elevation is glow + deep soft shadow, never a grey drop shadow:
  - card: `inset 0 1px 0 rgba(221,255,229,.07), 0 12px 32px rgba(0,0,0,.33)`
  - window: `inset 0 1px 0 rgba(227,255,242,.16), 0 24px 60px rgba(0,0,0,.33)`
  - paper: `inset 0 1px 0 rgba(241,255,244,.69), 0 16px 48px rgba(0,0,0,.33)`
  - accent glow: `0 0 14px rgba(4,121,88,.53)` (strong), `0 0 10px rgba(4,121,88,.27)` (soft)

### 1.4 Spacing

8px base. Section rhythm `py-24` mobile → `py-32` desktop. Content max width `1280px`
(the navbar measures exactly 1280 at 1440 viewport, inset 20px from the top). Gutters 20px mobile,
32px desktop.

### 1.5 Motion

Calm and slow. Everything ease-out.

| Thing | Duration | Easing |
|---|---|---|
| Fade + rise on enter | 600ms | `cubic-bezier(.22,1,.36,1)` |
| Crossfade between story steps | 450ms | ease-out |
| Number count-up | 800ms | ease-out |
| Dash flow along connectors | 2.4s | linear, infinite |
| Hover nudge (arrow) | 200ms | ease-out |
| Dropdown open + page blur | 250ms | ease-out |

`prefers-reduced-motion: reduce` kills the shader (static gradient), the dash flow, the carousel
rotation, the cube rotation and the count-up (numbers snap to final), and collapses every transition
to ~0ms. Handled by `useReducedMotionSafe()` plus a global CSS block — the hook reports `false` on
the server and first client render so hydration never diverges.

---

## 2. Section map — lab0 pattern → our content

| # | lab0 pattern (frame) | Our section | What carries over |
|---|---|---|---|
| 1 | Floating navbar (all) | `Navbar` | 1280px inset pill, `rgba(5,12,8,.94)` + `blur(24px)`, 8px radius, hairline. Logo tile + mono wordmark `vlab` + `.routing` in emerald. NavigationMenu dropdowns: **Theory** (Distance Vector, Link State, Packet Forwarding, Implementation), **Simulations** (Dijkstra, Distance Vector, Packet Forwarding), **Tests** (Pre-Test, Post-Test); links Aim, Conclusion; CTA "Start Lab". Open dropdown dims + blurs the page (`rgba(0,0,0,.2)` + `blur(7px)`, measured). Mobile → Sheet. |
| 2 | Hero, left text + silk ribbon right (`d-01`, `m-01`) | `Hero` | Pill badge = Somaiya logo + "K J Somaiya School of Engineering · Experiment 08" (number stays in `EXPERIMENT_NUMBER`). h1 "Routing algorithm implementation". Primary "Start the simulation →", text link "Read the theory ↓". Right half: the **live lab network** (`HeroRouting`) over **our** WebGL silk ribbon, which drops to 55–70% opacity and becomes atmosphere. Mobile: silk full-bleed behind the text, network stacked below the buttons so its top edge peeks above the fold. |
| 3 | — (our addition, same language) | `Aim` | Centred statement, mono `AIM` label, hairline dividers above and below. |
| 4 | Pinned scroll-story with bottom tab bar (`d-03`–`d-06`) | `ScrollStory` | Section pins, four steps crossfade. Emerald mono number + title, two-tone subhead left, muted description right, mini product-UI illustration below. Bottom tabs with emerald underline + "Scroll to follow the flow ↓". Steps: 01 Distance Vector, 02 Link State, 03 Forwarding, 04 Implementation. All existing theory text lives under a "Full theory" Accordion per step. Mobile: unpins and stacks. |
| 5 | Puzzle tiles + glowing chip rows (`d-08`) | `TwoWays` | Big heading, hairline divider, two rows (title left / description + diagram right). Row 1 three glassy puzzle tiles Neighbour–Router–Neighbour. Row 2 LSP labels → glowing emerald `dijkstra >>` chip → flowing dashes → check-circles. Then the full DVR vs LSR comparison as a shadcn Table. |
| 6 | 3D platform tile carousel (`d-09`) | `ProtocolCarousel` | Centred heading "Built on the protocols the Internet runs on.", muted subline, perspective carousel of glassy dark-green tiles on a curved track with diagonal sheen and under-glow. Mono text only: RIP, RIPv2, OSPF, IS-IS, EIGRP, BGP, each with a `DV`/`LS`/`PV` tag. "Read the RFCs ↗". |
| 7 | — (band, uses card language) | `PhaseBand` (pre) | Bordered panel, `PHASE 1 · BASELINE ASSESSMENT`, two-tone heading, primary button → quiz Dialog. |
| 8 | "One connected record" heading + big dark window (`d-10`) | `Simulations` | Heading left / muted paragraph right, then one large `ProductWindow` with Tabs for the three sims. Window = title bar + traffic lights + tabs. Canvas gets a wireframe dot-grid, thin-outline nodes, hairline edges, mono weight pills, emerald active path. Sonner toasts for "Converged in N rounds" / "Link B–C failed". |
| 9 | same band | `PhaseBand` (post) | `PHASE 2 · VERIFICATION ASSESSMENT`. |
| 10 | CTA on deep green + footer with dot object (`d-12`) | `Conclusion` + `Footer` | Background gradients from `#050807` to `#0a221a`. Two-line statement, existing conclusion paragraph, "Experiment complete ✓" button → scroll to top + toast. Footer: bordered two-column grid, our canvas dot-matrix cube (emerald dots, faces show a node-edge-node graph / an arrow / a table grid), tagline right, letter-spaced LAB / RESOURCES / INSTITUTE columns, mono © row. |

### The hero's routing animation

lab0's hero graphic is pure atmosphere, which is right for them and wrong for a lab about routing —
a visitor could read the whole first screen and learn nothing about the subject. `HeroRouting` fixes
that without leaving the design language: a wireframe canvas in the same emerald, hairline and mono
vocabulary as the simulations, layered over the silk.

It loops through the actual experiment, on the actual default network, driven by
`lib/routing` at module load — nothing is choreographed by hand:

| Beat | Source of truth | Caption |
|---|---|---|
| Link states flood outward from A | BFS hop distance over `defaultGraph()` | `flooding link states · 6 routers` |
| Shortest-path tree lights up, node by node | `runDijkstra(G, "A")`, in its real finalisation order A, C, B, D, E, F | `dijkstra · shortest-path tree from A` |
| Packets travel to F | `forwardPacket(...)` → `A→C→B→D→E→F`, cost 13 | `forwarding A → F · … · cost 13` |
| D–E fails, flickers red, marked × | `setEdgeWeight(G, "D-E", INFINITY_COST)` | `link D–E down · tables stale` |
| Traffic reroutes | `runDijkstra` / `forwardPacket` on the broken graph → `A→C→B→D→F`, cost 14 | `rerouted · … · cost 14` |

Edge costs are drawn as mono pills so it reads as a *weighted* graph. If the default network ever
changes, the hero changes with it. Under `prefers-reduced-motion` it draws one settled frame with
the tree complete and never starts the loop, and it stops drawing entirely when scrolled out of
view.

### Two deliberate content decisions

- **Step 01's three source cards.** The reference composition wants three inputs feeding the
  document card. Router **A** only has two neighbours (B and C), so a third card labelled
  "Vector from D" would teach something false. The third card is **"Local links at A"** (`B 4`,
  `C 2`) instead: the rhythm is preserved and the arithmetic on screen is real —
  `D = min(4+5 via B, 2+6 via C) = 8 via C`, `F = min(4+10, 2+11) = 13 via C`.
- **Step 03's counters.** The brief sketched "Hops 4". The true answer on the default network is
  **5 hops** (`A→C→B→D→E→F`) at cost 13 with 5 tables read, and every number in the illustration is
  computed at render time from `lib/routing`, never typed in.

### Patterns extracted as components

- **ProductWindow** — dark panel, hairline, 12px radius, title bar (tiny title left, three traffic-light dots right), optional tab strip. Used by story steps 02/03/04 and by the whole simulation section.
- **PaperCard** — sage `#c9dccf` document card with dark text and a bright inset top edge. The "routing table" and "LSDB" cards.
- **GlowConnector** — curved SVG path, static hairline + an animated emerald dash layer flowing source → target, plus a soft radial glow at the target.
- **GoldCard** — the one champagne gradient card, reserved for the single "result" highlight (`Next hop resolved · A → F`).
- **StatColumn / CountUp** — mono label + large number that counts up on enter.
- **TwoTone** — the white/grey two-line subhead.

---

## 3. What we deliberately did *not* copy

- lab0's wordmark, `>_` terminal glyph, YC badge, partner logos, cube artwork and all copy.
- Inter (we consolidate on Space Grotesk + JetBrains Mono).
- Light mode: dark only, as the brief permits.
