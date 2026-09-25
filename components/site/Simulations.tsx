"use client";

import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Reveal } from "./primitives";
import { ProductWindow } from "./ProductWindow";

const Loading = () => (
  <div className="flex h-[420px] items-center justify-center">
    <span className="t-small mono text-dim">
      loading simulation
      <span className="caret-blink ml-0.5 text-emerald-bright">▌</span>
    </span>
  </div>
);

// Each simulation is a sizeable client bundle; none of them load until the
// section is reached and its tab is opened.
const DijkstraSim = dynamic(() => import("@/components/sims/DijkstraSim").then((m) => m.DijkstraSim), {
  ssr: false,
  loading: Loading,
});
const DistanceVectorSim = dynamic(
  () => import("@/components/sims/DistanceVectorSim").then((m) => m.DistanceVectorSim),
  { ssr: false, loading: Loading },
);
const ForwardingSim = dynamic(
  () => import("@/components/sims/ForwardingSim").then((m) => m.ForwardingSim),
  { ssr: false, loading: Loading },
);

const TABS = [
  { value: "ls", label: "Link State (Dijkstra)" },
  { value: "dv", label: "Distance Vector" },
  { value: "fw", label: "Packet Forwarding" },
] as const;

export function Simulations() {
  return (
    <section id="simulation" className="relative scroll-mt-28 bg-surface">
      <div className="mx-auto w-full max-w-[1280px] px-5 py-24 sm:px-8 sm:py-32">
        <Reveal>
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-16">
            <h2 className="h-section text-foreground">One network. Three views.</h2>
            <p className="t-lead measure-body text-muted-foreground lg:pt-2">
              The same six routers throughout —{" "}
              <span className="mono text-foreground">
                A-B 4, A-C 2, B-C 1, B-D 5, C-D 8, C-E 10, D-E 2, D-F 6, E-F 3
              </span>
              . Build the tables with Dijkstra, build them again with Bellman-Ford, then send a packet
              through them. Every algorithm step is logged in the diagnostic console.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08} className="mt-12">
          <Tabs defaultValue="ls" className="gap-0">
            <ProductWindow
              title="Network / Routing workspace"
              tabs={
                <TabsList className="scroll-thin h-10 w-full justify-start gap-1 overflow-x-auto bg-transparent p-0">
                  {TABS.map((t) => (
                    <TabsTrigger
                      key={t.value}
                      value={t.value}
                      className="t-small mono h-10 shrink-0 rounded-none border-b-2 border-transparent bg-transparent px-3 whitespace-nowrap text-dim shadow-none data-[state=active]:border-emerald-bright data-[state=active]:bg-transparent data-[state=active]:text-foreground"
                    >
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              }
            >
              <TabsContent value="ls" className="mt-0">
                <DijkstraSim />
              </TabsContent>
              <TabsContent value="dv" className="mt-0">
                <DistanceVectorSim />
              </TabsContent>
              <TabsContent value="fw" className="mt-0">
                <ForwardingSim />
              </TabsContent>
            </ProductWindow>
          </Tabs>
        </Reveal>
      </div>
    </section>
  );
}
