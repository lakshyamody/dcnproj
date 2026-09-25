/**
 * The routing table: the one data structure both algorithm families produce,
 * and the only thing the forwarding plane ever reads.
 */

import { INFINITY_COST, NodeId } from "./graph";

export interface RouteRow {
  destination: NodeId;
  /** `null` for the router itself or for an unreachable destination. */
  nextHop: NodeId | null;
  cost: number;
  /** Full path, kept for teaching and for the forwarding animation. */
  path: NodeId[];
}

/** All routers' tables, keyed by the router that owns them. */
export type RoutingTables = Record<NodeId, RouteRow[]>;

/** Walk the Dijkstra predecessor chain backwards to recover source -> dest. */
export function pathFromPrev(
  prev: Record<NodeId, NodeId | null>,
  source: NodeId,
  dest: NodeId,
): NodeId[] {
  const path: NodeId[] = [];
  let cursor: NodeId | null = dest;
  const guard = new Set<NodeId>();
  while (cursor !== null) {
    if (guard.has(cursor)) return [];
    guard.add(cursor);
    path.unshift(cursor);
    if (cursor === source) return path;
    cursor = prev[cursor] ?? null;
  }
  return [];
}

/**
 * Turn a shortest-path tree into the source router's routing table.
 * The next hop is the *first* router on the path, which is all the data plane
 * needs — a router never stores the whole path, only one hop.
 */
export function routingTableFromTree(
  source: NodeId,
  dist: Record<NodeId, number>,
  prev: Record<NodeId, NodeId | null>,
  allNodes: NodeId[],
): RouteRow[] {
  return allNodes
    .filter((n) => n !== source)
    .sort()
    .map((dest) => {
      const path = pathFromPrev(prev, source, dest);
      const reachable = path.length > 1 && Number.isFinite(dist[dest]);
      return {
        destination: dest,
        nextHop: reachable ? path[1] : null,
        cost: reachable ? dist[dest] : Infinity,
        path: reachable ? path : [],
      };
    });
}

export function isUnreachable(cost: number): boolean {
  return !Number.isFinite(cost) || cost >= INFINITY_COST;
}
