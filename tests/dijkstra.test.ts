import { describe, expect, it } from "vitest";
import {
  DIJKSTRA_PSEUDOCODE,
  buildFloodingTrace,
  runDijkstra,
  allDijkstraTables,
} from "../lib/routing/dijkstra";
import { defaultGraph, nodeIds, setEdgeWeight, INFINITY_COST } from "../lib/routing/graph";

const G = defaultGraph();

describe("Link State Routing (Dijkstra) on the default network", () => {
  it("produces the expected shortest distances from source A", () => {
    const { dist } = runDijkstra(G, "A");
    expect(dist).toEqual({ A: 0, B: 3, C: 2, D: 8, E: 10, F: 13 });
  });

  it("produces the expected predecessor tree from source A", () => {
    const { prev } = runDijkstra(G, "A");
    // A 0, C 2 (A->C), B 3 (A->C->B), D 8 (via B), E 10 (via D), F 13 (via E)
    expect(prev).toEqual({ A: null, C: "A", B: "C", D: "B", E: "D", F: "E" });
  });

  it("derives A's routing table with the correct next hops", () => {
    const { routingTable } = runDijkstra(G, "A");
    expect(routingTable).toEqual([
      { destination: "B", nextHop: "C", cost: 3, path: ["A", "C", "B"] },
      { destination: "C", nextHop: "C", cost: 2, path: ["A", "C"] },
      { destination: "D", nextHop: "C", cost: 8, path: ["A", "C", "B", "D"] },
      { destination: "E", nextHop: "C", cost: 10, path: ["A", "C", "B", "D", "E"] },
      { destination: "F", nextHop: "C", cost: 13, path: ["A", "C", "B", "D", "E", "F"] },
    ]);
  });

  it("finalises nodes in non-decreasing distance order", () => {
    const { steps } = runDijkstra(G, "A");
    const finalised = steps
      .filter((s) => s.kind === "select")
      .map((s) => ({ node: s.current, dist: s.table.find((r) => r.node === s.current)!.dist }));
    expect(finalised.map((f) => f.node)).toEqual(["A", "C", "B", "D", "E", "F"]);
    expect(finalised.map((f) => f.dist)).toEqual([0, 2, 3, 8, 10, 13]);
  });

  it("starts every non-source distance at infinity and ends with a five-edge tree", () => {
    const { steps, treeEdges } = runDijkstra(G, "A");
    const init = steps[0];
    expect(init.kind).toBe("init");
    for (const row of init.table) {
      expect(row.dist).toBe(row.node === "A" ? 0 : Infinity);
      expect(row.visited).toBe(false);
    }
    // A spanning tree over 6 nodes always has exactly 5 edges.
    expect([...treeEdges].sort()).toEqual(["A-C", "B-C", "B-D", "D-E", "E-F"]);
    expect(steps[steps.length - 1].kind).toBe("done");
  });

  it("only ever highlights a pseudocode line that exists", () => {
    for (const src of nodeIds(G)) {
      for (const step of runDijkstra(G, src).steps) {
        expect(step.pseudoLine, `${src} step ${step.index}`).toBeGreaterThanOrEqual(1);
        expect(step.pseudoLine, `${src} step ${step.index}`).toBeLessThanOrEqual(
          DIJKSTRA_PSEUDOCODE.length,
        );
        // The highlighted line must not be one of the blank spacer lines.
        expect(DIJKSTRA_PSEUDOCODE[step.pseudoLine - 1].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("computes correct distances from every other source", () => {
    const expected: Record<string, Record<string, number>> = {
      A: { A: 0, B: 3, C: 2, D: 8, E: 10, F: 13 },
      B: { A: 3, B: 0, C: 1, D: 5, E: 7, F: 10 },
      C: { A: 2, B: 1, C: 0, D: 6, E: 8, F: 11 },
      D: { A: 8, B: 5, C: 6, D: 0, E: 2, F: 5 },
      E: { A: 10, B: 7, C: 8, D: 2, E: 0, F: 3 },
      F: { A: 13, B: 10, C: 11, D: 5, E: 3, F: 0 },
    };
    for (const src of nodeIds(G)) {
      expect(runDijkstra(G, src).dist, `source ${src}`).toEqual(expected[src]);
    }
  });

  it("gives every router the expected next hops", () => {
    const tables = allDijkstraTables(G);
    const nextHops = (r: string) =>
      Object.fromEntries(tables[r].map((row) => [row.destination, row.nextHop]));
    expect(nextHops("A")).toEqual({ B: "C", C: "C", D: "C", E: "C", F: "C" });
    expect(nextHops("B")).toEqual({ A: "C", C: "C", D: "D", E: "D", F: "D" });
    expect(nextHops("C")).toEqual({ A: "A", B: "B", D: "B", E: "B", F: "B" });
    expect(nextHops("D")).toEqual({ A: "B", B: "B", C: "B", E: "E", F: "E" });
    expect(nextHops("E")).toEqual({ A: "D", B: "D", C: "D", D: "D", F: "F" });
    expect(nextHops("F")).toEqual({ A: "E", B: "E", C: "E", D: "E", E: "E" });
  });

  it("marks a partitioned node unreachable instead of crashing", () => {
    // Cut F off entirely by failing both of its links.
    let g = setEdgeWeight(G, "D-F", INFINITY_COST);
    g = setEdgeWeight(g, "E-F", INFINITY_COST);
    const { dist, routingTable } = runDijkstra(g, "A");
    expect(dist.F).toBe(Infinity);
    expect(routingTable.find((r) => r.destination === "F")).toEqual({
      destination: "F",
      nextHop: null,
      cost: Infinity,
      path: [],
    });
  });
});

describe("LSP flooding", () => {
  it("ends with every router holding every LSP", () => {
    const steps = buildFloodingTrace(G);
    const last = steps[steps.length - 1];
    expect(last.complete).toBe(true);
    for (const router of nodeIds(G)) {
      expect(last.lsdb[router].map((e) => e.origin).sort()).toEqual(["A", "B", "C", "D", "E", "F"]);
    }
  });

  it("starts with each router holding only its own LSP, listing its real links", () => {
    const first = buildFloodingTrace(G)[0];
    expect(first.round).toBe(0);
    for (const router of nodeIds(G)) {
      expect(first.lsdb[router].map((e) => e.origin)).toEqual([router]);
    }
    expect(first.lsdb.A[0].links).toEqual([
      { neighbour: "B", cost: 4 },
      { neighbour: "C", cost: 2 },
    ]);
  });
});
