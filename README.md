# Routing Algorithm Implementation — Virtual Lab

Virtual Lab (VLab) experiment page for **K J Somaiya School of Engineering**, covering
Distance Vector Routing (Bellman-Ford), Link State Routing (Dijkstra) and packet
forwarding, with three interactive client-side simulations.

Next.js (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Framer Motion, lucide-react.
No backend — every algorithm runs in the browser as a pure TypeScript module.

The visual design follows the **lab0.ai** design language. See [DESIGN.md](DESIGN.md) for the
extracted tokens and the section-by-section map; reference captures are in `design-ref/`.

---

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm run build        # production build (type-checks as part of the build)
npm start            # serve the production build
npm test             # Vitest unit tests for both routing algorithms
npm run test:watch   # the same tests in watch mode
```

Requires Node 18.18 or newer.

---

## Deploy to Vercel

Zero-config — no environment variables, no build settings to change.

1. Push this folder to a Git repository.
2. On [vercel.com/new](https://vercel.com/new), import it.
3. Vercel detects Next.js. Leave every field at its default and deploy.

Or from the CLI: `npx vercel` for a preview, `npx vercel --prod` for production.

---

## Design tokens

Everything lives in the `:root` block at the top of [`app/globals.css`](app/globals.css).
Tailwind utilities are generated from it through the `@theme inline` block just below.

### Colour

| Token | Value | Used for |
|---|---|---|
| `--background` | `#050807` | page background, near-black with a green tint |
| `--surface` | `#080d0a` | lifted alternating section bands |
| `--panel` | `#0a0f0d` | cards and panels |
| `--deep` | `#0a221a` | the deep-green conclusion + footer band |
| `--foreground` | `#f8f8f7` | headlines |
| `--muted-foreground` | `#ababaa` | body copy |
| `--dim` | `#8a9a92` | mono labels, table chrome |
| **`--accent-solid`** | **`#047958`** | **primary buttons, active underlines** |
| `--accent-bright` | `#34d399` | highlights, glow, focus rings, active graph edges |
| `--accent-deep` | `#163d2b` | chip fills, glass-tile gradients |
| `--paper` | `#c9dccf` | sage "document" cards |
| `--gold-from` / `--gold-to` | `#c8b27a` / `#8a7440` | the single champagne result card |
| `--border` | `#26362d` | the 1px hairline |
| `--ok` / `--warn` / `--danger` | `#34d399` / `#e0a83a` / `#e5484d` | simulation status |

### Type, radius, motion

Two families, both self-hosted — no CDN request at runtime, and exactly two font files download:

| Face | Token | Used for |
|---|---|---|
| **Satoshi** (variable, 300–900) | `--font-sans` | every heading and all UI/editorial text |
| **JetBrains Mono** | `--font-mono` | terminals, consoles, packet dumps, tables, numbers |

Satoshi lives at `public/fonts/satoshi-variable.woff2` and is declared in `app/globals.css`;
JetBrains Mono is self-hosted by `next/font`. See DESIGN.md for why Satoshi was chosen over
General Sans, and for the metric-matched fallback that keeps CLS at 0.

**The scale.** Nine tokens, defined once in `app/globals.css`. Components use the class and never
set a raw size, weight, tracking or leading:

| Token | Size | Weight | Tracking | Leading |
|---|---|---|---|---|
| `.t-display` | `clamp(44px, 9vw, 96px)` | 700 | −0.03em | 0.95 |
| `.t-h1` | `clamp(36px, 6vw, 64px)` | 700 | −0.025em | 1.05 |
| `.t-h2` | `clamp(26px, 4vw, 40px)` | 600 | −0.02em | 1.15 |
| `.t-h3` | 20px | 600 | −0.01em | 1.3 |
| `.t-lead` | `clamp(18px, 2.4vw, 24px)` | 400 | 0 | 1.5 |
| `.t-body` | 16px | 400 | 0 | 1.6 |
| `.t-small` | 14px | 400 | 0 | 1.5 |
| `.t-label` | 12px | 500 | 0.18em | 1.2, UPPERCASE |
| `.t-pill` | 11px | 500 | 0.16em | 1, UPPERCASE |

Plus `.mono` (JetBrains Mono + tabular numerals), `.measure-lead` (34ch) and `.measure-body` (68ch).

To change the type scale, edit those rules — nothing else in the codebase carries a font size.


### Changing the accent colour

Edit **one line**:

```css
/* app/globals.css */
:root {
  --accent-solid: #047958;   /* ← primary buttons, tab underlines, solid fills */
  --accent-bright: #34d399;  /* ← highlights, glow, focus rings, active graph edges */
}
```

`--primary` and `--ring` are aliases of these, so buttons, focus rings, active tabs, the
simulation graph strokes, the console tags and the quiz selection all move together. Two further
places hardcode the hue for a canvas/WebGL context that cannot read CSS variables — update them to
match if you change the accent:

- `components/site/SilkRibbon.tsx` — the `deep` / `green` / `lit` vec3s in the fragment shader.
- `components/site/DotMatrixCube.tsx` — the two `ctx.fillStyle` rgba values.

### Other things you may want to change

| What | Where |
|---|---|
| Typeface or type scale | `public/fonts/` + the `@font-face` and `.t-*` rules at the top of `app/globals.css` |
| Experiment number, title, aim, institution | `lib/config.ts` (`EXPERIMENT_NUMBER`) |
| Logo image | `public/somaiya-logo.png` (the Somaiya Vidyavihar mark, white knocked out to transparent); also `app/icon.png` / `app/apple-icon.png` for the tab icon. Path in `lib/config.ts` |
| Quiz questions, answers, explanations | `data/quiz.ts` |
| Default network | `defaultGraph()` in `lib/routing/graph.ts` (update `tests/` alongside) |
| Reference implementations (C/C++/Python/Java) | `data/implementations.ts` |

---

## Project layout

```
app/
  layout.tsx            fonts, metadata, Sonner toaster
  page.tsx              server component: runs shiki, then composes the sections
  globals.css           design tokens, materials, keyframes, reduced-motion rules

lib/
  config.ts             experiment number, title, aim, institution
  highlight.ts          shiki, build-time only — never ships to the client
  utils.ts              cn()
  useReducedMotionSafe.ts
  routing/              UNTOUCHED by the restyle
    graph.ts            graph model, default network, INFINITY_COST (16, RIP-style)
    table.ts            RouteRow, shortest-path tree → routing table
    dijkstra.ts         LSP flooding trace + Dijkstra trace
    distanceVector.ts   distributed Bellman-Ford, split horizon, poison reverse
    forwarding.ts       hop-by-hop forwarding, drop and loop detection

components/
  site/                 Navbar, Hero, SilkRibbon, HeroRouting, Aim, ScrollStory, GlowConnector,
                        ProductWindow (+ PaperCard, GoldCard, SourceCard), TwoWays,
                        ProtocolCarousel, PhaseBand, QuizDialog, Simulations,
                        Conclusion, DotMatrixCube, Footer, Logo, CodeViewer, primitives
    story/              theoryContent, illustrations, MiniGraph
  sims/                 GraphCanvas, DiagnosticConsole, Pseudocode, SimUI,
                        useGraphEditing, DijkstraSim, DistanceVectorSim, ForwardingSim
  ui/                   shadcn components
  Icon.tsx              name → lucide shim for the simulations' dynamic icons

data/                   quiz.ts, implementations.ts          (UNTOUCHED)
tests/                  dijkstra, distanceVector, forwarding (UNTOUCHED)
design-ref/             lab0.ai reference captures at 1440px and 390px
```

### Design rule

The algorithms are **pure functions that return a trace** — an array of immutable snapshots. The
components only replay a trace; no component contains routing logic. The scroll-story
illustrations derive every number the same way, so the figures on the page cannot drift from the
simulations.

---

## Expected results (default network)

Dijkstra from **A**:

| Destination | Next Hop | Cost | Path |
|---|---|---|---|
| B | C | 3 | A→C→B |
| C | C | 2 | A→C |
| D | C | 8 | A→C→B→D |
| E | C | 10 | A→C→B→D→E |
| F | C | 13 | A→C→B→D→E→F |

Distance Vector converges to identical costs and next hops after 5 rounds. `tests/` asserts this,
the converged Bellman-Ford tables for **every** router, and count-to-infinity on the A–B–C chain
(costs climb to the cap of 16 unprotected; one round with split horizon on).

The four reference programs in `data/implementations.ts` print the same table and compile clean
under `gcc -Wall`, `g++ -std=c++17 -Wall`, `python3` and `javac`.

---

## Quality

Measured on the production build (`npm run build && npm start`):

- Lighthouse desktop: **performance 99, accessibility 100, best practices 96**
  (FCP 0.3s, LCP 0.9s, TBT 10ms, CLS 0).
- No horizontal overflow at 390, 768, 1024 or 1440px.
- Keyboard reachable throughout, with a 2px emerald focus ring; body and heading text clear AA.
- `prefers-reduced-motion` respected, and the reduced-motion render is hydration-safe.
- The shader, hero network, carousel, cube and all three simulations are lazy-loaded.
- The hero animation (`components/site/HeroRouting.tsx`) loops the real experiment on the real
  default network — flooding, the Dijkstra tree, packets to F at cost 13, the D–E link failing, and
  the reroute at cost 14 — all computed from `lib/routing`, so it cannot drift from the lab.
