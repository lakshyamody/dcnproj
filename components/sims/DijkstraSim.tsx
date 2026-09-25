"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DIJKSTRA_PSEUDOCODE,
  buildFloodingTrace,
  runDijkstra,
} from "@/lib/routing/dijkstra";
import {
  Graph,
  NodeId,
  defaultGraph,
  edgeKey,
  formatCost,
  moveNode,
  nodeIds,
} from "@/lib/routing/graph";
import { Icon } from "../Icon";
import { Pseudocode } from "./Pseudocode";
import { DiagnosticConsole, LogLine } from "./DiagnosticConsole";
import { EdgeTone, GraphCanvas, NodeTone, PacketSprite } from "./GraphCanvas";
import { GraphToolbar, useGraphEditing } from "./useGraphEditing";
import { SimShell, RoutingTableView, Select, PlaybackControls } from "./SimUI";

export function DijkstraSim() {
  const [graph, setGraph] = useState<Graph>(() => defaultGraph());
  const [source, setSource] = useState<NodeId>("A");
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(850);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const logId = useRef(0);

  const ids = useMemo(() => nodeIds(graph).sort(), [graph]);
  const activeSource = ids.includes(source) ? source : (ids[0] ?? "A");

  const flood = useMemo(() => buildFloodingTrace(graph), [graph]);
  const result = useMemo(() => runDijkstra(graph, activeSource), [graph, activeSource]);

  /** One flat timeline: flooding steps first, then the Dijkstra steps. */
  const timeline = useMemo(
    () => [
      ...flood.map((s, i) => ({ kind: "flood" as const, i, message: s.message })),
      ...result.steps.map((s, i) => ({ kind: "dijkstra" as const, i, message: s.message })),
    ],
    [flood, result],
  );

  const total = timeline.length;
  const atEnd = cursor >= total - 1;

  const push = useCallback((text: string, tone?: LogLine["tone"]) => {
    setLogs((prev) => [...prev.slice(-220), { id: logId.current++, text, tone }]);
  }, []);

  const resetRun = useCallback(
    (message?: string) => {
      setCursor(0);
      setPlaying(false);
      if (message) push(message, "accent");
    },
    [push],
  );

  const editing = useGraphEditing({
    graph,
    setGraph: (g) => {
      setGraph(g);
      setCursor(0);
      setPlaying(false);
    },
    makeDefault: defaultGraph,
    onEdit: (m) => push(m, "warn"),
  });

  const advance = useCallback(() => {
    if (cursor >= total - 1) {
      setPlaying(false);
      return;
    }
    const next = cursor + 1;
    setCursor(next);
    const entry = timeline[next];
    push(
      entry.message,
      entry.kind === "flood" ? "accent" : entry.message.startsWith("[DONE]") ? "ok" : "info",
    );
  }, [cursor, push, timeline, total]);

  // Play loop. One timer at a time; it stops itself at the end of the timeline.
  useEffect(() => {
    if (!playing) return;
    if (cursor >= total - 1) {
      setPlaying(false);
      return;
    }
    const t = window.setTimeout(advance, speed);
    return () => window.clearTimeout(t);
  }, [advance, cursor, playing, speed, total]);

  const entry = timeline[Math.min(cursor, total - 1)];
  const inFlood = entry?.kind === "flood";
  const floodStep = flood[inFlood ? entry.i : flood.length - 1];
  const dijkstraStep = result.steps[inFlood ? 0 : entry.i];

  /* ------------------------------------------------ canvas decoration */
  const nodeTones: Partial<Record<NodeId, NodeTone>> = {};
  const nodeBadges: Partial<Record<NodeId, string>> = {};
  const edgeTones: Record<string, EdgeTone> = {};
  const packets: PacketSprite[] = [];

  if (inFlood) {
    for (const id of ids) {
      const held = floodStep.lsdb[id]?.length ?? 0;
      nodeTones[id] = held === ids.length ? "visited" : "queued";
      nodeBadges[id] = `LSDB ${held}/${ids.length}`;
    }
    floodStep.inFlight.forEach((lsp, i) => {
      edgeTones[edgeKey(lsp.from, lsp.to)] = "flow";
      packets.push({
        id: `${entry.i}-${lsp.origin}-${lsp.from}-${lsp.to}`,
        from: lsp.from,
        to: lsp.to,
        color: "#34d399",
        label: `LSP ${lsp.origin}`,
        duration: Math.min(1.1, speed / 1000),
        delay: Math.min(0.5, i * 0.05),
      });
    });
  } else {
    for (const row of dijkstraStep.table) {
      nodeTones[row.node] =
        row.node === dijkstraStep.current
          ? "current"
          : row.visited
            ? "visited"
            : row.node === activeSource
              ? "source"
              : "queued";
      nodeBadges[row.node] = formatCost(row.dist);
    }
    for (const id of dijkstraStep.treeEdges) edgeTones[id] = "tree";
    if (dijkstraStep.relaxing) {
      edgeTones[dijkstraStep.relaxing.edgeId] = dijkstraStep.relaxing.accepted ? "accept" : "reject";
      packets.push({
        id: `relax-${cursor}`,
        from: dijkstraStep.relaxing.from,
        to: dijkstraStep.relaxing.to,
        color: dijkstraStep.relaxing.accepted ? "#34d399" : "#e0a83a",
        label: String(dijkstraStep.relaxing.alt),
        duration: Math.min(0.9, speed / 1000),
      });
    }
  }
  Object.assign(edgeTones, editing.editorEdgeTones);
  if (editing.pendingNode) nodeTones[editing.pendingNode] = "current";

  const phaseLabel = inFlood ? "Phase 1 • LSP Flooding" : "Phase 2 • Dijkstra";
  const status = atEnd
    ? "Converged"
    : playing
      ? inFlood
        ? "Flooding"
        : "Computing"
      : cursor === 0
        ? "Ready"
        : "Paused";

  const lsdbForSource = floodStep.lsdb[activeSource] ?? [];

  return (
    <SimShell
      index="01"
      title="Link State Routing — Dijkstra"
      subtitle="Flood the link states, then compute the shortest-path tree"
      badge={phaseLabel}
      badgeTone={inFlood ? "accent" : atEnd ? "ok" : "signal"}
    >
      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        {/* --------------------------------------------- canvas column */}
        <div className="space-y-3">
          <GraphCanvas
            graph={graph}
            nodeTones={nodeTones}
            nodeBadges={nodeBadges}
            edgeTones={edgeTones}
            packets={packets}
            onMoveNode={(id, x, y) => setGraph(moveNode(graph, id, x, y))}
            onNodeClick={editing.onNodeClick}
            onEdgeClick={editing.onEdgeClick}
            caption={inFlood ? "LSDB synchronisation" : "Shortest-path tree"}
            hint="Drag routers to rearrange. Click a link to change its cost. Bold emerald links form the shortest-path tree."
          />

          <div className="flex flex-wrap items-center gap-2.5">
            <Select
              label="Source router"
              value={activeSource}
              options={ids}
              onChange={(v) => {
                setSource(v);
                resetRun(`[SOURCE] Source router changed to ${v}. Trace reset.`);
              }}
            />
            <span className="t-small mono text-dim">
              step {Math.min(cursor + 1, total)} / {total}
            </span>
          </div>

          <PlaybackControls
            playing={playing}
            atEnd={atEnd}
            speed={speed}
            onStep={advance}
            onTogglePlay={() => setPlaying((p) => !p)}
            onReset={() => resetRun("[RESET] Trace rewound to the start.")}
            onSpeed={setSpeed}
          />

          <GraphToolbar editing={editing} graph={graph} />
        </div>

        {/* --------------------------------------------- pseudocode column */}
        <Pseudocode
          lines={DIJKSTRA_PSEUDOCODE}
          title="Dijkstra — highlighted line is running"
          highlight={inFlood ? undefined : dijkstraStep.pseudoLine}
        />
      </div>

      {/* ------------------------------------------------ data panels */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="panel overflow-hidden">
          <PanelHead icon="table_rows" label="Dijkstra working table" />
          <div className="table-scroll scroll-thin">
            <table className="t-small mono w-full min-w-[26rem] border-collapse text-left">
              <thead>
                <tr className="t-pill border-b border-border text-dim">
                  <th scope="col" className="px-3 py-2">Node</th>
                  <th scope="col" className="px-3 py-2">Distance</th>
                  <th scope="col" className="px-3 py-2">Previous</th>
                  <th scope="col" className="px-3 py-2">Visited</th>
                </tr>
              </thead>
              <tbody>
                {dijkstraStep.table.map((row) => {
                  const isCurrent = row.node === dijkstraStep.current;
                  const isTarget = dijkstraStep.relaxing?.to === row.node;
                  return (
                    <tr
                      key={row.node}
                      className={`border-b border-border/40 last:border-0 ${
                        isCurrent ? "bg-warn/10" : isTarget ? "bg-emerald-bright/10" : ""
                      }`}
                    >
                      <td className={`px-3 py-2 ${isCurrent ? "text-warn" : "text-foreground"}`}>
                        {row.node}
                        {row.node === activeSource && <span className="ml-1.5 text-dim">(src)</span>}
                      </td>
                      <td
                        className={`px-3 py-2 ${
                          Number.isFinite(row.dist) ? "text-emerald-bright" : "text-dim"
                        }`}
                      >
                        {formatCost(row.dist)}
                      </td>
                      <td className="px-3 py-2 text-foreground/70">{row.prev ?? "—"}</td>
                      <td className="px-3 py-2">
                        {row.visited ? (
                          <span className="text-ok">✓</span>
                        ) : (
                          <span className="text-dim">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel overflow-hidden">
            <PanelHead icon="low_priority" label="Priority queue — unvisited set" />
            <div className="p-3">
              {dijkstraStep.queue.length === 0 ? (
                <p className="t-small mono text-ok">Q is empty — every node is finalised.</p>
              ) : (
                <ol className="space-y-1.5">
                  {dijkstraStep.queue.map((q, i) => (
                    <li
                      key={q.node}
                      className={`t-small mono flex items-center gap-2 rounded-md px-2 py-1.5 ${
                        i === 0 ? "bg-emerald-bright/12 text-emerald-bright" : "text-muted-foreground"
                      }`}
                    >
                      <span className="text-dim">{i === 0 ? "head" : `  ${i}`}</span>
                      <span className="text-foreground">{q.node}</span>
                      <span className="ml-auto">dist {formatCost(q.dist)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          <div className="panel overflow-hidden">
            <PanelHead icon="dns" label={`LSDB held by router ${activeSource}`} />
            <div className="table-scroll scroll-thin">
              <table className="t-small mono w-full min-w-[20rem] border-collapse text-left">
                <thead>
                  <tr className="t-pill border-b border-border text-dim">
                    <th scope="col" className="px-3 py-2">LSP origin</th>
                    <th scope="col" className="px-3 py-2">Advertised links (cost)</th>
                  </tr>
                </thead>
                <tbody>
                  {lsdbForSource.map((e) => (
                    <tr key={e.origin} className="border-b border-border/40 last:border-0">
                      <td className="px-3 py-1.5 text-emerald-bright">{e.origin}</td>
                      <td className="px-3 py-1.5 text-foreground/80">
                        {e.links.length === 0
                          ? "no live links"
                          : e.links.map((l) => `${l.neighbour}:${l.cost}`).join("  ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="t-small mono border-t border-border/60 px-3 py-2 text-dim">
              {lsdbForSource.length} / {ids.length} LSPs received
              {lsdbForSource.length === ids.length ? " — map complete" : " — still flooding"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <RoutingTableView
          title={`Routing table computed by ${activeSource}`}
          rows={result.routingTable}
          ready={atEnd}
          notReadyNote="Run the trace to the end to derive the routing table."
        />
        <DiagnosticConsole
          lines={logs}
          status={status}
          statusTone={atEnd ? "ok" : playing ? "accent" : "info"}
          onClear={() => setLogs([])}
          height="h-56"
        />
      </div>
    </SimShell>
  );
}

function PanelHead({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
      <Icon name={icon} size={15} className="text-emerald-bright" />
      <span className="t-pill mono text-muted-foreground">{label}</span>
    </div>
  );
}
