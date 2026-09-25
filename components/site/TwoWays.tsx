"use client";

import { CheckCircle2, Router, Zap } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLink, Hairline, Reveal } from "./primitives";

const COMPARISON: { aspect: string; dv: string; ls: string }[] = [
  {
    aspect: "Knowledge of the network",
    dv: "Knows only its neighbours and the distances they claim. It never sees the topology.",
    ls: "Knows the complete topology: every router, every link, every cost.",
  },
  {
    aspect: "Information shared",
    dv: "Its own distance vector — one cost per destination.",
    ls: "Its own link states (LSPs) — the cost of each directly attached link.",
  },
  {
    aspect: "Shared with",
    dv: "Direct neighbours only.",
    ls: "Every router in the area, by flooding.",
  },
  {
    aspect: "Algorithm",
    dv: "Distributed Bellman-Ford, run piecewise across all routers.",
    ls: "Dijkstra, run independently and completely inside each router.",
  },
  {
    aspect: "Convergence",
    dv: "Slow — news travels one hop per update period.",
    ls: "Fast — flooding is near-immediate and each router then recomputes alone.",
  },
  {
    aspect: "Routing loops",
    dv: "Possible; count-to-infinity needs split horizon, poison reverse and hold-down timers.",
    ls: "Essentially loop-free, because every router computes from the same map.",
  },
  {
    aspect: "Bandwidth usage",
    dv: "Small periodic updates, but sent constantly (RIP: every 30 s).",
    ls: "A burst during flooding, then only on change plus a slow refresh.",
  },
  {
    aspect: "CPU / memory",
    dv: "Cheap — one vector and a simple minimum.",
    ls: "Expensive — stores the whole LSDB and runs Dijkstra over it.",
  },
  {
    aspect: "Example protocol",
    dv: "RIP, RIPv2, IGRP (hop count, max 15).",
    ls: "OSPF, IS-IS (cost from interface bandwidth).",
  },
];

export function TwoWays() {
  return (
    <section id="two-ways" className="relative scroll-mt-28 bg-surface">
      <div className="mx-auto w-full max-w-[1280px] px-5 py-24 sm:px-8 sm:py-32">
        <Reveal>
          <h2 className="h-section max-w-[16ch] text-foreground">Two ways routers learn.</h2>
        </Reveal>

        <div className="mt-12 sm:mt-16">
          <Hairline />

          {/* ------------------------------------------------- row 1 */}
          <Reveal className="grid gap-10 py-14 lg:grid-cols-2 lg:gap-16 lg:py-20">
            <div>
              <h3 className="t-h1 text-foreground">
                Distance Vector
              </h3>
              <p className="t-body mt-5 max-w-[34ch] text-muted-foreground">
                Talk to neighbours. Converge together.
              </p>
              <p className="t-body mt-4 max-w-[42ch] text-muted-foreground">
                A router only ever speaks to the routers it is directly wired to. It sends its whole
                distance vector, they add the link cost, and the network settles one hop per round.
              </p>
            </div>
            <PuzzleRow />
          </Reveal>

          <Hairline />

          {/* ------------------------------------------------- row 2 */}
          <Reveal className="grid gap-10 py-14 lg:grid-cols-2 lg:gap-16 lg:py-20">
            <div>
              <h3 className="t-h1 text-foreground">
                Link State
              </h3>
              <p className="t-body mt-5 max-w-[34ch] text-muted-foreground">
                Flood the map. Compute locally.
              </p>
              <p className="t-body mt-4 max-w-[42ch] text-muted-foreground">
                Every router describes its own links and floods that description to all of them. Each
                one then runs Dijkstra by itself over an identical database.
              </p>
            </div>
            <FloodRow />
          </Reveal>

          <Hairline />
        </div>

        {/* ------------------------------------------------- comparison */}
        <Reveal className="mt-14 sm:mt-20">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
            <p className="eyebrow">Side by side</p>
            <ArrowLink href="#simulation" className="t-small text-muted-foreground">
              Run them both
            </ArrowLink>
          </div>

          <div className="panel-card scroll-thin overflow-hidden">
            <Table className="min-w-[40rem]">
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="t-pill mono w-52 px-5 py-3.5 text-dim">
                    Aspect
                  </TableHead>
                  <TableHead className="t-pill mono px-5 py-3.5 text-muted-foreground">
                    Distance Vector
                  </TableHead>
                  <TableHead className="t-pill mono px-5 py-3.5 text-emerald-bright">
                    Link State
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {COMPARISON.map((row) => (
                  <TableRow key={row.aspect} className="border-border/60 hover:bg-white/[0.02]">
                    <TableCell className="t-small px-5 py-4 align-top whitespace-normal text-foreground">
                      {row.aspect}
                    </TableCell>
                    <TableCell className="t-small px-5 py-4 align-top whitespace-normal text-muted-foreground">
                      {row.dv}
                    </TableCell>
                    <TableCell className="t-small px-5 py-4 align-top whitespace-normal text-muted-foreground">
                      {row.ls}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ================================================================== *
 * Row 1 diagram — three tiles joined like puzzle pieces
 * ================================================================== */

function PuzzleRow() {
  return (
    <div className="relative flex items-stretch justify-center self-center">
      <PuzzleTile label="Neighbour" />
      <Knob />
      <PuzzleTile label="Router" primary icon={<Router className="size-5" strokeWidth={1.4} />} />
      <Knob />
      <PuzzleTile label="Neighbour" />
    </div>
  );
}

function PuzzleTile({
  label,
  primary = false,
  icon,
}: {
  label: string;
  primary?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="glass-tile flex h-[150px] w-[104px] shrink-0 flex-col justify-end p-3.5 sm:h-[180px] sm:w-[150px] sm:p-5"
      style={
        primary
          ? {
              background: "linear-gradient(150deg,#1d4630 0%,#12301f 48%,#0e2418 100%)",
              borderColor: "rgba(52,211,153,.38)",
              boxShadow:
                "0 0 22px rgba(4,121,88,.45), inset 0 1px 0 rgba(200,255,225,.18), 0 18px 44px rgba(0,0,0,.5)",
            }
          : undefined
      }
    >
      {icon && <span className="mb-auto text-emerald-bright">{icon}</span>}
      <span
        className={`t-small ${
          primary ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

/** The interlock between two tiles. */
function Knob() {
  return (
    <span className="relative z-10 -mx-[9px] self-center" aria-hidden="true">
      <span
        className="block size-[18px] rounded-full border"
        style={{
          background: "linear-gradient(150deg,#1d4630,#0e2418)",
          borderColor: "rgba(52,211,153,.32)",
          boxShadow: "0 0 10px rgba(4,121,88,.4)",
        }}
      />
    </span>
  );
}

/* ================================================================== *
 * Row 2 diagram — LSPs into a chip, results out
 * ================================================================== */

function FloodRow() {
  const sources = ["LSP from B", "LSP from D", "LSP from E"];
  return (
    <div className="self-center">
      <div className="mb-5 flex items-baseline justify-between">
        <span className="t-small mono text-muted-foreground">Flooded in</span>
        <span className="t-small mono text-muted-foreground">Tree out</span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3 sm:gap-x-5">
        {/* incoming */}
        <div className="space-y-6 sm:space-y-8">
          {sources.map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className="t-small mono shrink-0 text-foreground">{s}</span>
              <span className="h-px flex-1 bg-border" />
            </div>
          ))}
        </div>

        {/* the chip */}
        <div
          className="relative flex h-[120px] w-[76px] flex-col items-center justify-center gap-1.5 rounded-xl sm:h-[140px] sm:w-[92px]"
          style={{
            background: "linear-gradient(160deg,#0f9a6b 0%,#067a55 55%,#045a3f 100%)",
            boxShadow: "0 0 26px rgba(4,121,88,.6), inset 0 1px 0 rgba(220,255,238,.35)",
          }}
        >
          <Zap className="size-5 text-white" strokeWidth={1.6} fill="currentColor" />
          <span className="t-small mono text-white">dijkstra</span>
          <span className="t-small mono text-white/70">&gt;&gt;</span>
        </div>

        {/* outgoing */}
        <div className="space-y-6 sm:space-y-8">
          {sources.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <svg className="h-2 flex-1" preserveAspectRatio="none" viewBox="0 0 100 2">
                <line
                  x1="0"
                  y1="1"
                  x2="100"
                  y2="1"
                  stroke="#34d399"
                  strokeWidth="1.4"
                  className="dash-flow"
                  style={{ animationDelay: `${i * 0.5}s` }}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <CheckCircle2 className="size-5 shrink-0 text-emerald-bright" strokeWidth={1.5} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
