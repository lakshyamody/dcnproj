import { describe, expect, it } from "vitest";
import { forwardPacket } from "../lib/routing/forwarding";
import { allDijkstraTables } from "../lib/routing/dijkstra";
import { allDVRoutingTables, convergedDVTables } from "../lib/routing/distanceVector";
import { defaultGraph, setEdgeWeight, INFINITY_COST } from "../lib/routing/graph";

const G = defaultGraph();
const lsTables = allDijkstraTables(G);
const dvTables = allDVRoutingTables(convergedDVTables(G));

describe("packet forwarding", () => {
  it("walks A to F hop by hop using Link State tables", () => {
    const res = forwardPacket(G, lsTables, "A", "F");
    expect(res.delivered).toBe(true);
    expect(res.path).toEqual(["A", "C", "B", "D", "E", "F"]);
    expect(res.totalCost).toBe(13);
    expect(res.hopCount).toBe(5);
  });

  it("produces the same journey from the DV-converged tables", () => {
    const res = forwardPacket(G, dvTables, "A", "F");
    expect(res.path).toEqual(["A", "C", "B", "D", "E", "F"]);
    expect(res.totalCost).toBe(13);
  });

  it("logs the per-router decision, matching the console format", () => {
    const res = forwardPacket(G, lsTables, "A", "F");
    const atC = res.hops.find((h) => h.router === "C")!;
    expect(atC.nextHop).toBe("B");
    expect(atC.claimedCost).toBe(11);
    expect(atC.message).toContain("Router C: dest F → next hop B, cost 11");
  });

  it("drops the packet when a stale table points over a dead link", () => {
    // Tables computed on the intact graph, but D-E has since failed.
    const brokenGraph = setEdgeWeight(G, "D-E", INFINITY_COST);
    const res = forwardPacket(brokenGraph, lsTables, "A", "F");
    expect(res.delivered).toBe(false);
    expect(res.hops[res.hops.length - 1].status).toBe("dropped");
    expect(res.hops[res.hops.length - 1].router).toBe("D");
  });

  it("detects a routing loop instead of running forever", () => {
    // Hand-built inconsistent tables: B says go to C, C says go back to B.
    const loopTables = {
      A: [{ destination: "F", nextHop: "B", cost: 9, path: [] }],
      B: [{ destination: "F", nextHop: "C", cost: 8, path: [] }],
      C: [{ destination: "F", nextHop: "B", cost: 8, path: [] }],
    };
    const res = forwardPacket(G, loopTables, "A", "F", 12);
    expect(res.delivered).toBe(false);
    expect(res.hops[res.hops.length - 1].status).toBe("loop");
  });

  it("reports no route when the destination is unreachable", () => {
    let g = setEdgeWeight(G, "D-F", INFINITY_COST);
    g = setEdgeWeight(g, "E-F", INFINITY_COST);
    const tables = allDijkstraTables(g);
    const res = forwardPacket(g, tables, "A", "F");
    expect(res.delivered).toBe(false);
    expect(res.hops[0].status).toBe("dropped");
    expect(res.hops[0].router).toBe("A");
  });
});
