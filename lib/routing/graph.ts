/**
 * Graph model shared by every routing algorithm and every simulation.
 *
 * The graph is undirected and weighted. Coordinates live in a fixed
 * 800 x 460 "design space"; the SVG canvas maps that space to whatever
 * width it has via a viewBox, so nothing here needs to know about pixels.
 */

export type NodeId = string;

export interface GraphNode {
  id: NodeId;
  x: number;
  y: number;
}

export interface GraphEdge {
  id: string;
  a: NodeId;
  b: NodeId;
  /** Link cost. `INFINITY_COST` marks a failed / broken link. */
  weight: number;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Canvas design space. */
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 460;

/**
 * RIP-style "infinity". RIP counts hops and treats 16 as unreachable, which is
 * exactly what makes count-to-infinity terminate instead of running forever.
 */
export const INFINITY_COST = 16;

/** Stable, order-independent key for an undirected edge. */
export function edgeKey(a: NodeId, b: NodeId): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

export function makeEdge(a: NodeId, b: NodeId, weight: number): GraphEdge {
  return { id: edgeKey(a, b), a, b, weight };
}

/**
 * The default network used by every section of this experiment, so the
 * simulations, the worked examples and the quiz answers all agree.
 *
 *   A-B 4, A-C 2, B-C 1, B-D 5, C-D 8, C-E 10, D-E 2, D-F 6, E-F 3
 */
export function defaultGraph(): Graph {
  return {
    nodes: [
      { id: "A", x: 110, y: 90 },
      { id: "B", x: 360, y: 60 },
      { id: "C", x: 240, y: 250 },
      { id: "D", x: 545, y: 195 },
      { id: "E", x: 420, y: 385 },
      { id: "F", x: 700, y: 360 },
    ],
    edges: [
      makeEdge("A", "B", 4),
      makeEdge("A", "C", 2),
      makeEdge("B", "C", 1),
      makeEdge("B", "D", 5),
      makeEdge("C", "D", 8),
      makeEdge("C", "E", 10),
      makeEdge("D", "E", 2),
      makeEdge("D", "F", 6),
      makeEdge("E", "F", 3),
    ],
  };
}

/**
 * Preset used by the count-to-infinity demo: a plain three-router chain.
 * Breaking B-C here is the textbook scenario.
 */
export function chainGraph(): Graph {
  return {
    nodes: [
      { id: "A", x: 150, y: 230 },
      { id: "B", x: 400, y: 230 },
      { id: "C", x: 650, y: 230 },
    ],
    edges: [makeEdge("A", "B", 1), makeEdge("B", "C", 1)],
  };
}

export function cloneGraph(g: Graph): Graph {
  return {
    nodes: g.nodes.map((n) => ({ ...n })),
    edges: g.edges.map((e) => ({ ...e })),
  };
}

export function nodeIds(g: Graph): NodeId[] {
  return g.nodes.map((n) => n.id);
}

export function findNode(g: Graph, id: NodeId): GraphNode | undefined {
  return g.nodes.find((n) => n.id === id);
}

export function findEdge(g: Graph, a: NodeId, b: NodeId): GraphEdge | undefined {
  const key = edgeKey(a, b);
  return g.edges.find((e) => e.id === key);
}

/** Cost of the direct link a-b, or `Infinity` when there is no usable link. */
export function linkCost(g: Graph, a: NodeId, b: NodeId): number {
  if (a === b) return 0;
  const edge = findEdge(g, a, b);
  if (!edge) return Infinity;
  if (!Number.isFinite(edge.weight) || edge.weight >= INFINITY_COST) return Infinity;
  return edge.weight;
}

/** Neighbours reachable over a live link, sorted so results are deterministic. */
export function neighbours(g: Graph, id: NodeId): NodeId[] {
  const out: NodeId[] = [];
  for (const e of g.edges) {
    if (!Number.isFinite(e.weight) || e.weight >= INFINITY_COST) continue;
    if (e.a === id) out.push(e.b);
    else if (e.b === id) out.push(e.a);
  }
  return out.sort();
}

/** Adjacency list of one router, i.e. the content of the LSP it floods. */
export function adjacency(g: Graph, id: NodeId): { neighbour: NodeId; cost: number }[] {
  return neighbours(g, id)
    .map((n) => ({ neighbour: n, cost: linkCost(g, id, n) }))
    .sort((p, q) => (p.neighbour < q.neighbour ? -1 : 1));
}

/** Next free single-letter node name (G, H, ... then A1, A2 ... as a fallback). */
export function nextNodeId(g: Graph): NodeId {
  const used = new Set(nodeIds(g));
  for (let i = 0; i < 26; i++) {
    const id = String.fromCharCode(65 + i);
    if (!used.has(id)) return id;
  }
  let n = 1;
  while (used.has(`N${n}`)) n++;
  return `N${n}`;
}

export function addNode(g: Graph, at?: { x: number; y: number }): Graph {
  const id = nextNodeId(g);
  const angle = (g.nodes.length * Math.PI * 2) / 7;
  const fallback = {
    x: CANVAS_WIDTH / 2 + Math.cos(angle) * 220,
    y: CANVAS_HEIGHT / 2 + Math.sin(angle) * 150,
  };
  const pos = at ?? fallback;
  return {
    nodes: [...g.nodes, { id, x: clamp(pos.x, 40, CANVAS_WIDTH - 40), y: clamp(pos.y, 40, CANVAS_HEIGHT - 40) }],
    edges: g.edges.map((e) => ({ ...e })),
  };
}

export function removeNode(g: Graph, id: NodeId): Graph {
  return {
    nodes: g.nodes.filter((n) => n.id !== id),
    edges: g.edges.filter((e) => e.a !== id && e.b !== id),
  };
}

export function addEdge(g: Graph, a: NodeId, b: NodeId, weight = 1): Graph {
  if (a === b || findEdge(g, a, b)) return g;
  return { nodes: g.nodes.map((n) => ({ ...n })), edges: [...g.edges, makeEdge(a, b, weight)] };
}

export function removeEdge(g: Graph, a: NodeId, b: NodeId): Graph {
  const key = edgeKey(a, b);
  return { nodes: g.nodes.map((n) => ({ ...n })), edges: g.edges.filter((e) => e.id !== key) };
}

export function setEdgeWeight(g: Graph, id: string, weight: number): Graph {
  return {
    nodes: g.nodes.map((n) => ({ ...n })),
    edges: g.edges.map((e) => (e.id === id ? { ...e, weight } : { ...e })),
  };
}

export function moveNode(g: Graph, id: NodeId, x: number, y: number): Graph {
  return {
    nodes: g.nodes.map((n) => (n.id === id ? { ...n, x, y } : { ...n })),
    edges: g.edges.map((e) => ({ ...e })),
  };
}

export function isBroken(edge: GraphEdge): boolean {
  return !Number.isFinite(edge.weight) || edge.weight >= INFINITY_COST;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Render a cost the way a routing table would: 16 and above reads as infinity. */
export function formatCost(cost: number): string {
  if (!Number.isFinite(cost) || cost >= INFINITY_COST) return "∞";
  return String(cost);
}
