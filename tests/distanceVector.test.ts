import { describe, expect, it } from "vitest";
import {
  DVTables,
  DV_DEFAULT_OPTIONS,
  convergedDVTables,
  dvRound,
  dvRoutingTable,
  initDVTables,
  runDistanceVector,
} from "../lib/routing/distanceVector";
import {
  INFINITY_COST,
  chainGraph,
  defaultGraph,
  nodeIds,
  setEdgeWeight,
} from "../lib/routing/graph";
import { runDijkstra } from "../lib/routing/dijkstra";

const G = defaultGraph();

/** Flatten a converged table set to { router: { dest: [cost, nextHop] } }. */
function summarise(tables: DVTables) {
  const out: Record<string, Record<string, [number, string | null]>> = {};
  for (const r of Object.keys(tables).sort()) {
    out[r] = {};
    for (const d of Object.keys(tables[r]).sort()) {
      out[r][d] = [tables[r][d].cost, tables[r][d].via];
    }
  }
  return out;
}

describe("Distance Vector Routing (Bellman-Ford) on the default network", () => {
  it("initialises with self = 0, neighbours = link cost, everything else = infinity", () => {
    const t = initDVTables(G);
    expect(summarise(t).A).toEqual({
      A: [0, "A"],
      B: [4, "B"],
      C: [2, "C"],
      D: [INFINITY_COST, null],
      E: [INFINITY_COST, null],
      F: [INFINITY_COST, null],
    });
  });

  it("converges to the full expected routing tables for every router", () => {
    const converged = convergedDVTables(G);
    expect(summarise(converged)).toEqual({
      A: { A: [0, "A"], B: [3, "C"], C: [2, "C"], D: [8, "C"], E: [10, "C"], F: [13, "C"] },
      B: { A: [3, "C"], B: [0, "B"], C: [1, "C"], D: [5, "D"], E: [7, "D"], F: [10, "D"] },
      C: { A: [2, "A"], B: [1, "B"], C: [0, "C"], D: [6, "B"], E: [8, "B"], F: [11, "B"] },
      D: { A: [8, "B"], B: [5, "B"], C: [6, "B"], D: [0, "D"], E: [2, "E"], F: [5, "E"] },
      E: { A: [10, "D"], B: [7, "D"], C: [8, "D"], D: [2, "D"], E: [0, "E"], F: [3, "F"] },
      F: { A: [13, "E"], B: [10, "E"], C: [11, "E"], D: [5, "E"], E: [3, "E"], F: [0, "F"] },
    });
  });

  it("agrees with Dijkstra on every router's costs and next hops", () => {
    const dv = convergedDVTables(G);
    for (const src of nodeIds(G)) {
      const ls = runDijkstra(G, src);
      for (const dest of nodeIds(G)) {
        expect(dv[src][dest].cost, `D(${src},${dest})`).toBe(ls.dist[dest]);
      }
      const dvRows = dvRoutingTable(dv, src).map((r) => [r.destination, r.nextHop, r.cost]);
      const lsRows = ls.routingTable.map((r) => [r.destination, r.nextHop, r.cost]);
      expect(dvRows, `tables of ${src}`).toEqual(lsRows);
    }
  });

  it("converges and reports Converged for the last round only", () => {
    const steps = runDistanceVector(G);
    expect(steps.length).toBeGreaterThan(2);
    expect(steps[steps.length - 1].converged).toBe(true);
    expect(steps.slice(0, -1).every((s) => !s.converged)).toBe(true);
    // Diameter of this graph in hops is small, so it settles quickly.
    expect(steps[steps.length - 1].round).toBeLessThanOrEqual(6);
  });

  it("exposes a full path in the routing table view", () => {
    const converged = convergedDVTables(G);
    const rows = dvRoutingTable(converged, "A");
    expect(rows.find((r) => r.destination === "F")).toEqual({
      destination: "F",
      nextHop: "C",
      cost: 13,
      path: ["A", "C", "B", "D", "E", "F"],
    });
  });
});

describe("split horizon and poison reverse", () => {
  it("advertises everything to everyone when both are off", () => {
    const tables = convergedDVTables(G);
    const step = dvRound(G, tables, DV_DEFAULT_OPTIONS, 1);
    const aToC = step.exchanges.find((e) => e.from === "A" && e.to === "C")!;
    expect(aToC.suppressed).toEqual([]);
    // A reaches D via C, and still tells C about it - that is the whole problem.
    expect(aToC.advertised.D).toBe(8);
  });

  it("suppresses routes learned from the neighbour being advertised to", () => {
    const tables = convergedDVTables(G);
    const step = dvRound(G, tables, { splitHorizon: true, poisonReverse: false }, 1);
    const aToC = step.exchanges.find((e) => e.from === "A" && e.to === "C")!;
    // Everything A knows beyond C was learned from C, so all of it is withheld.
    expect(aToC.suppressed.sort()).toEqual(["B", "D", "E", "F"]);
    expect(aToC.advertised.D).toBeUndefined();
  });

  it("poisons those routes with infinity instead of withholding them", () => {
    const tables = convergedDVTables(G);
    const step = dvRound(G, tables, { splitHorizon: true, poisonReverse: true }, 1);
    const aToC = step.exchanges.find((e) => e.from === "A" && e.to === "C")!;
    expect(aToC.suppressed).toEqual([]);
    expect(aToC.advertised.D).toBe(INFINITY_COST);
    expect(aToC.advertised.C).toBe(2); // the route to C itself is still advertised
  });

  it("stays converged when a round runs on already-converged tables", () => {
    const tables = convergedDVTables(G);
    for (const opts of [
      DV_DEFAULT_OPTIONS,
      { splitHorizon: true, poisonReverse: false },
      { splitHorizon: true, poisonReverse: true },
    ]) {
      expect(dvRound(G, tables, opts, 1).converged, JSON.stringify(opts)).toBe(true);
    }
  });
});

describe("count-to-infinity on the A-B-C chain", () => {
  const chain = chainGraph();
  const broken = setEdgeWeight(chain, "B-C", INFINITY_COST);

  it("converges the intact chain first", () => {
    expect(summarise(convergedDVTables(chain))).toEqual({
      A: { A: [0, "A"], B: [1, "B"], C: [2, "B"] },
      B: { A: [1, "A"], B: [0, "B"], C: [1, "C"] },
      C: { A: [2, "B"], B: [1, "B"], C: [0, "C"] },
    });
  });

  it("climbs slowly to the infinity cap of 16 with both fixes off", () => {
    const start = convergedDVTables(chain);
    const steps = runDistanceVector(broken, DV_DEFAULT_OPTIONS, 60, start);

    // The cost A and B believe they have to C must strictly increase over time.
    const aToC = steps.map((s) => s.tables.A.C.cost);
    const bToC = steps.map((s) => s.tables.B.C.cost);
    expect(aToC[0]).toBe(2);
    expect(Math.max(...aToC)).toBe(INFINITY_COST);
    expect(Math.max(...bToC)).toBe(INFINITY_COST);
    // Monotonically non-decreasing, and it visits many intermediate values.
    for (let i = 1; i < aToC.length; i++) expect(aToC[i]).toBeGreaterThanOrEqual(aToC[i - 1]);
    expect(new Set(aToC).size).toBeGreaterThan(5);
    // It is slow: many rounds, not one or two.
    expect(steps.length).toBeGreaterThan(8);

    const last = steps[steps.length - 1];
    expect(last.converged).toBe(true);
    expect(last.tables.A.C).toEqual({ cost: INFINITY_COST, via: null });
    expect(last.tables.B.C).toEqual({ cost: INFINITY_COST, via: null });
  });

  it("is fixed by split horizon: B gives up on C immediately", () => {
    const start = convergedDVTables(chain);
    const steps = runDistanceVector(broken, { splitHorizon: true, poisonReverse: false }, 60, start);

    // Round 1: A withholds its C route from B, so B has nothing to believe.
    expect(steps[1].tables.B.C).toEqual({ cost: INFINITY_COST, via: null });
    expect(steps[steps.length - 1].converged).toBe(true);
    expect(steps[steps.length - 1].tables.A.C.cost).toBe(INFINITY_COST);
    // Far fewer rounds than the unprotected run above.
    expect(steps.length).toBeLessThanOrEqual(5);
  });

  it("is fixed just as fast by poison reverse", () => {
    const start = convergedDVTables(chain);
    const steps = runDistanceVector(broken, { splitHorizon: true, poisonReverse: true }, 60, start);
    expect(steps[1].tables.B.C.cost).toBe(INFINITY_COST);
    expect(steps[steps.length - 1].converged).toBe(true);
    expect(steps.length).toBeLessThanOrEqual(5);
  });
});
