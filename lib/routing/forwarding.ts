/**
 * The forwarding plane.
 *
 * Routing (what the other two modules do) builds the tables. Forwarding is the
 * much simpler, per-packet job done here: look the destination up in the local
 * table, read one next hop, hand the packet over, forget about it.
 *
 * A router never knows the whole path. Each hop is an independent decision,
 * which is why stale tables can drop or loop a packet.
 */

import { Graph, NodeId, isBroken, findEdge, linkCost } from "./graph";
import { RouteRow, RoutingTables, isUnreachable } from "./table";

export type HopStatus = "forward" | "delivered" | "dropped" | "loop";

export interface ForwardHop {
  index: number;
  /** Router making the decision. */
  router: NodeId;
  destination: NodeId;
  nextHop: NodeId | null;
  /** Cost to the destination as claimed by this router's own table. */
  claimedCost: number;
  /** Cost of the link actually traversed, if any. */
  hopCost: number;
  /** The whole table shown at this router, so the UI can highlight one row. */
  table: RouteRow[];
  matchedRow: RouteRow | null;
  status: HopStatus;
  message: string;
}

export interface ForwardResult {
  source: NodeId;
  destination: NodeId;
  hops: ForwardHop[];
  path: NodeId[];
  totalCost: number;
  hopCount: number;
  delivered: boolean;
  /** Human-readable outcome, used for the console's closing line. */
  outcome: string;
}

/**
 * Walk a packet from `source` to `destination` using each router's own table.
 * `maxHops` acts as the IP TTL: it is what stops a routing loop.
 */
export function forwardPacket(
  graph: Graph,
  tables: RoutingTables,
  source: NodeId,
  destination: NodeId,
  maxHops = 12,
): ForwardResult {
  const hops: ForwardHop[] = [];
  const path: NodeId[] = [source];
  let totalCost = 0;
  let current = source;
  const visits = new Map<NodeId, number>();
  let delivered = false;
  let outcome = "";

  if (source === destination) {
    return {
      source,
      destination,
      hops: [
        {
          index: 0,
          router: source,
          destination,
          nextHop: null,
          claimedCost: 0,
          hopCost: 0,
          table: tables[source] ?? [],
          matchedRow: null,
          status: "delivered",
          message: `Router ${source}: destination is this router. Packet delivered locally (cost 0, 0 hops).`,
        },
      ],
      path,
      totalCost: 0,
      hopCount: 0,
      delivered: true,
      outcome: "Source and destination are the same router; nothing is forwarded.",
    };
  }

  for (let i = 0; i < maxHops; i++) {
    const table = tables[current] ?? [];
    const seen = (visits.get(current) ?? 0) + 1;
    visits.set(current, seen);

    if (current === destination) {
      delivered = true;
      hops.push({
        index: hops.length,
        router: current,
        destination,
        nextHop: null,
        claimedCost: 0,
        hopCost: 0,
        table,
        matchedRow: null,
        status: "delivered",
        message: `Router ${current}: dest ${destination} is directly attached — packet delivered. Total cost ${totalCost}, ${path.length - 1} hop(s).`,
      });
      outcome = `Delivered along ${path.join(" → ")} for a total cost of ${totalCost} over ${path.length - 1} hop(s).`;
      break;
    }

    if (seen > 1) {
      hops.push({
        index: hops.length,
        router: current,
        destination,
        nextHop: null,
        claimedCost: Infinity,
        hopCost: 0,
        table,
        matchedRow: table.find((r) => r.destination === destination) ?? null,
        status: "loop",
        message: `Router ${current}: dest ${destination} — this router has already handled this packet. ROUTING LOOP detected; the TTL will expire and the packet is discarded.`,
      });
      outcome = `Routing loop: the packet bounced around ${path.join(" → ")} until its TTL ran out. The tables have not re-converged yet.`;
      break;
    }

    const row = table.find((r) => r.destination === destination) ?? null;

    if (!row || row.nextHop === null || isUnreachable(row.cost)) {
      hops.push({
        index: hops.length,
        router: current,
        destination,
        nextHop: null,
        claimedCost: row ? row.cost : Infinity,
        hopCost: 0,
        table,
        matchedRow: row,
        status: "dropped",
        message: `Router ${current}: dest ${destination} — no route in table (cost ∞). Packet DROPPED, ICMP destination-unreachable returned.`,
      });
      outcome = `Dropped at ${current}: its table has no usable entry for ${destination}.`;
      break;
    }

    const edge = findEdge(graph, current, row.nextHop);
    if (!edge || isBroken(edge)) {
      hops.push({
        index: hops.length,
        router: current,
        destination,
        nextHop: row.nextHop,
        claimedCost: row.cost,
        hopCost: Infinity,
        table,
        matchedRow: row,
        status: "dropped",
        message: `Router ${current}: dest ${destination} → next hop ${row.nextHop}, cost ${row.cost}. But link ${current}–${row.nextHop} is DOWN and the table is stale. Packet DROPPED.`,
      });
      outcome = `Dropped at ${current}: it still points at ${row.nextHop} over a failed link. Routing has not re-converged.`;
      break;
    }

    const cost = linkCost(graph, current, row.nextHop);
    hops.push({
      index: hops.length,
      router: current,
      destination,
      nextHop: row.nextHop,
      claimedCost: row.cost,
      hopCost: cost,
      table,
      matchedRow: row,
      status: "forward",
      message: `Router ${current}: dest ${destination} → next hop ${row.nextHop}, cost ${row.cost}. Forwarding over link ${current}–${row.nextHop} (${cost}).`,
    });

    totalCost += cost;
    current = row.nextHop;
    path.push(current);
  }

  if (!outcome) {
    outcome = `TTL exhausted after ${maxHops} hops without reaching ${destination}. The packet is discarded.`;
  }

  return {
    source,
    destination,
    hops,
    path,
    totalCost,
    hopCount: Math.max(0, path.length - 1),
    delivered,
    outcome,
  };
}
