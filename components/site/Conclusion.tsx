"use client";

import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Reveal } from "./primitives";

export function Conclusion() {
  const complete = () => {
    toast.success("Experiment complete", {
      description: "Routing tables built with both algorithms, and a packet forwarded through them.",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section id="conclusion" className="relative scroll-mt-28">
      {/* The page shifts from near-black into deep green here. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-56"
        style={{ background: "linear-gradient(180deg, var(--background) 0%, var(--deep) 100%)" }}
      />
      <div className="relative bg-deep pt-56">
        <div className="mx-auto w-full max-w-[1280px] px-5 pb-28 text-center sm:px-8 sm:pb-36">
          <Reveal>
            <h2 className="h-section mx-auto max-w-[20ch]">
              <span className="block text-foreground">Distance Vector trusts neighbours.</span>
              <span className="block text-muted-foreground">Link State trusts the map.</span>
            </h2>

            <p className="t-body mx-auto mt-7 max-w-[70ch] text-muted-foreground">
              Routing tables are built, not configured. Distance Vector Routing builds them with a
              distributed Bellman-Ford: each router shares its own distance estimates with its direct
              neighbours, which is cheap and simple but converges one hop per period and can
              count-to-infinity until split horizon, poison reverse and hold-down timers restrain it.
              Link State Routing builds them by flooding link state packets so that every router holds
              an identical LSDB, then running Dijkstra locally — far more memory and CPU, but fast
              convergence and essentially no loops. Both end at the same artefact, a{" "}
              <span className="mono text-foreground">Destination | Next Hop | Cost</span> table, and
              packet forwarding then needs nothing more than one lookup per router: the packet crosses
              the network on a chain of independent local decisions, and arrives only because every
              table along the way agrees.
            </p>

            <div className="mt-10 flex justify-center">
              <Button
                onClick={complete}
                className="t-body h-12 gap-2.5 rounded-md bg-primary px-6 text-primary-foreground hover:bg-primary/90"
              >
                Experiment complete
                <Check className="size-4" strokeWidth={2.25} />
              </Button>
            </div>

            <dl className="mx-auto mt-14 grid max-w-3xl gap-px overflow-hidden rounded-lg border border-emerald-bright/15 bg-emerald-bright/10 sm:grid-cols-3">
              {[
                ["Dijkstra from A", "B 3 · C 2 · D 8 · E 10 · F 13"],
                ["DV converged", "identical costs, next hop C"],
                ["RIP infinity", "16 = unreachable"],
              ].map(([k, v]) => (
                <div key={k} className="bg-deep px-5 py-5">
                  <dt className="eyebrow">{k}</dt>
                  <dd className="t-small mono mt-2 text-emerald-bright">{v}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
