"use client";

import { useEffect, useRef, useState } from "react";
import { allDijkstraTables, runDijkstra } from "@/lib/routing/dijkstra";
import { forwardPacket } from "@/lib/routing/forwarding";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  INFINITY_COST,
  NodeId,
  defaultGraph,
  edgeKey,
  findNode,
  neighbours,
  setEdgeWeight,
} from "@/lib/routing/graph";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * Everything drawn here comes from the real algorithms in lib/routing,
 * on the real default network. Nothing is choreographed by hand: the
 * tree, the order nodes light up in, both paths and both costs are
 * computed once at module load.
 * ------------------------------------------------------------------ */

const G = defaultGraph();
const SOURCE: NodeId = "A";
const DEST: NodeId = "F";
const FAILED_EDGE = edgeKey("D", "E");

const HEALTHY = runDijkstra(G, SOURCE);
const TRIP = forwardPacket(G, allDijkstraTables(G), SOURCE, DEST);

const BROKEN_G = setEdgeWeight(G, FAILED_EDGE, INFINITY_COST);
const REROUTED = runDijkstra(BROKEN_G, SOURCE);
const TRIP2 = forwardPacket(BROKEN_G, allDijkstraTables(BROKEN_G), SOURCE, DEST);

/** Order Dijkstra finalises the nodes in: A, C, B, D, E, F. */
const FINALISE_ORDER = (r: typeof HEALTHY) =>
  r.steps.filter((s) => s.kind === "select").map((s) => s.current as NodeId);

/** Tree edges paired with the step that introduced them, so they can light in order. */
function treeSequence(r: typeof HEALTHY): { id: string; order: number }[] {
  const order = FINALISE_ORDER(r);
  const out: { id: string; order: number }[] = [];
  order.forEach((node, i) => {
    const parent = r.prev[node];
    if (parent) out.push({ id: edgeKey(parent, node), order: i });
  });
  return out;
}

const TREE_HEALTHY = treeSequence(HEALTHY);
const TREE_REROUTED = treeSequence(REROUTED);

/** Hop distance from the source, used to ripple the flood outwards. */
const HOPS: Record<NodeId, number> = (() => {
  const d: Record<NodeId, number> = { [SOURCE]: 0 };
  const queue: NodeId[] = [SOURCE];
  while (queue.length) {
    const u = queue.shift() as NodeId;
    for (const v of neighbours(G, u)) {
      if (d[v] === undefined) {
        d[v] = d[u] + 1;
        queue.push(v);
      }
    }
  }
  return d;
})();
const MAX_HOPS = Math.max(...Object.values(HOPS));

/* ------------------------------------------------------------------ *
 * Timeline
 * ------------------------------------------------------------------ */

const T = {
  floodStart: 900,
  floodEnd: 3900,
  treeStart: 3900,
  treeStep: 420,
  packetsStart: 6600,
  packetsEnd: 9400,
  breakAt: 9400,
  rerouteStart: 10500,
  packets2Start: 12400,
  packets2End: 14800,
  restoreAt: 15600,
  loop: 17000,
} as const;

type Phase = "flood" | "tree" | "forward" | "failed" | "reroute";

const CAPTION: Record<Phase, string> = {
  flood: `flooding link states · ${G.nodes.length} routers`,
  tree: "dijkstra · shortest-path tree from A",
  forward: `forwarding A → F · ${TRIP.path.join("→")} · cost ${TRIP.totalCost}`,
  failed: "link D–E down · tables stale",
  reroute: `rerouted · ${TRIP2.path.join("→")} · cost ${TRIP2.totalCost}`,
};

function phaseAt(t: number): Phase {
  if (t < T.treeStart) return "flood";
  if (t < T.packetsStart) return "tree";
  if (t < T.breakAt) return "forward";
  if (t < T.packets2Start) return t < T.rerouteStart ? "failed" : "reroute";
  return "reroute";
}

/* ------------------------------------------------------------------ *
 * Small maths helpers
 * ------------------------------------------------------------------ */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, t: number) => {
  const p = clamp01((t - a) / (b - a));
  return p * p * (3 - 2 * p);
};
const easeOut = (p: number) => 1 - Math.pow(1 - clamp01(p), 3);

interface Pt {
  x: number;
  y: number;
}

function pathPoints(path: NodeId[]): Pt[] {
  return path.map((id) => {
    const n = findNode(G, id);
    return { x: n?.x ?? 0, y: n?.y ?? 0 };
  });
}

/** Constant-speed point at fraction p along a polyline. */
function pointAt(points: Pt[], p: number): Pt {
  if (points.length < 2) return points[0] ?? { x: 0, y: 0 };
  const segs = points.slice(1).map((pt, i) => Math.hypot(pt.x - points[i].x, pt.y - points[i].y));
  const total = segs.reduce((a, b) => a + b, 0);
  let want = clamp01(p) * total;
  for (let i = 0; i < segs.length; i++) {
    if (want <= segs[i] || i === segs.length - 1) {
      const f = segs[i] === 0 ? 0 : want / segs[i];
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * f,
        y: points[i].y + (points[i + 1].y - points[i].y) * f,
      };
    }
    want -= segs[i];
  }
  return points[points.length - 1];
}

const PATH_1 = pathPoints(TRIP.path);
const PATH_2 = pathPoints(TRIP2.path);

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */

const EMERALD = "52, 211, 153";
const DANGER = "229, 72, 77";

export function HeroRouting({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotionSafe();
  const [phase, setPhase] = useState<Phase>("tree");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // next/font generates a hashed family name; canvas needs the real string.
    const monoVar = getComputedStyle(document.documentElement)
      .getPropertyValue("--font-jetbrains")
      .trim();
    const monoFamily = monoVar ? `${monoVar}, monospace` : "monospace";

    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    let raf = 0;
    let running = false;
    let lastPhase: Phase | null = null;

    const layout = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const cw = Math.max(1, Math.round(w * dpr));
      const ch = Math.max(1, Math.round(h * dpr));
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      // Fit the 800x460 design space, contained, and centre it.
      const scale = Math.min(cw / CANVAS_WIDTH, ch / CANVAS_HEIGHT) * 0.96;
      return {
        scale,
        ox: (cw - CANVAS_WIDTH * scale) / 2,
        oy: (ch - CANVAS_HEIGHT * scale) / 2,
        cw,
        ch,
      };
    };

    const draw = (elapsed: number) => {
      const t = elapsed % T.loop;
      const { scale, ox, oy, cw, ch } = layout();
      ctx.clearRect(0, 0, cw, ch);
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(scale, scale);

      const ph = phaseAt(t);
      if (ph !== lastPhase) {
        lastPhase = ph;
        setPhase(ph);
      }

      const broken = t >= T.breakAt && t < T.restoreAt;
      const tree = t >= T.rerouteStart ? TREE_REROUTED : TREE_HEALTHY;
      const treeBase = t >= T.rerouteStart ? T.rerouteStart : T.treeStart;

      // Fade in at the top of the loop and back out before it wraps.
      const intro = smooth(0, 700, t) * (1 - smooth(T.loop - 800, T.loop, t));

      /* ---------------------------------------------------- edges */
      for (const edge of G.edges) {
        const a = findNode(G, edge.a);
        const b = findNode(G, edge.b);
        if (!a || !b) continue;

        const isBroken = broken && edge.id === FAILED_EDGE;
        const inTree = tree.find((e) => e.id === edge.id);
        let lit = 0;
        if (inTree && !isBroken) {
          const start = treeBase + inTree.order * T.treeStep;
          lit = easeOut(smooth(start, start + 520, t));
        }

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);

        if (isBroken) {
          // Flicker, then settle to a dashed red.
          const since = t - T.breakAt;
          const flicker = since < 900 ? 0.35 + 0.65 * Math.abs(Math.sin(since * 0.03)) : 0.8;
          ctx.setLineDash([9, 9]);
          ctx.strokeStyle = `rgba(${DANGER}, ${flicker * intro})`;
          ctx.lineWidth = 2.2;
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = `rgba(120, 180, 150, ${0.2 * intro})`;
          ctx.lineWidth = 1.1;
          ctx.stroke();

          if (lit > 0) {
            ctx.save();
            ctx.shadowColor = `rgba(${EMERALD}, 0.55)`;
            ctx.shadowBlur = 14;
            ctx.strokeStyle = `rgba(${EMERALD}, ${0.85 * lit * intro})`;
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            // Grow the lit stroke outwards from the parent end.
            ctx.lineTo(a.x + (b.x - a.x) * lit, a.y + (b.y - a.y) * lit);
            ctx.stroke();
            ctx.restore();
          }
        }

        // Link cost — this is a weighted graph, and the numbers are the point.
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        ctx.font = `400 11px ${monoFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = `rgba(5, 10, 8, ${0.92 * intro})`;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") ctx.roundRect(mx - 11, my - 9, 22, 18, 9);
        else ctx.rect(mx - 11, my - 9, 22, 18);
        ctx.fill();
        ctx.strokeStyle = isBroken
          ? `rgba(${DANGER}, ${0.5 * intro})`
          : lit > 0.5
            ? `rgba(${EMERALD}, ${0.4 * intro})`
            : `rgba(120, 180, 150, ${0.18 * intro})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = isBroken
          ? `rgba(${DANGER}, ${0.95 * intro})`
          : lit > 0.5
            ? `rgba(${EMERALD}, ${0.95 * intro})`
            : `rgba(139, 148, 158, ${0.6 * intro})`;
        ctx.fillText(isBroken ? "\u221e" : String(edge.weight), mx, my + 0.5);
      }

      /* ------------------------------------------- the failed link marker */
      if (broken) {
        const a = findNode(G, "D");
        const b = findNode(G, "E");
        if (a && b) {
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          ctx.strokeStyle = `rgba(${DANGER}, ${0.9 * intro})`;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(mx - 7, my - 7);
          ctx.lineTo(mx + 7, my + 7);
          ctx.moveTo(mx + 7, my - 7);
          ctx.lineTo(mx - 7, my + 7);
          ctx.stroke();
        }
      }

      /* ---------------------------------------------------- flood rings */
      if (t >= T.floodStart && t < T.floodEnd) {
        const p = (t - T.floodStart) / (T.floodEnd - T.floodStart);
        const wave = p * (MAX_HOPS + 1.2);
        for (const node of G.nodes) {
          const d = HOPS[node.id] ?? 99;
          const local = wave - d;
          if (local <= 0 || local > 1.3) continue;
          const r = 10 + local * 44;
          ctx.strokeStyle = `rgba(${EMERALD}, ${0.45 * (1 - local / 1.3) * intro})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      /* ---------------------------------------------------- nodes */
      for (const node of G.nodes) {
        const finalisedAt =
          treeBase + FINALISE_ORDER(t >= T.rerouteStart ? REROUTED : HEALTHY).indexOf(node.id) * T.treeStep;
        const active = t >= finalisedAt ? 1 : 0;
        const breathe = 0.5 + 0.5 * Math.sin(elapsed * 0.0013 + node.x * 0.02);

        if (active) {
          ctx.save();
          ctx.shadowColor = `rgba(${EMERALD}, ${0.5 + breathe * 0.25})`;
          ctx.shadowBlur = 16;
          ctx.fillStyle = `rgba(6, 22, 16, ${intro})`;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 17, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        ctx.fillStyle = `rgba(5, 10, 8, ${0.95 * intro})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 17, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = active
          ? `rgba(${EMERALD}, ${(0.75 + breathe * 0.25) * intro})`
          : `rgba(120, 180, 150, ${0.34 * intro})`;
        ctx.lineWidth = active ? 1.7 : 1.1;
        ctx.stroke();

        ctx.fillStyle = active
          ? `rgba(234, 255, 245, ${intro})`
          : `rgba(139, 148, 158, ${0.85 * intro})`;
        ctx.font = `500 13px ${monoFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(node.id, node.x, node.y + 0.5);
      }

      /* ---------------------------------------------------- packets */
      const runPackets = (from: number, to: number, points: Pt[]) => {
        if (t < from || t > to) return;
        const span = to - from;
        for (let k = 0; k < 3; k++) {
          const local = (t - from - k * 620) / (span - 1240);
          if (local < 0 || local > 1) continue;
          const pt = pointAt(points, local);
          const fade = Math.sin(clamp01(local) * Math.PI);
          ctx.save();
          ctx.shadowColor = `rgba(${EMERALD}, 0.9)`;
          ctx.shadowBlur = 18;
          ctx.fillStyle = `rgba(214, 255, 235, ${fade * intro})`;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      };
      runPackets(T.packetsStart, T.packetsEnd, PATH_1);
      runPackets(T.packets2Start, T.packets2End, PATH_2);

      ctx.restore();
    };

    const loop = (now: number) => {
      if (!running) return;
      draw(now - start0);
      raf = requestAnimationFrame(loop);
    };

    let start0 = performance.now();
    const begin = () => {
      if (running || reduced) return;
      running = true;
      start0 = performance.now() - T.treeStart - 3 * T.treeStep;
      raf = requestAnimationFrame(loop);
    };
    const halt = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    // Reduced motion: one settled frame with the tree drawn and no loop.
    const staticFrame = () => draw(T.packetsStart - 200);
    if (reduced) {
      void document.fonts?.ready.then(staticFrame);
      staticFrame();
      setPhase("tree");
    }

    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (reduced) staticFrame();
        else begin();
      } else halt();
    });
    io.observe(canvas);

    const onResize = () => {
      if (reduced) staticFrame();
    };
    window.addEventListener("resize", onResize);
    void document.fonts?.ready.then(() => {
      if (reduced) staticFrame();
    });

    return () => {
      halt();
      io.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [reduced]);

  return (
    <div className={cn("relative", className)}>
      <canvas
        ref={canvasRef}
        className="size-full"
        role="img"
        aria-label={`The six-router lab network: link states flood out from router ${SOURCE}, Dijkstra lights the shortest-path tree, packets travel ${TRIP.path.join(" to ")} at cost ${TRIP.totalCost}, link D to E fails, and traffic reroutes to ${TRIP2.path.join(" to ")} at cost ${TRIP2.totalCost}.`}
      />
      <p
        aria-hidden="true"
        className={cn(
          "t-small mono absolute right-0 bottom-0 flex items-center gap-2 transition-colors duration-500",
          phase === "failed" ? "text-danger" : "text-dim",
        )}
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            phase === "failed" ? "bg-danger" : "bg-emerald-bright",
          )}
        />
        {CAPTION[phase]}
      </p>
    </div>
  );
}

export default HeroRouting;
