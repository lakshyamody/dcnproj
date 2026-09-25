"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { allDijkstraTables } from "@/lib/routing/dijkstra";
import { allDVRoutingTables, convergedDVTables } from "@/lib/routing/distanceVector";
import { ForwardHop, forwardPacket } from "@/lib/routing/forwarding";
import {
  Graph,
  GraphEdge,
  INFINITY_COST,
  NodeId,
  defaultGraph,
  edgeKey,
  formatCost,
  isBroken,
  moveNode,
  nodeIds,
  setEdgeWeight,
} from "@/lib/routing/graph";
import { RoutingTables } from "@/lib/routing/table";
import { toast } from "sonner";
import { Icon } from "../Icon";
import { DiagnosticConsole, LogLine } from "./DiagnosticConsole";
import { EdgeTone, GraphCanvas, NodeCard, NodeTone, PacketSprite } from "./GraphCanvas";
import { RoutingTableView, Select, SimShell } from "./SimUI";

type TableSource = "ls" | "dv";

const HOP_MS = 1400;

export function ForwardingSim() {
  const [graph, setGraph] = useState<Graph>(() => defaultGraph());
  const [src, setSrc] = useState<NodeId>("A");
  const [dst, setDst] = useState<NodeId>("F");
  const [tableSource, setTableSource] = useState<TableSource>("ls");

  /** Tables frozen at launch, so a mid-flight failure leaves them stale. */
  const [snapshot, setSnapshot] = useState<RoutingTables | null>(null);
  const [hops, setHops] = useState<ForwardHop[]>([]);
  const [hopIndex, setHopIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [failedMidFlight, setFailedMidFlight] = useState(false);
  const [failEdgeId, setFailEdgeId] = useState<string>("D-E");
  const [logs, setLogs] = useState<LogLine[]>([]);
  const logId = useRef(0);

  const ids = useMemo(() => nodeIds(graph).sort(), [graph]);

  const liveTables = useMemo<RoutingTables>(
    () =>
      tableSource === "ls"
        ? allDijkstraTables(graph)
        : allDVRoutingTables(convergedDVTables(graph)),
    [graph, tableSource],
  );

  const push = useCallback((text: string, tone?: LogLine["tone"]) => {
    setLogs((prev) => [...prev.slice(-260), { id: logId.current++, text, tone }]);
  }, []);

  const toneForHop = (h: ForwardHop): LogLine["tone"] =>
    h.status === "delivered" ? "ok" : h.status === "forward" ? "info" : "error";

  /* --------------------------------------------------------------- launch */
  const send = useCallback(() => {
    if (src === dst) {
      push("[SEND] Source and destination are the same router — nothing to forward.", "warn");
      return;
    }
    const tables = liveTables;
    const res = forwardPacket(graph, tables, src, dst);
    setSnapshot(tables);
    setHops(res.hops);
    setHopIndex(0);
    setFailedMidFlight(false);
    setRunning(res.hops.length > 1);
    push(
      `[SEND] Packet launched: ${src} → ${dst}, forwarded with ${
        tableSource === "ls" ? "Dijkstra-computed" : "DV-converged"
      } tables.`,
      "accent",
    );
    if (res.hops[0]) push(res.hops[0].message, toneForHop(res.hops[0]));
    if (res.hops.length <= 1) push(`[RESULT] ${res.outcome}`, res.delivered ? "ok" : "error");
  }, [dst, graph, liveTables, push, src, tableSource]);

  /* -------------------------------------------------------- hop animation */
  useEffect(() => {
    if (!running) return;
    if (hopIndex >= hops.length - 1) {
      setRunning(false);
      return;
    }
    const t = window.setTimeout(() => {
      const next = hopIndex + 1;
      setHopIndex(next);
      const hop = hops[next];
      if (hop) push(hop.message, toneForHop(hop));
    }, HOP_MS);
    return () => window.clearTimeout(t);
  }, [hopIndex, hops, push, running]);

  // Closing summary, emitted once the walk has finished.
  const summarised = useRef<string>("");
  const summary = useMemo(() => {
    if (hops.length === 0) return null;
    const path: NodeId[] = [hops[0].router];
    let cost = 0;
    for (const h of hops) {
      if (h.status === "forward" && h.nextHop) {
        path.push(h.nextHop);
        cost += Number.isFinite(h.hopCost) ? h.hopCost : 0;
      }
    }
    const last = hops[hops.length - 1];
    return {
      path,
      cost,
      hopCount: path.length - 1,
      delivered: last.status === "delivered",
      status: last.status,
    };
  }, [hops]);

  useEffect(() => {
    if (running || !summary || hopIndex < hops.length - 1) return;
    const key = `${hops.length}|${summary.path.join("")}|${summary.status}`;
    if (summarised.current === key) return;
    summarised.current = key;
    push(
      summary.delivered
        ? `[RESULT] Delivered. Path ${summary.path.join(" → ")}, total cost ${summary.cost}, ${summary.hopCount} hop(s).`
        : `[RESULT] Not delivered (${summary.status}). Reached ${summary.path.join(" → ")} at a cost of ${summary.cost} before failing.`,
      summary.delivered ? "ok" : "error",
    );
  }, [hopIndex, hops.length, push, running, summary]);

  /* ------------------------------------------------- mid-flight failure */
  const failLinkNow = useCallback(() => {
    const edge = graph.edges.find((e) => e.id === failEdgeId);
    if (!edge || isBroken(edge)) return;
    const nextGraph = setEdgeWeight(graph, failEdgeId, INFINITY_COST);
    setGraph(nextGraph);
    setFailedMidFlight(true);
    push(
      `[FAIL] Link ${edge.a}–${edge.b} has just gone down. Every routing table still says otherwise.`,
      "error",
    );
    toast.error(`Link ${edge.a}–${edge.b} failed`, {
      description: "The packet is still being forwarded from tables computed before the failure.",
    });

    if (!snapshot || hops.length === 0) return;

    // Recompute the rest of the journey from where the packet is standing,
    // still using the STALE tables — that is the whole point of the demo.
    const at = hops[hopIndex].router;
    const tail = forwardPacket(nextGraph, snapshot, at, dst);
    const merged = [...hops.slice(0, hopIndex), ...tail.hops];
    setHops(merged);
    setRunning(merged.length - 1 > hopIndex);
    summarised.current = "";
    const hop = merged[hopIndex];
    if (hop) push(hop.message, toneForHop(hop));
  }, [dst, failEdgeId, graph, hopIndex, hops, push, snapshot]);

  const reconvergeAndResend = useCallback(() => {
    push(
      `[RECONVERGE] Routing protocol has re-run over the current topology. Tables rebuilt from ${
        tableSource === "ls" ? "Dijkstra" : "the converged distance vectors"
      }.`,
      "ok",
    );
    setFailedMidFlight(false);
    window.setTimeout(send, 30);
  }, [push, send, tableSource]);

  const restoreLinks = useCallback(() => {
    const restored: Graph = {
      nodes: graph.nodes.map((n) => ({ ...n })),
      edges: graph.edges.map((e) => (isBroken(e) ? { ...e, weight: defaultWeight(e) } : { ...e })),
    };
    setGraph(restored);
    setFailedMidFlight(false);
    setHops([]);
    setHopIndex(0);
    setRunning(false);
    push("[RESET] All links restored to the default network and the packet cleared.", "accent");
  }, [graph, push]);

  /* --------------------------------------------------- canvas decoration */
  const current = hops[hopIndex];
  const travelled = useMemo(() => {
    const p: NodeId[] = hops.length > 0 ? [hops[0].router] : [];
    for (let i = 0; i < hopIndex; i++) {
      const h = hops[i];
      if (h.status === "forward" && h.nextHop) p.push(h.nextHop);
    }
    return p;
  }, [hopIndex, hops]);

  const nodeTones: Partial<Record<NodeId, NodeTone>> = {};
  for (const id of ids) {
    nodeTones[id] =
      id === current?.router
        ? current.status === "dropped" || current.status === "loop"
          ? "dead"
          : "current"
        : travelled.includes(id)
          ? "visited"
          : id === dst
            ? "source"
            : "queued";
  }

  const edgeTones: Record<string, EdgeTone> = {};
  for (let i = 0; i + 1 < travelled.length; i++) {
    edgeTones[edgeKey(travelled[i], travelled[i + 1])] = "tree";
  }
  if (current?.status === "forward" && current.nextHop) {
    edgeTones[edgeKey(current.router, current.nextHop)] = "accept";
  }
  if (current?.status === "dropped" && current.nextHop) {
    edgeTones[edgeKey(current.router, current.nextHop)] = "broken";
  }

  const packets: PacketSprite[] =
    current && current.status === "forward" && current.nextHop
      ? [
          {
            id: `pkt-${hopIndex}-${current.router}-${current.nextHop}`,
            from: current.router,
            to: current.nextHop,
            color: "#e0a83a",
            icon: "mail",
            duration: HOP_MS / 1000 - 0.35,
          },
        ]
      : current
        ? [
            {
              id: `pkt-static-${hopIndex}-${current.status}`,
              from: current.router,
              to: current.router,
              color: current.status === "delivered" ? "#34d399" : "#e5484d",
              icon: current.status === "delivered" ? "mark_email_read" : "block",
              duration: 0.4,
            },
          ]
        : [];

  // The router currently making a decision shows its own table on the canvas.
  const nodeCards: Partial<Record<NodeId, NodeCard>> | undefined = current
    ? {
        [current.router]: {
          title: `table of ${current.router}`,
          rows: current.table.map((r) => ({
            k: r.destination,
            v: `${r.nextHop ?? "—"}/${formatCost(r.cost)}`,
            changed: r.destination === dst,
            dead: r.nextHop === null,
          })),
        },
      }
    : undefined;

  const status = running
    ? "In flight"
    : current?.status === "delivered"
      ? "Delivered"
      : current?.status === "dropped" || current?.status === "loop"
        ? current.status === "loop"
          ? "Looping"
          : "Dropped"
        : "Ready";

  return (
    <SimShell
      index="03"
      title="Packet Forwarding using Routing Tables"
      subtitle="One lookup per router, hop by hop, until the packet arrives — or does not"
      badge={status}
      badgeTone={
        status === "Delivered" ? "ok" : status === "Ready" ? "accent" : status === "In flight" ? "signal" : "danger"
      }
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
            caption={current ? `Hop ${hopIndex} at ${current.router}` : "Idle"}
            hint="The card beside the active router is its routing table (destination → next hop / cost); the row for the packet's destination is highlighted."
          />

          <div className="flex flex-wrap items-end gap-2.5 rounded-xl border border-border bg-black/25 p-3">
            <Select label="Source" value={src} options={ids} onChange={setSrc} />
            <Select label="Destination" value={dst} options={ids} onChange={setDst} tone="signal" />
            <label className="t-pill mono flex items-center gap-2 text-dim">
              Tables
              <select
                value={tableSource}
                onChange={(e) => setTableSource(e.target.value as TableSource)}
                className="t-small mono rounded-md border border-border bg-black/50 px-2.5 py-1.5 normal-case text-emerald-bright"
              >
                <option value="ls" className="bg-panel text-foreground">Dijkstra-computed (Link State)</option>
                <option value="dv" className="bg-panel text-foreground">DV-converged (Bellman-Ford)</option>
              </select>
            </label>
            <button
              type="button"
              onClick={send}
              className="t-small mono ml-auto flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Icon name="send" size={15} />
              Send Packet
            </button>
          </div>

          {/* ---------------------------------------- mid-flight failure */}
          <div className="rounded-xl border border-danger/25 bg-danger/[0.05] p-3">
            <p className="t-small mono mb-2.5 flex items-center gap-1.5 text-danger">
              <Icon name="bolt" size={14} filled />
              Fail a link mid-flight
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="t-pill mono flex items-center gap-2 text-dim">
                Link
                <select
                  value={failEdgeId}
                  onChange={(e) => setFailEdgeId(e.target.value)}
                  className="t-small mono rounded-md border border-border bg-black/50 px-2.5 py-1.5 normal-case text-danger"
                >
                  {graph.edges.map((e) => (
                    <option key={e.id} value={e.id} className="bg-panel text-foreground">
                      {e.a}–{e.b} {isBroken(e) ? "(down)" : `(${e.weight})`}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={failLinkNow}
                className="t-small mono flex items-center gap-1.5 rounded-full border border-danger/50 bg-danger/15 px-3 py-1.5 text-danger transition-colors hover:bg-danger/25"
              >
                <Icon name="heart_broken" size={14} />
                Fail now
              </button>
              <button
                type="button"
                onClick={reconvergeAndResend}
                className="t-small mono flex items-center gap-1.5 rounded-full border border-ok/50 bg-ok/12 px-3 py-1.5 text-ok transition-colors hover:bg-ok/20"
              >
                <Icon name="autorenew" size={14} />
                Re-converge &amp; resend
              </button>
              <button
                type="button"
                onClick={restoreLinks}
                className="t-small mono flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Icon name="restart_alt" size={14} />
                Restore
              </button>
            </div>
            <p className="t-small mt-2.5 text-muted-foreground">
              Break a link while the envelope is still moving. The tables were computed before the
              failure, so the packet is forwarded over a link that no longer exists and is{" "}
              <span className="text-danger">dropped</span> — or, where two routers disagree, it{" "}
              <span className="text-danger">loops</span> until its TTL expires. Re-converge to fix
              it.
            </p>
            {failedMidFlight && (
              <p className="t-small mono mt-2.5 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-warn">
                Tables are now stale. Until the protocol re-converges, forwarding decisions are being
                made from out-of-date information.
              </p>
            )}
          </div>
        </div>

        {/* ---------------------------------------------- hop trace column */}
        <div className="space-y-4">
          <div className="panel overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <Icon name="timeline" size={15} className="text-emerald-bright" />
              <span className="t-pill mono text-muted-foreground">
                Hop-by-hop trace
              </span>
            </div>
            <ol className="scroll-thin max-h-56 overflow-y-auto p-3">
              {hops.length === 0 ? (
                <li className="t-small mono text-dim">
                  Press &ldquo;Send Packet&rdquo; to start forwarding.
                </li>
              ) : (
                hops.map((h, i) => (
                  <li
                    key={`${i}-${h.router}-${h.status}`}
                    className={`t-small mono flex gap-2.5 rounded-md px-2 py-1.5 ${
                      i === hopIndex
                        ? "bg-emerald-bright/12 text-foreground"
                        : i < hopIndex
                          ? "text-muted-foreground"
                          : "text-dim opacity-60"
                    }`}
                  >
                    <span className="w-4 shrink-0 text-right text-dim">{i}</span>
                    <span className="min-w-0">
                      <span className="text-foreground">{h.router}</span>
                      {h.status === "forward" ? (
                        <>
                          {" → "}
                          <span className="text-warn">{h.nextHop}</span>
                          <span className="text-dim"> (link {h.hopCost})</span>
                        </>
                      ) : (
                        <span
                          className={
                            h.status === "delivered" ? " text-ok" : " text-danger"
                          }
                        >
                          {" "}
                          {h.status}
                        </span>
                      )}
                    </span>
                  </li>
                ))
              )}
            </ol>
          </div>

          {summary && (
            <div className="panel overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
                <Icon name="summarize" size={15} className="text-ok" />
                <span className="t-pill mono text-muted-foreground">
                  Outcome
                </span>
              </div>
              <dl className="t-small mono divide-y divide-border/50">
                {[
                  ["Path", summary.path.join(" → ")],
                  ["Total cost", String(summary.cost)],
                  ["Hop count", String(summary.hopCount)],
                  [
                    "Status",
                    summary.delivered ? "delivered ✓" : `${summary.status} ✗`,
                  ],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-3 px-3 py-2">
                    <dt className="w-20 shrink-0 text-dim">{k}</dt>
                    <dd
                      className={
                        k === "Status"
                          ? summary.delivered
                            ? "text-ok"
                            : "text-danger"
                          : "text-foreground break-all"
                      }
                    >
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <RoutingTableView
          title={
            current
              ? `Table consulted at router ${current.router}`
              : `Table of router ${src} (${tableSource === "ls" ? "Dijkstra" : "DV"})`
          }
          rows={current ? current.table : (liveTables[src] ?? [])}
          highlightDestination={dst}
          compact
        />
        <DiagnosticConsole
          lines={logs}
          status={status}
          statusTone={
            status === "Delivered" ? "ok" : status === "In flight" ? "accent" : status === "Ready" ? "info" : "error"
          }
          onClear={() => setLogs([])}
          height="h-64"
        />
      </div>
    </SimShell>
  );
}

/** Restore a broken link to whatever the default network says it should cost. */
function defaultWeight(edge: GraphEdge): number {
  const base = defaultGraph().edges.find((e) => e.id === edge.id);
  return base ? base.weight : 1;
}
