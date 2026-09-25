"use client";

import { CheckCircle2, FileText, Network, Table2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeSample, DIJKSTRA_SAMPLES, DV_SAMPLES } from "@/data/implementations";
import { runDijkstra } from "@/lib/routing/dijkstra";
import { runDistanceVector } from "@/lib/routing/distanceVector";
import { allDijkstraTables } from "@/lib/routing/dijkstra";
import { forwardPacket } from "@/lib/routing/forwarding";
import { adjacency, defaultGraph, nodeIds } from "@/lib/routing/graph";
import { CodeViewer } from "../CodeViewer";
import { GlowConnector, UnderGlow } from "../GlowConnector";
import { GoldCard, PaperCard, ProductWindow, SourceCard } from "../ProductWindow";
import { CountUp } from "../primitives";
import { MiniGraph } from "./MiniGraph";

/* --- everything below is derived from the real algorithms, never hardcoded --- */
const G = defaultGraph();
const A = runDijkstra(G, "A");
const DV_STEPS = runDistanceVector(G);
const DV_ROUNDS = DV_STEPS[DV_STEPS.length - 1].round;
const DV_UPDATES = DV_STEPS.reduce((n, s) => n + s.changes.length, 0);
const TABLES = allDijkstraTables(G);
const TRIP = forwardPacket(G, TABLES, "A", "F");
const LINK_COUNT = G.edges.length;

/* ================================================================== *
 * 01 — Distance Vector
 * ================================================================== */

export function DistanceVectorIllustration() {
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="relative grid gap-5 sm:grid-cols-[minmax(0,208px)_minmax(0,1fr)] sm:gap-16">
        {/* the three inputs A actually has */}
        <div className="relative z-10 space-y-3">
          <SourceCard label="Vector from B">
            <p className="flex justify-between"><span>D 5</span><span className="text-dim">via D</span></p>
            <p className="flex justify-between"><span>F 10</span><span className="text-dim">via D</span></p>
          </SourceCard>
          <SourceCard label="Vector from C">
            <p className="flex justify-between"><span>D 6</span><span className="text-dim">via B</span></p>
            <p className="flex justify-between"><span>F 11</span><span className="text-dim">via B</span></p>
          </SourceCard>
          <SourceCard label="Local links at A">
            <p className="flex justify-between"><span>B</span><span className="text-emerald-bright">4</span></p>
            <p className="flex justify-between"><span>C</span><span className="text-emerald-bright">2</span></p>
          </SourceCard>
        </div>

        {/* connectors flow from the cards into the table */}
        <div className="pointer-events-none absolute inset-y-4 left-[208px] hidden w-16 sm:block">
          <GlowConnector
            strokeWidth={1.1}
            paths={[
              { d: "M0 13 C 52 13, 48 50, 100 50", delay: 0 },
              { d: "M0 50 C 52 50, 48 50, 100 50", delay: 0.8 },
              { d: "M0 87 C 52 87, 48 50, 100 50", delay: 1.6 },
            ]}
          />
        </div>

        <div className="relative z-10">
          <UnderGlow className="inset-x-0 -inset-y-6" intensity={0.12} />
          <PaperCard
            title="Routing table"
            subtitle="Router A · converged"
            icon={<FileText className="size-5" strokeWidth={1.5} />}
            className="relative"
          >
            <div className="t-small mono">
              <div className="t-pill flex gap-3 border-b border-paper-ink/20 pb-1.5 text-paper-ink/55">
                <span className="w-16">Dest</span>
                <span className="w-20">Next hop</span>
                <span>Cost</span>
              </div>
              {A.routingTable.map((r, i) => (
                <div
                  key={r.destination}
                  className="flex gap-3 border-b border-paper-ink/10 py-1.5 last:border-0"
                  style={{ animation: `fade-rows .5s ease-out ${i * 0.09}s both` }}
                >
                  <span className="w-16 text-paper-ink">{r.destination}</span>
                  <span className="w-20 text-paper-ink/70">{r.nextHop}</span>
                  <span className="text-paper-ink">{r.cost}</span>
                </div>
              ))}
            </div>
          </PaperCard>
        </div>
      </div>

      <div className="space-y-5 lg:border-l lg:border-border lg:pl-6">
        <div>
          <p className="t-pill mono text-dim">Converged entries</p>
          <p className="t-h1 mono mt-1.5 text-foreground">
            <CountUp to={A.routingTable.length} />
            <span className="text-dim"> / {A.routingTable.length}</span>
          </p>
        </div>
        <dl className="t-small mono space-y-2.5">
          {[
            ["Exchange rounds", DV_ROUNDS],
            ["Entries updated", DV_UPDATES],
            ["Neighbours of A", adjacency(G, "A").length],
            ["Routers in network", nodeIds(G).length],
          ].map(([k, v]) => (
            <div key={String(k)} className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-2">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-foreground">
                <CountUp to={Number(v)} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/* ================================================================== *
 * 02 — Link State
 * ================================================================== */

export function LinkStateIllustration() {
  return (
    <div className="relative grid min-w-0 gap-6 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:gap-12">
      <div className="relative z-10 self-start">
        <PaperCard
          title="LSDB"
          subtitle={`${LINK_COUNT} links · identical in every router`}
          icon={<Network className="size-5" strokeWidth={1.5} />}
        >
          <div className="t-small mono grid grid-cols-3 gap-x-3 gap-y-1 text-paper-ink/80">
            {G.edges.map((e) => (
              <span key={e.id}>
                {e.a}–{e.b}
                <span className="ml-1 text-paper-ink/50">{e.weight}</span>
              </span>
            ))}
          </div>
        </PaperCard>
      </div>

      <div className="pointer-events-none absolute top-8 bottom-8 left-[260px] hidden w-12 lg:block">
        <GlowConnector strokeWidth={1.1} paths={[{ d: "M0 30 C 58 30, 42 55, 100 55" }]} />
      </div>

      <Tabs defaultValue="Graph" className="relative z-10 min-w-0 gap-0">
        <UnderGlow className="inset-x-0 -inset-y-8" intensity={0.1} />
        <ProductWindow
          title="Dijkstra run · source A"
          className="relative"
          tabs={
            <TabsList className="h-9 gap-1 bg-transparent p-0">
              {["Graph", "Table", "Tree"].map((t) => (
                <TabsTrigger
                  key={t}
                  value={t}
                  className="t-small mono h-9 rounded-none border-b-2 border-transparent bg-transparent px-3 text-dim shadow-none data-[state=active]:border-emerald-bright data-[state=active]:bg-transparent data-[state=active]:text-foreground"
                >
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>
          }
        >
          <TabsContent value="Graph" className="mt-0">
            <div className="dot-grid h-[240px] p-2 sm:h-[280px]">
              <MiniGraph treeEdges={A.treeEdges} />
            </div>
          </TabsContent>

          <TabsContent value="Table" className="t-small mono mt-0 p-4 sm:p-5">
            <div className="t-pill flex gap-4 border-b border-border/70 pb-2 text-dim">
              <span className="w-14">Node</span>
              <span className="w-16">Dist</span>
              <span className="w-16">Prev</span>
            </div>
            {nodeIds(G).map((id) => (
              <div key={id} className="flex gap-4 border-b border-border/40 py-1.5 last:border-0">
                <span className="w-14 text-foreground">{id}</span>
                <span className="w-16 text-emerald-bright">{A.dist[id]}</span>
                <span className="w-16 text-muted-foreground">{A.prev[id] ?? "—"}</span>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="Tree" className="t-small mono mt-0 p-4 sm:p-5">
            <p className="t-pill mb-3 text-dim">
              Shortest-path tree · {A.treeEdges.length} edges
            </p>
            <div className="space-y-1.5">
              {A.routingTable.map((r) => (
                <p key={r.destination} className="flex items-baseline gap-3">
                  <span className="w-5 text-foreground">{r.destination}</span>
                  <span className="text-muted-foreground">{r.path.join(" → ")}</span>
                  <span className="ml-auto text-emerald-bright">{r.cost}</span>
                </p>
              ))}
            </div>
          </TabsContent>
        </ProductWindow>
      </Tabs>
    </div>
  );
}

/* ================================================================== *
 * 03 — Packet Forwarding
 * ================================================================== */

export function ForwardingIllustration() {
  const decisions = TRIP.hops.filter((h) => h.status === "forward");
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
      <ProductWindow title="Network / Forwarding workspace" className="min-w-0">
        <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
          <div className="space-y-4">
            <GoldCard label="Next hop resolved">
              <p className="t-lead mono">
                A <span className="opacity-60">→</span> F
              </p>
              <p className="t-small mono mt-1.5">
                <span className="line-through opacity-55">∞</span>
                <span className="mx-2">→</span>
                <span className="">{TRIP.totalCost}</span>
              </p>
            </GoldCard>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {decisions.map((h) => (
                <div key={h.router} className="t-small mono">
                  <p className="text-dim">At router {h.router}</p>
                  <p className="text-foreground">
                    → via <span className="text-emerald-bright">{h.nextHop}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="dot-grid rounded-md">
            <MiniGraph path={TRIP.path} showWeights={false} className="h-[210px]" />
          </div>
        </div>
      </ProductWindow>

      <div className="grid grid-cols-2 gap-x-4 gap-y-5 self-start lg:grid-cols-1 lg:border-l lg:border-border lg:pl-6">
        {[
          ["Hops", TRIP.hopCount],
          ["Total cost", TRIP.totalCost],
          ["Tables read", decisions.length],
        ].map(([k, v]) => (
          <div key={String(k)}>
            <p className="t-pill mono text-dim">{k}</p>
            <p className="t-h1 mono mt-1 text-foreground">
              <CountUp to={Number(v)} />
            </p>
          </div>
        ))}
        <div className="col-span-2 flex items-center gap-2 lg:col-span-1">
          <CheckCircle2 className="size-4 text-emerald-bright" strokeWidth={1.75} />
          <span className="t-small mono text-muted-foreground">
            <CountUp to={decisions.length} /> / {decisions.length} delivered
          </span>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== *
 * 04 — Implementation
 * ================================================================== */

export function ImplementationIllustration({ html }: { html: Record<string, string> }) {
  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-2">
      <ProductWindow title="Link State · Dijkstra" className="min-w-0" bodyClassName="min-w-0">
        <CodeViewer samples={DIJKSTRA_SAMPLES as CodeSample[]} html={html} maxHeight="max-h-[300px]" />
      </ProductWindow>
      <ProductWindow title="Distance Vector · Bellman-Ford" className="min-w-0" bodyClassName="min-w-0">
        <CodeViewer samples={DV_SAMPLES as CodeSample[]} html={html} maxHeight="max-h-[300px]" />
      </ProductWindow>
    </div>
  );
}

export { Table2 };
