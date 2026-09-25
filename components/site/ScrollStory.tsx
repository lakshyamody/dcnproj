"use client";

import { useMotionValueEvent, useScroll } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DV_THEORY,
  FORWARDING_THEORY,
  FullTheory,
  IMPLEMENTATION_THEORY,
  LS_THEORY,
  TheoryBody,
} from "./story/theoryContent";
import {
  DistanceVectorIllustration,
  ForwardingIllustration,
  ImplementationIllustration,
  LinkStateIllustration,
} from "./story/illustrations";
import { Reveal, TwoTone } from "./primitives";

interface Step {
  n: string;
  tab: string;
  title: string;
  top: string;
  bottom: string;
  description: string;
  theory: TheoryBody;
}

const STEPS: Step[] = [
  {
    n: "01",
    tab: "Distance Vector",
    title: "Distance Vector",
    top: "Trust your neighbours.",
    bottom: "Share what you know.",
    description:
      "Every router hands its own distance estimates to the routers next door, adds the cost of getting to them, and keeps the cheapest answer. Nobody sees the topology — the table is assembled out of hearsay, one hop per round.",
    theory: DV_THEORY,
  },
  {
    n: "02",
    tab: "Link State",
    title: "Link State",
    top: "See the whole map.",
    bottom: "Plan your own path.",
    description:
      "Each router floods a description of its own links to everyone, so all of them hold an identical database. Then each one runs Dijkstra alone and derives its own shortest-path tree — no negotiation, no waiting.",
    theory: LS_THEORY,
  },
  {
    n: "03",
    tab: "Forwarding",
    title: "Packet Forwarding",
    top: "Every hop.",
    bottom: "One lookup.",
    description:
      "With the tables built, moving a packet is one table lookup per router. No router knows the whole journey; the packet arrives because every table along the way agrees, and is dropped or looped when one of them does not.",
    theory: FORWARDING_THEORY,
  },
  {
    n: "04",
    tab: "Implementation",
    title: "Implementation",
    top: "From theory",
    bottom: "to working code.",
    description:
      "Both algorithms in C, C++, Python and Java. Every program models the default lab network and prints router A's routing table, so its output can be checked against the simulations on this page.",
    theory: IMPLEMENTATION_THEORY,
  },
];

export function ScrollStory({ codeHtml }: { codeHtml: Record<string, string> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  // Only four discrete values, so plain state is cheap here.
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const next = Math.min(STEPS.length - 1, Math.max(0, Math.floor(p * STEPS.length * 0.999)));
    setActive((prev) => (prev === next ? prev : next));
  });

  const jump = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const start = el.offsetTop;
    const travel = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: start + (travel * (i + 0.35)) / STEPS.length, behavior: "smooth" });
  };

  return (
    <section id="story" className="relative scroll-mt-28">
      {/* Heading scrolls away before the pin takes hold. */}
      <div className="mx-auto w-full max-w-[1280px] px-5 pt-24 pb-10 sm:px-8 sm:pt-32 sm:pb-14">
        <Reveal>
          <h2 className="h-section max-w-[18ch] text-foreground">
            Watch routers learn the network.
          </h2>
          <p className="t-lead measure-body mt-5 text-muted-foreground">
            Four stages, in the order a router lives them: hear from your neighbours, see the whole
            map, move the packet, then write it down in code.
          </p>
        </Reveal>
      </div>

      {/* Pinned on large screens; a plain stack below that. */}
      <div ref={ref} className="relative lg:h-[460vh]">
        <div className="lg:sticky lg:top-[90px] lg:flex lg:h-[calc(100vh-90px)] lg:flex-col lg:overflow-hidden">
          <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-5 sm:px-8">
            <div className="relative flex-1 space-y-24 lg:space-y-0 lg:py-6">
              {STEPS.map((step, i) => (
                <article
                  key={step.n}
                  aria-hidden={active !== i ? undefined : undefined}
                  className={cn(
                    "min-w-0 lg:absolute lg:inset-0 lg:flex lg:flex-col lg:justify-center lg:transition-opacity lg:duration-[450ms] lg:ease-out",
                    active === i
                      ? "lg:pointer-events-auto lg:opacity-100"
                      : "lg:pointer-events-none lg:opacity-0",
                  )}
                >
                  <header className="flex items-baseline gap-3">
                    <span className="t-h3 mono text-emerald-bright">{step.n}</span>
                    <h3 className="t-h3 text-foreground">
                      {step.title}
                    </h3>
                  </header>

                  <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
                    <TwoTone top={step.top} bottom={step.bottom} />
                    <p className="t-body max-w-[52ch] text-muted-foreground lg:pt-1">
                      {step.description}
                    </p>
                  </div>

                  <div className="mt-8 min-w-0 lg:mt-9">
                    {i === 0 && <DistanceVectorIllustration />}
                    {i === 1 && <LinkStateIllustration />}
                    {i === 2 && <ForwardingIllustration />}
                    {i === 3 && <ImplementationIllustration html={codeHtml} />}
                  </div>

                  {/* On desktop the accordion would overflow the pinned frame, so
                      the full theory lives in the stacked flow below instead. */}
                  <div className="mt-8 lg:hidden">
                    <FullTheory body={step.theory} />
                  </div>
                </article>
              ))}
            </div>

            {/* ------------------------------------------------ tab bar */}
            <nav
              aria-label="Theory stages"
              className="hidden shrink-0 items-center gap-6 border-t border-border py-4 lg:flex"
            >
              {STEPS.map((s, i) => (
                <button
                  key={s.n}
                  type="button"
                  onClick={() => jump(i)}
                  aria-current={active === i ? "step" : undefined}
                  className={cn(
                    "t-small group relative flex items-baseline gap-2 py-1 transition-colors",
                    active === i ? "text-foreground" : "text-dim hover:text-muted-foreground",
                  )}
                >
                  <span className="t-small mono">{s.n}</span>
                  {s.tab}
                  <span
                    className={cn(
                      "absolute -bottom-1.5 left-0 h-px w-full bg-emerald-bright transition-opacity",
                      active === i ? "opacity-100" : "opacity-0",
                    )}
                  />
                </button>
              ))}
              <span className="t-small mono ml-auto flex items-center gap-2 text-dim">
                Scroll to follow the flow
                <ArrowDown className="size-3.5" strokeWidth={1.5} />
              </span>
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop: the full theory for all four stages, after the pin releases. */}
      <div className="mx-auto hidden w-full max-w-[1280px] px-5 pb-24 sm:px-8 lg:block">
        {STEPS.map((step) => (
          <div key={step.n}>
            <div className="flex items-baseline gap-3 pt-8">
              <span className="t-small mono text-emerald-bright">{step.n}</span>
              <h4 className="t-h3 text-foreground">
                {step.title}
              </h4>
            </div>
            <FullTheory body={step.theory} />
          </div>
        ))}
      </div>
    </section>
  );
}
