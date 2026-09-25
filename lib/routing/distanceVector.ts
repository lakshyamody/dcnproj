/**
 * Distance Vector Routing (distributed Bellman-Ford).
 *
 * Every router keeps one distance vector: its current cost to every
 * destination plus the next hop it would use. Once per period it hands that
 * vector to its *direct neighbours only*, and applies the Bellman-Ford update
 *
 *     D(x, y) = min over neighbours v of { c(x, v) + D(v, y) }
 *
 * Costs are capped at INFINITY_COST (16) exactly as RIP does, which is what
 * stops count-to-infinity from running forever.
 *
 * Pure functions returning a trace of immutable snapshots; the UI replays it.
 */

import {
  Graph,
  INFINITY_COST,
  NodeId,
  linkCost,
  neighbours,
  nodeIds,
} from "./graph";
import { RouteRow } from "./table";

export interface DVCell {
  cost: number;
  /** Next hop. `null` when unreachable; the router itself for its own entry. */
  via: NodeId | null;
}

/** One router's distance vector, keyed by destination. */
export type DVVector = Record<NodeId, DVCell>;

/** Every router's vector, keyed by the router that owns it. */
export type DVTables = Record<NodeId, DVVector>;

export interface DVOptions {
  /** Do not advertise a route back to the neighbour it was learned from. */
  splitHorizon: boolean;
  /** Advertise such routes with cost = infinity instead of omitting them. */
  poisonReverse: boolean;
}

export const DV_DEFAULT_OPTIONS: DVOptions = {
  splitHorizon: false,
  poisonReverse: false,
};

export interface DVChange {
  router: NodeId;
  dest: NodeId;
  before: DVCell;
  after: DVCell;
}

export interface DVExchange {
  from: NodeId;
  to: NodeId;
  /** What `from` actually put on the wire, after split horizon / poisoning. */
  advertised: Record<NodeId, number>;
  /** Destinations suppressed by split horizon. */
  suppressed: NodeId[];
}

export interface DVRoundStep {
  round: number;
  tables: DVTables;
  changes: DVChange[];
  exchanges: DVExchange[];
  messages: string[];
  converged: boolean;
}

export const DV_PSEUDOCODE = [
  "// Runs on every router x, once per update period",
  "initialise:",
  "    for each destination y:",
  "        if y = x:            D(x, y) ← 0,        next[y] ← x",
  "        else if y is a direct neighbour: D(x, y) ← c(x, y), next[y] ← y",
  "        else:                D(x, y) ← ∞,        next[y] ← nil",
  "",
  "every update period:",
  "    send vector D(x, ·) to each neighbour v      // neighbours only",
  "",
  "on receiving vector D(v, ·) from neighbour v:",
  "    for each destination y ≠ x:",
  "        alt ← c(x, v) + D(v, y)                   // Bellman-Ford",
  "        if alt < D(x, y):",
  "            D(x, y) ← min(alt, INFINITY)",
  "            next[y] ← v",
  "    if any entry changed: advertise the new vector",
] as const;

function clampCost(cost: number): number {
  if (!Number.isFinite(cost) || cost >= INFINITY_COST) return INFINITY_COST;
  return cost;
}

function unreachable(cost: number): boolean {
  return cost >= INFINITY_COST;
}

function fmt(cost: number): string {
  return unreachable(cost) ? "∞" : String(cost);
}

/** Initial vectors: self = 0, direct neighbours = link cost, everything else = infinity. */
export function initDVTables(graph: Graph): DVTables {
  const ids = nodeIds(graph).sort();
  const tables: DVTables = {};
  for (const x of ids) {
    const vec: DVVector = {};
    for (const y of ids) {
      if (y === x) {
        vec[y] = { cost: 0, via: x };
        continue;
      }
      const direct = linkCost(graph, x, y);
      vec[y] = Number.isFinite(direct)
        ? { cost: direct, via: y }
        : { cost: INFINITY_COST, via: null };
    }
    tables[x] = vec;
  }
  return tables;
}

/**
 * What neighbour `from` puts on the wire towards `to`.
 * Split horizon and poison reverse are applied here, because that is where
 * they live in a real protocol: on the sender's outbound interface.
 */
export function advertisementFor(
  from: NodeId,
  to: NodeId,
  tables: DVTables,
  opts: DVOptions,
): DVExchange {
  const advertised: Record<NodeId, number> = {};
  const suppressed: NodeId[] = [];
  const vec = tables[from] ?? {};

  for (const dest of Object.keys(vec).sort()) {
    const cell = vec[dest];
    const learnedFromTarget = cell.via === to && dest !== to;
    if (learnedFromTarget) {
      if (opts.poisonReverse) {
        // Poison reverse: say it explicitly, "I cannot reach y" - faster and safer.
        advertised[dest] = INFINITY_COST;
      } else if (opts.splitHorizon) {
        // Plain split horizon: stay silent about it.
        suppressed.push(dest);
      } else {
        advertised[dest] = cell.cost;
      }
    } else {
      advertised[dest] = cell.cost;
    }
  }
  return { from, to, advertised, suppressed };
}

function sameCell(a: DVCell, b: DVCell): boolean {
  return a.cost === b.cost && a.via === b.via;
}

/**
 * One synchronous exchange round: every router advertises simultaneously, then
 * every router recomputes its vector from the vectors it just received.
 */
export function dvRound(
  graph: Graph,
  tables: DVTables,
  opts: DVOptions,
  round: number,
): DVRoundStep {
  const ids = nodeIds(graph).sort();
  const exchanges: DVExchange[] = [];
  const messages: string[] = [];
  const changes: DVChange[] = [];

  // Phase A: everyone sends, using the vectors from the end of the last round.
  for (const x of ids) {
    for (const v of neighbours(graph, x)) {
      exchanges.push(advertisementFor(x, v, tables, opts));
    }
  }
  const received = (to: NodeId, from: NodeId) =>
    exchanges.find((e) => e.from === from && e.to === to);

  // Phase B: everyone recomputes.
  const next: DVTables = {};
  for (const x of ids) {
    const vec: DVVector = {};
    for (const y of ids) {
      if (y === x) {
        vec[y] = { cost: 0, via: x };
        continue;
      }
      let best = INFINITY_COST;
      let bestVia: NodeId | null = null;
      let bestAdv = INFINITY_COST;
      let bestLink = INFINITY_COST;

      for (const v of neighbours(graph, x)) {
        const c = linkCost(graph, x, v);
        if (!Number.isFinite(c)) continue;
        const adv = received(x, v);
        if (!adv) continue;
        const dv = adv.advertised[y];
        if (dv === undefined) continue; // suppressed by split horizon
        const alt = clampCost(c + dv);
        if (alt < best) {
          best = alt;
          bestVia = v;
          bestAdv = dv;
          bestLink = c;
        }
      }
      vec[y] = unreachable(best) ? { cost: INFINITY_COST, via: null } : { cost: best, via: bestVia };

      const before = tables[x]?.[y] ?? { cost: INFINITY_COST, via: null };
      if (!sameCell(before, vec[y])) {
        changes.push({ router: x, dest: y, before, after: vec[y] });
        if (bestVia && !unreachable(best)) {
          const verdict = best < before.cost ? "<" : best > before.cost ? ">" : "=";
          const tail =
            verdict === "<"
              ? "→ update."
              : `→ update anyway (the old route via ${before.via ?? "—"} is no longer offered).`;
          messages.push(
            `[ROUND ${round}] ${x} receives from ${bestVia}: D(${bestVia},${y})=${fmt(bestAdv)} → ${x} via ${bestVia} = ${bestLink}+${fmt(bestAdv)} = ${best} ${verdict} ${fmt(before.cost)} ${tail}`,
          );
        } else {
          messages.push(
            `[ROUND ${round}] ${x}: no neighbour offers a usable path to ${y} → D(${x},${y}) = ∞ (${INFINITY_COST}), route withdrawn.`,
          );
        }
      }
    }
    next[x] = vec;
  }

  const converged = changes.length === 0;
  if (converged) {
    messages.push(
      `[ROUND ${round}] No entry changed in any vector. Converged ✓ — all routing tables are stable.`,
    );
  } else {
    const climbing = changes.filter((c) => c.after.cost > c.before.cost);
    if (climbing.length > 0) {
      messages.push(
        `[ROUND ${round}] ${climbing.length} cost(s) increased (${climbing
          .map((c) => `D(${c.router},${c.dest}) ${fmt(c.before.cost)}→${fmt(c.after.cost)}`)
          .join(", ")}). Routers are believing each other's stale estimates — this is count-to-infinity.`,
      );
    }
  }

  return { round, tables: next, changes, exchanges, messages, converged };
}

/**
 * Run rounds until nothing changes (or `maxRounds` is hit).
 * Step 0 holds the initial vectors, before any exchange has happened.
 */
export function runDistanceVector(
  graph: Graph,
  opts: DVOptions = DV_DEFAULT_OPTIONS,
  maxRounds = 40,
  initial?: DVTables,
): DVRoundStep[] {
  let tables = initial ? cloneTables(initial) : initDVTables(graph);
  const steps: DVRoundStep[] = [
    {
      round: 0,
      tables: cloneTables(tables),
      changes: [],
      exchanges: [],
      messages: [
        "[ROUND 0] Initial vectors installed from directly attached links. Every non-neighbour starts at ∞.",
      ],
      converged: false,
    },
  ];

  for (let r = 1; r <= maxRounds; r++) {
    const step = dvRound(graph, tables, opts, r);
    steps.push(step);
    tables = step.tables;
    if (step.converged) break;
  }
  return steps;
}

export function cloneTables(tables: DVTables): DVTables {
  const out: DVTables = {};
  for (const x of Object.keys(tables)) {
    out[x] = {};
    for (const y of Object.keys(tables[x])) out[x][y] = { ...tables[x][y] };
  }
  return out;
}

/** Converged vectors for the whole network, without keeping the trace. */
export function convergedDVTables(
  graph: Graph,
  opts: DVOptions = DV_DEFAULT_OPTIONS,
  maxRounds = 40,
): DVTables {
  const steps = runDistanceVector(graph, opts, maxRounds);
  return steps[steps.length - 1].tables;
}

/**
 * Present one router's vector as a routing table.
 * The path is recovered by walking next hops through the other routers'
 * tables - which is what actually happens hop by hop in the data plane.
 */
export function dvRoutingTable(tables: DVTables, router: NodeId): RouteRow[] {
  const vec = tables[router] ?? {};
  return Object.keys(vec)
    .filter((d) => d !== router)
    .sort()
    .map((dest) => {
      const cell = vec[dest];
      if (!cell.via || unreachable(cell.cost)) {
        return { destination: dest, nextHop: null, cost: Infinity, path: [] };
      }
      const path: NodeId[] = [router];
      let cursor = router;
      const seen = new Set<NodeId>([router]);
      while (cursor !== dest) {
        const hop = tables[cursor]?.[dest]?.via;
        if (!hop || seen.has(hop)) {
          path.length = 0;
          break;
        }
        path.push(hop);
        seen.add(hop);
        cursor = hop;
      }
      return { destination: dest, nextHop: cell.via, cost: cell.cost, path };
    });
}

export function allDVRoutingTables(tables: DVTables): Record<NodeId, RouteRow[]> {
  const out: Record<NodeId, RouteRow[]> = {};
  for (const r of Object.keys(tables)) out[r] = dvRoutingTable(tables, r);
  return out;
}
