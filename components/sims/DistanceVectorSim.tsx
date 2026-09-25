"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DVChange,
  DVExchange,
  DVOptions,
  DVTables,
  cloneTables,
  convergedDVTables,
  dvRound,
  dvRoutingTable,
  initDVTables,
} from "@/lib/routing/distanceVector";
import {
  Graph,
  INFINITY_COST,
  NodeId,
  chainGraph,
  defaultGraph,
  edgeKey,
  formatCost,
  moveNode,
  nodeIds,
  setEdgeWeight,
} from "@/lib/routing/graph";
import { toast } from "sonner";
import { Icon } from "../Icon";
import { DiagnosticConsole, LogLine } from "./DiagnosticConsole";
import { EdgeTone, GraphCanvas, NodeCard, NodeTone, PacketSprite } from "./GraphCanvas";
import { RoutingTableView, Select, SimShell } from "./SimUI";
import { GraphToolbar, useGraphEditing } from "./useGraphEditing";

const MAX_ROUNDS = 40;

export function DistanceVectorSim() {
  const [graph, setGraph] = useState<Graph>(() => defaultGraph());
  const [tables, setTables] = useState<DVTables>(() => initDVTables(defaultGraph()));
  const [round, setRound] = useState(0);
  const [converged, setConverged] = useState(false);
  const [opts, setOpts] = useState<DVOptions>({ splitHorizon: false, poisonReverse: false });
  const [changes, setChanges] = useState<DVChange[]>([]);
  const [exchanges, setExchanges] = useState<DVExchange[]>([]);
  const [auto, setAuto] = useState(false);
  const [inspect, setInspect] = useState<NodeId>("A");
  const [showCards, setShowCards] = useState(true);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const logId = useRef(0);

  const ids = useMemo(() => nodeIds(graph).sort(), [graph]);
  const inspected = ids.includes(inspect) ? inspect : (ids[0] ?? "A");

  const push = useCallback((text: string, tone?: LogLine["tone"]) => {
    setLogs((prev) => [...prev.slice(-260), { id: logId.current++, text, tone }]);
  }, []);

  /* --------------------------------------------------- one exchange round */
  const runRound = useCallback(() => {
    if (converged || round >= MAX_ROUNDS) {
      setAuto(false);
      return;
    }
    const step = dvRound(graph, tables, opts, round + 1);
    setTables(step.tables);
    setChanges(step.changes);
    setExchanges(step.exchanges);
    setRound(step.round);
    setConverged(step.converged);
    for (const m of step.messages) {
      push(
        m,
        m.includes("Converged")
          ? "ok"
          : m.includes("count-to-infinity")
            ? "error"
            : m.includes("withdrawn")
              ? "warn"
              : "info",
      );
    }
    if (step.converged) {
      setAuto(false);
      toast.success(`Converged in ${step.round} round${step.round === 1 ? "" : "s"}`, {
        description: "No vector changed this round — every routing table is stable.",
      });
    }
  }, [converged, graph, opts, push, round, tables]);

  // Auto-converge: one timer at a time, stopping itself on convergence.
  useEffect(() => {
    if (!auto) return;
    if (converged || round >= MAX_ROUNDS) {
      setAuto(false);
      return;
    }
    const t = window.setTimeout(runRound, 900);
    return () => window.clearTimeout(t);
  }, [auto, converged, round, runRound]);

  /* --------------------------------------------------- resets and presets */
  const resetVectors = useCallback(
    (g: Graph = graph, message = "[RESET] Vectors reinitialised from directly attached links. Round counter back to 0.") => {
      setTables(initDVTables(g));
      setRound(0);
      setConverged(false);
      setChanges([]);
      setExchanges([]);
      setAuto(false);
      push(message, "accent");
    },
    [graph, push],
  );

  /** Graph edits keep the existing vectors, so a broken link leaves stale state. */
  const applyGraph = useCallback(
    (next: Graph) => {
      const before = ids.join(",");
      const after = nodeIds(next).sort().join(",");
      setGraph(next);
      setChanges([]);
      setExchanges([]);
      setAuto(false);
      if (before !== after) {
        setTables(initDVTables(next));
        setRound(0);
        setConverged(false);
      } else {
        // Topology cost changed but the routers keep believing their old vectors
        // — which is exactly the situation that causes count-to-infinity.
        setConverged(false);
      }
    },
    [ids],
  );

  const editing = useGraphEditing({
    graph,
    setGraph: applyGraph,
    makeDefault: defaultGraph,
    onEdit: (m) => {
      push(m, m.startsWith("[FAIL]") ? "error" : "warn");
      const failed = /^\[FAIL\] Link (\S+) has failed/.exec(m);
      if (failed) {
        toast.error(`Link ${failed[1]} failed`, {
          description: "Tables are now stale. Run exchange rounds to watch the network react.",
        });
      }
    },
    allowBreakLink: true,
  });

  /** Textbook count-to-infinity setup: a converged A–B–C chain, then B–C fails. */
  const loadChainScenario = useCallback(() => {
    const chain = chainGraph();
    const settled = convergedDVTables(chain);
    const broken = setEdgeWeight(chain, edgeKey("B", "C"), INFINITY_COST);
    setGraph(broken);
    setTables(cloneTables(settled));
    setRound(0);
    setConverged(false);
    setChanges([]);
    setExchanges([]);
    setAuto(false);
    setInspect("B");
    editing.setMode("move");
    push("[SCENARIO] Chain A–B–C loaded and already converged: A knows C at cost 2 via B, B knows C at cost 1 directly.", "accent");
    push("[FAIL] Link B–C has failed. B must now find another way to C — and its only neighbour is A.", "error");
    push(
      opts.splitHorizon || opts.poisonReverse
        ? "[SCENARIO] Split horizon / poison reverse is ON: A will not feed B's own route back to it, so B should give up on C almost at once."
        : "[SCENARIO] Both fixes are OFF: A will advertise cost 2 to C — a route that runs through B itself. Run the rounds and watch the costs climb to the infinity cap of 16.",
      "warn",
    );
  }, [editing, opts.poisonReverse, opts.splitHorizon, push]);

  const restoreDefault = useCallback(() => {
    const g = defaultGraph();
    setGraph(g);
    editing.setMode("move");
    resetVectors(g, "[RESET] Default network restored and vectors reinitialised.");
  }, [editing, resetVectors]);

  const toggleOption = (key: keyof DVOptions) => {
    setOpts((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      push(
        `[CONFIG] ${key === "splitHorizon" ? "Split horizon" : "Poison reverse"} ${
          next[key] ? "ENABLED" : "disabled"
        }. Reset or re-run the rounds to see the difference.`,
        next[key] ? "ok" : "warn",
      );
      return next;
    });
    setConverged(false);
  };

  /* --------------------------------------------------- canvas decoration */
  const changedSet = useMemo(
    () => new Set(changes.map((c) => `${c.router}|${c.dest}`)),
    [changes],
  );

  const nodeTones: Partial<Record<NodeId, NodeTone>> = {};
  for (const id of ids) {
    const anyChange = changes.some((c) => c.router === id);
    nodeTones[id] = id === inspected ? "source" : anyChange ? "current" : "queued";
  }
  if (editing.pendingNode) nodeTones[editing.pendingNode] = "current";

  const edgeTones: Record<string, EdgeTone> = {};
  for (const ex of exchanges) edgeTones[edgeKey(ex.from, ex.to)] = "flow";
  Object.assign(edgeTones, editing.editorEdgeTones);

  const packets: PacketSprite[] = exchanges.slice(0, 24).map((ex, i) => ({
    id: `r${round}-${ex.from}-${ex.to}`,
    from: ex.from,
    to: ex.to,
    color: "#e0a83a",
    label: `D(${ex.from},·)`,
    duration: 0.8,
    delay: Math.min(0.4, i * 0.03),
  }));

  const nodeCards: Partial<Record<NodeId, NodeCard>> | undefined = showCards
    ? Object.fromEntries(
        ids.map((id) => [
          id,
          {
            title: `D(${id},·)`,
            rows: ids
              .filter((d) => d !== id)
              .map((d) => {
                const cell = tables[id]?.[d];
                return {
                  k: d,
                  v: cell ? `${formatCost(cell.cost)}${cell.via ? `/${cell.via}` : ""}` : "∞",
                  changed: changedSet.has(`${id}|${d}`),
                  dead: !cell || cell.cost >= INFINITY_COST,
                };
              }),
          } satisfies NodeCard,
        ]),
      )
    : undefined;

  const rows = useMemo(() => dvRoutingTable(tables, inspected), [tables, inspected]);
  const climbing = changes.filter((c) => c.after.cost > c.before.cost).length;

  return (
    <SimShell
      index="02"
      title="Distance Vector Routing — Bellman-Ford"
      subtitle="Exchange vectors with neighbours only, one synchronous round at a time"
      badge={converged ? "Converged ✓" : `Round ${round}`}
      badgeTone={converged ? "ok" : climbing > 0 ? "danger" : "signal"}
    >
      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-3">
          <GraphCanvas
            graph={graph}
            nodeTones={nodeTones}
            edgeTones={edgeTones}
            packets={packets}
            nodeCards={nodeCards}
            onMoveNode={(id, x, y) => setGraph(moveNode(graph, id, x, y))}
            onNodeClick={editing.onNodeClick}
            onEdgeClick={editing.onEdgeClick}
            caption={`Round ${round}${converged ? " — converged" : ""}`}
            hint="Each card is that router's distance vector: destination and cost/next-hop. Yellow cells changed in the last round."
          />

          {/* ------------------------------------------- round controls */}
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-black/25 p-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={runRound}
                disabled={converged || round >= MAX_ROUNDS}
                className="t-small mono flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-35"
              >
                <Icon name="swap_horiz" size={15} />
                Exchange Round
              </button>
              <button
                type="button"
                onClick={() => setAuto((a) => !a)}
                disabled={converged || round >= MAX_ROUNDS}
                aria-pressed={auto}
                className="t-small mono flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-foreground transition-colors hover:bg-white/5 disabled:opacity-35"
              >
                <Icon name={auto ? "pause" : "fast_forward"} size={15} filled />
                {auto ? "Pause" : "Auto-converge"}
              </button>
              <button
                type="button"
                onClick={() => resetVectors()}
                className="t-small mono flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              >
                <Icon name="refresh" size={15} />
                Reset
              </button>
            </div>
            <div className="t-small mono flex items-center gap-3 sm:ml-auto">
              <span className={converged ? "text-ok" : "text-muted-foreground"}>
                {converged ? "Converged ✓" : `Round ${round} / ${MAX_ROUNDS}`}
              </span>
              <label className="flex items-center gap-1.5 text-dim">
                <input
                  type="checkbox"
                  checked={showCards}
                  onChange={(e) => setShowCards(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[#34d399]"
                />
                vector cards
              </label>
            </div>
          </div>

          <GraphToolbar
            editing={editing}
            graph={graph}
            allowBreakLink
            extra={
              <button
                type="button"
                onClick={restoreDefault}
                className="t-small mono flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              >
                <Icon name="hub" size={14} />
                Default 6-router
              </button>
            }
          />
        </div>

        {/* ------------------------------------------- loop prevention */}
        <div className="space-y-4">
          <div className="panel overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <Icon name="shield" size={15} className="text-ok" />
              <span className="t-pill mono text-muted-foreground">
                Loop prevention
              </span>
            </div>
            <div className="space-y-3 p-3.5">
              {[
                {
                  key: "splitHorizon" as const,
                  name: "Split Horizon",
                  note: "Never advertise a route back out of the interface it was learned on.",
                },
                {
                  key: "poisonReverse" as const,
                  name: "Poison Reverse",
                  note: "Advertise those routes back with cost = ∞ instead of staying silent.",
                },
              ].map((o) => (
                <label
                  key={o.key}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors ${
                    opts[o.key] ? "border-ok/45 bg-ok/[0.07]" : "border-border bg-black/25"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={opts[o.key]}
                    onChange={() => toggleOption(o.key)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#34d399]"
                  />
                  <span>
                    <span className={`t-small mono block ${opts[o.key] ? "text-ok" : "text-foreground"}`}>
                      {o.name}
                      <span className="t-small ml-2 text-dim">
                        {opts[o.key] ? "ON" : "OFF"}
                      </span>
                    </span>
                    <span className="t-small mt-1 block text-muted-foreground">
                      {o.note}
                    </span>
                  </span>
                </label>
              ))}

              <div className="rounded-xl border border-danger/30 bg-danger/[0.06] p-3">
                <p className="t-small mono mb-1.5 flex items-center gap-1.5 text-danger">
                  <Icon name="science" size={14} filled />
                  Count-to-infinity scenario
                </p>
                <p className="t-small text-muted-foreground">
                  Loads a converged A–B–C chain with the B–C link already failed. With both fixes
                  off, run the rounds and watch D(B,C) and D(A,C) climb to the cap of{" "}
                  {INFINITY_COST}. Then switch Split Horizon on, reload and compare.
                </p>
                <button
                  type="button"
                  onClick={loadChainScenario}
                  className="t-small mono mt-3 flex items-center gap-1.5 rounded-full border border-danger/50 bg-danger/15 px-3 py-1.5 text-danger transition-colors hover:bg-danger/25"
                >
                  <Icon name="play_arrow" size={14} filled />
                  Load scenario
                </button>
              </div>

              {climbing > 0 && (
                <p className="t-small mono rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-danger">
                  ⚠ {climbing} cost{climbing === 1 ? "" : "s"} increased this round — routers are
                  believing each other&apos;s stale estimates. This is count-to-infinity.
                </p>
              )}
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <Icon name="sync_alt" size={15} className="text-warn" />
              <span className="t-pill mono text-muted-foreground">
                Last round — advertisements
              </span>
            </div>
            <div className="scroll-thin max-h-40 overflow-y-auto p-3">
              {exchanges.length === 0 ? (
                <p className="t-small mono text-dim">
                  No round run yet. Press &ldquo;Exchange Round&rdquo;.
                </p>
              ) : (
                <ul className="space-y-1">
                  {exchanges.map((ex) => (
                    <li key={`${ex.from}->${ex.to}`} className="t-small mono text-muted-foreground">
                      <span className="text-warn">
                        {ex.from}→{ex.to}
                      </span>{" "}
                      {Object.keys(ex.advertised).length} route(s)
                      {ex.suppressed.length > 0 && (
                        <span className="text-ok"> · withheld {ex.suppressed.join(",")}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------ tables + console */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-3">
          <Select
            label="Routing table of"
            value={inspected}
            options={ids}
            onChange={(v) => setInspect(v)}
            tone="signal"
          />
          <RoutingTableView title={`Router ${inspected} — Destination | Next Hop | Cost`} rows={rows} />
        </div>
        <DiagnosticConsole
          lines={logs}
          status={converged ? "Converged" : auto ? "Exchanging" : round === 0 ? "Ready" : "Paused"}
          statusTone={converged ? "ok" : climbing > 0 ? "error" : auto ? "accent" : "info"}
          onClear={() => setLogs([])}
          height="h-64"
        />
      </div>
    </SimShell>
  );
}
