/**
 * Link State Routing.
 *
 * Phase 1 - flooding: every router sends a Link State Packet (LSP) describing
 * its own directly attached links to every other router, so all routers end up
 * holding the same Link State Database (LSDB).
 *
 * Phase 2 - Dijkstra: each router runs Dijkstra's shortest path algorithm over
 * that LSDB and derives its own shortest-path tree, then its routing table.
 *
 * Both phases are pure functions returning a *trace*: an array of immutable
 * snapshots. The UI only replays the trace; it never re-implements any of this.
 */

import {
  Graph,
  NodeId,
  adjacency,
  edgeKey,
  linkCost,
  neighbours,
  nodeIds,
} from "./graph";
import { RouteRow, routingTableFromTree } from "./table";

/* ------------------------------------------------------------------ *
 * Phase 1 - LSP flooding
 * ------------------------------------------------------------------ */

export interface LsdbEntry {
  origin: NodeId;
  links: { neighbour: NodeId; cost: number }[];
}

export interface LspInFlight {
  origin: NodeId;
  from: NodeId;
  to: NodeId;
}

export interface FloodStep {
  round: number;
  /** `lsdb[router]` = the LSPs that router is holding after this round. */
  lsdb: Record<NodeId, LsdbEntry[]>;
  /** LSPs copied across links during this round, for the animation. */
  inFlight: LspInFlight[];
  message: string;
  complete: boolean;
}

/**
 * Flooding proceeds in synchronous rounds. Round 0 is "every router knows its
 * own links". In each later round a router passes on every LSP it received but
 * has not yet forwarded, which is reliable flooding in its simplest form.
 */
export function buildFloodingTrace(graph: Graph): FloodStep[] {
  const ids = nodeIds(graph).sort();
  const links: Record<NodeId, { neighbour: NodeId; cost: number }[]> = {};
  for (const id of ids) links[id] = adjacency(graph, id);

  // held[router] = set of origins whose LSP this router holds.
  const held: Record<NodeId, Set<NodeId>> = {};
  for (const id of ids) held[id] = new Set([id]);

  const snapshot = (): Record<NodeId, LsdbEntry[]> => {
    const out: Record<NodeId, LsdbEntry[]> = {};
    for (const id of ids) {
      out[id] = [...held[id]]
        .sort()
        .map((origin) => ({ origin, links: links[origin] ?? [] }));
    }
    return out;
  };

  const steps: FloodStep[] = [
    {
      round: 0,
      lsdb: snapshot(),
      inFlight: [],
      message:
        "[FLOOD 0] Each router inspects its own interfaces and generates its LSP. " +
        ids.map((id) => `${id}{${links[id].map((l) => `${l.neighbour}:${l.cost}`).join(",")}}`).join("  "),
      complete: false,
    },
  ];

  // Anything a router holds but has not forwarded yet.
  let pending: { at: NodeId; origin: NodeId }[] = ids.map((id) => ({ at: id, origin: id }));
  let round = 1;
  const maxRounds = ids.length + 2; // flooding cannot need more than the diameter

  while (pending.length > 0 && round <= maxRounds) {
    const inFlight: LspInFlight[] = [];
    const nextPending: { at: NodeId; origin: NodeId }[] = [];

    for (const { at, origin } of pending) {
      for (const nb of neighbours(graph, at)) {
        if (held[nb].has(origin)) continue; // already have it - drop the duplicate
        inFlight.push({ origin, from: at, to: nb });
      }
    }
    for (const lsp of inFlight) {
      if (held[lsp.to].has(lsp.origin)) continue;
      held[lsp.to].add(lsp.origin);
      nextPending.push({ at: lsp.to, origin: lsp.origin });
    }

    if (inFlight.length > 0) {
      const summary = inFlight
        .map((l) => `LSP(${l.origin}) ${l.from}→${l.to}`)
        .join(", ");
      steps.push({
        round,
        lsdb: snapshot(),
        inFlight,
        message: `[FLOOD ${round}] ${inFlight.length} LSP cop${inFlight.length === 1 ? "y" : "ies"} forwarded: ${summary}.`,
        complete: false,
      });
    }
    pending = nextPending;
    round++;
  }

  const total = ids.length;
  const synced = ids.filter((id) => held[id].size === total).length;
  steps.push({
    round,
    lsdb: snapshot(),
    inFlight: [],
    message:
      synced === total
        ? `[FLOOD ✓] Flooding complete. All ${total} routers hold an identical LSDB of ${total} LSPs. Every router can now build the full topology map.`
        : `[FLOOD ✓] Flooding settled, but only ${synced}/${total} routers hold a complete LSDB — the topology is partitioned.`,
    complete: true,
  });

  return steps;
}

/* ------------------------------------------------------------------ *
 * Phase 2 - Dijkstra
 * ------------------------------------------------------------------ */

export const DIJKSTRA_PSEUDOCODE = [
  "function Dijkstra(Graph, source):",
  "    for each vertex v in Graph:",
  "        dist[v] ← ∞",
  "        prev[v] ← UNDEFINED",
  "        add v to Q                 // Q = unvisited set",
  "    dist[source] ← 0",
  "",
  "    while Q is not empty:",
  "        u ← vertex in Q with minimum dist[u]",
  "        remove u from Q            // u is now finalised",
  "",
  "        for each neighbour v of u still in Q:",
  "            alt ← dist[u] + cost(u, v)",
  "            if alt < dist[v]:",
  "                dist[v] ← alt",
  "                prev[v] ← u",
  "",
  "    return dist[], prev[]",
] as const;

/** 1-based pseudocode line numbers, so the UI can highlight the right row. */
const LINE = {
  init: 3,
  source: 6,
  loop: 8,
  select: 9,
  remove: 10,
  scan: 12,
  compute: 13,
  test: 14,
  update: 15,
  done: 18,
} as const;

export interface DijkstraRow {
  node: NodeId;
  dist: number;
  prev: NodeId | null;
  visited: boolean;
}

export type DijkstraStepKind = "init" | "select" | "relax" | "done";

export interface DijkstraStep {
  index: number;
  kind: DijkstraStepKind;
  /** 1-based line in DIJKSTRA_PSEUDOCODE to highlight. */
  pseudoLine: number;
  message: string;
  table: DijkstraRow[];
  /** Unvisited set, ordered exactly as a min-priority queue would pop it. */
  queue: { node: NodeId; dist: number }[];
  /** Node being finalised at this step. */
  current: NodeId | null;
  /** Edge currently being relaxed. */
  relaxing: { from: NodeId; to: NodeId; alt: number; accepted: boolean; edgeId: string } | null;
  /** Edge ids of the shortest-path tree built so far. */
  treeEdges: string[];
}

export interface DijkstraResult {
  source: NodeId;
  steps: DijkstraStep[];
  dist: Record<NodeId, number>;
  prev: Record<NodeId, NodeId | null>;
  /** Edge ids forming the final shortest-path tree. */
  treeEdges: string[];
  routingTable: RouteRow[];
}

/**
 * Dijkstra with a full step-by-step trace.
 *
 * One step is emitted per queue extraction ("select") and one per edge
 * examined ("relax"), which is exactly the granularity a student needs to
 * follow the table filling in.
 */
export function runDijkstra(graph: Graph, source: NodeId): DijkstraResult {
  const ids = nodeIds(graph).sort();
  const dist: Record<NodeId, number> = {};
  const prev: Record<NodeId, NodeId | null> = {};
  const visited: Record<NodeId, boolean> = {};
  const treeEdges: string[] = [];
  const steps: DijkstraStep[] = [];

  for (const id of ids) {
    dist[id] = Infinity;
    prev[id] = null;
    visited[id] = false;
  }
  if (ids.includes(source)) dist[source] = 0;

  const table = (): DijkstraRow[] =>
    ids.map((id) => ({ node: id, dist: dist[id], prev: prev[id], visited: visited[id] }));

  const queue = (): { node: NodeId; dist: number }[] =>
    ids
      .filter((id) => !visited[id])
      .map((id) => ({ node: id, dist: dist[id] }))
      .sort((p, q) => (p.dist === q.dist ? (p.node < q.node ? -1 : 1) : p.dist - q.dist));

  const push = (s: Omit<DijkstraStep, "index">) => {
    steps.push({ ...s, index: steps.length });
  };

  push({
    kind: "init",
    pseudoLine: LINE.source,
    message: `[INIT] dist[${source}] = 0, every other distance = ∞, prev = undefined. Unvisited set Q = {${ids.join(", ")}}.`,
    table: table(),
    queue: queue(),
    current: null,
    relaxing: null,
    treeEdges: [],
  });

  let stepNo = 0;

  for (;;) {
    // Line 9: pick the unvisited vertex with the smallest tentative distance.
    const q = queue();
    const head = q[0];
    if (!head || !Number.isFinite(head.dist)) break;

    const u = head.node;
    visited[u] = true;
    stepNo++;

    if (prev[u] !== null) {
      const key = edgeKey(prev[u] as NodeId, u);
      if (!treeEdges.includes(key)) treeEdges.push(key);
    }

    push({
      kind: "select",
      pseudoLine: LINE.select,
      message: `[STEP ${stepNo}] Finalise ${u} (dist ${dist[u]}${prev[u] ? `, via ${prev[u]}` : ", the source"}). Remove ${u} from Q.`,
      table: table(),
      queue: queue(),
      current: u,
      relaxing: null,
      treeEdges: [...treeEdges],
    });

    // Lines 12-16: relax every edge out of u that leads to an unvisited node.
    for (const v of neighbours(graph, u)) {
      if (visited[v]) continue;
      const w = linkCost(graph, u, v);
      if (!Number.isFinite(w)) continue;
      const alt = dist[u] + w;
      const accepted = alt < dist[v];
      const before = dist[v];
      if (accepted) {
        dist[v] = alt;
        prev[v] = u;
      }
      const shownBefore = Number.isFinite(before) ? String(before) : "∞";
      push({
        kind: "relax",
        pseudoLine: accepted ? LINE.update : LINE.test,
        message: accepted
          ? `[STEP ${stepNo}] Relax ${u}–${v}: ${dist[u]}+${w}=${alt} < ${shownBefore} → update ${v} (dist ${alt}, prev ${u}).`
          : `[STEP ${stepNo}] Relax ${u}–${v}: ${dist[u]}+${w}=${alt} ≥ ${shownBefore} → keep ${v} unchanged.`,
        table: table(),
        queue: queue(),
        current: u,
        relaxing: { from: u, to: v, alt, accepted, edgeId: edgeKey(u, v) },
        treeEdges: [...treeEdges],
      });
    }
  }

  const routingTable = routingTableFromTree(source, dist, prev, ids);
  const unreachable = ids.filter((id) => id !== source && !Number.isFinite(dist[id]));

  push({
    kind: "done",
    pseudoLine: LINE.done,
    message:
      `[DONE] Q is empty. Shortest-path tree complete: ` +
      ids
        .filter((id) => id !== source)
        .map((id) => `${id}=${Number.isFinite(dist[id]) ? dist[id] : "∞"}`)
        .join(", ") +
      (unreachable.length ? `. Unreachable: ${unreachable.join(", ")}.` : ".") +
      ` Routing table for ${source} derived from prev[].`,
    table: table(),
    queue: [],
    current: null,
    relaxing: null,
    treeEdges: [...treeEdges],
  });

  return { source, steps, dist, prev, treeEdges, routingTable };
}

/** Every router's Link State routing table, i.e. run Dijkstra once per router. */
export function allDijkstraTables(graph: Graph): Record<NodeId, RouteRow[]> {
  const out: Record<NodeId, RouteRow[]> = {};
  for (const id of nodeIds(graph)) out[id] = runDijkstra(graph, id).routingTable;
  return out;
}
