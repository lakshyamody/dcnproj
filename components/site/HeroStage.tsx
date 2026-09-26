"use client";

import { useEffect, useRef } from "react";
import { runDijkstra } from "@/lib/routing/dijkstra";
import { allDijkstraTables } from "@/lib/routing/dijkstra";
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

/* ------------------------------------------------------------------ *
 * Everything drawn here comes from the real algorithms on the real
 * default network. Scroll drives the camera *and* the algorithm: you
 * fly through the topology while it floods, computes and forwards.
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

const order = (r: typeof HEALTHY) =>
  r.steps.filter((s) => s.kind === "select").map((s) => s.current as NodeId);

function treeSequence(r: typeof HEALTHY) {
  const seq: { id: string; rank: number }[] = [];
  order(r).forEach((node, i) => {
    const parent = r.prev[node];
    if (parent) seq.push({ id: edgeKey(parent, node), rank: i });
  });
  return seq;
}

const TREE = treeSequence(HEALTHY);
const TREE_REROUTED = treeSequence(REROUTED);

/** Hop distance from the source, so the flood can ripple outwards. */
const HOPS: Record<NodeId, number> = (() => {
  const d: Record<NodeId, number> = { [SOURCE]: 0 };
  const q: NodeId[] = [SOURCE];
  while (q.length) {
    const u = q.shift() as NodeId;
    for (const v of neighbours(G, u)) {
      if (d[v] === undefined) {
        d[v] = d[u] + 1;
        q.push(v);
      }
    }
  }
  return d;
})();
const MAX_HOPS = Math.max(...Object.values(HOPS));

/* ------------------------------------------------------------------ *
 * Scene
 * ------------------------------------------------------------------ */

/** Copies of the topology at increasing depth — the tunnel you fly through. */
const SLICES = 5;
const SLICE_GAP = 1100;
const FOCAL = 780;

/** Camera travel across the hero scroll. It stops short of the last slices so
 *  there is always topology ahead rather than an empty frame at the end. */
const CAM_START_Z = 700;
const CAM_END_Z = -2400;

interface Star {
  x: number;
  y: number;
  z: number;
  r: number;
  warm: boolean;
}

const STAR_COUNT = 420;

function makeStars(): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: (Math.random() - 0.5) * 3400,
      y: (Math.random() - 0.5) * 2200,
      z: CAM_END_Z - 400 + Math.random() * (CAM_START_Z - CAM_END_Z + 900),
      r: 0.5 + Math.random() * 1.4,
      warm: Math.random() > 0.78,
    });
  }
  return stars;
}

const EMERALD = "52, 211, 153";
const DANGER = "229, 72, 77";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, t: number) => {
  const p = clamp01((t - a) / (b - a));
  return p * p * (3 - 2 * p);
};
const easeOut = (p: number) => 1 - Math.pow(1 - clamp01(p), 3);

/**
 * Fixed, full-viewport stage behind the hero. Scroll flies the camera through
 * five depth-slices of the lab network while the algorithm runs.
 */
export interface HeroStageState {
  /** 0..1 through the hero, drives the camera and the algorithm. */
  p: number;
  /** 1 while the hero owns the viewport, easing to 0 as it scrolls away. */
  alpha: number;
}

export function HeroStage({ getState }: { getState: () => HeroStageState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotionSafe();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const monoVar = getComputedStyle(document.documentElement)
      .getPropertyValue("--font-jetbrains")
      .trim();
    const mono = monoVar ? `${monoVar}, monospace` : "monospace";

    const stars = makeStars();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    let raf = 0;
    let running = false;

    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      return { w, h };
    };

    /** Pinhole projection. Returns null for anything behind the camera. */
    const project = (x: number, y: number, z: number, camZ: number, cx: number, cy: number) => {
      const dz = camZ - z;
      if (dz < 60) return null;
      const s = FOCAL / dz;
      return { x: cx + x * s, y: cy - y * s, s, dz };
    };

    const draw = (time: number) => {
      const { w, h } = resize();
      const { p: rawP, alpha } = getState();
      const p = clamp01(rawP);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const camZ = CAM_START_Z + (CAM_END_Z - CAM_START_Z) * easeOut(p);
      const drift = reduced ? 0 : time * 0.00018;

      // Hand the scene off to the page only once the hero has scrolled away.
      const stageAlpha = clamp01(alpha);
      if (stageAlpha <= 0.01) return;
      ctx.globalAlpha = stageAlpha;

      /* ------------------------------------------------ starfield */
      for (const st of stars) {
        const pr = project(st.x, st.y, st.z, camZ, cx, cy);
        if (!pr) continue;
        const fade = clamp01(1 - pr.dz / 4200) * clamp01(pr.dz / 260);
        if (fade <= 0.01) continue;
        ctx.fillStyle = st.warm
          ? `rgba(214, 255, 235, ${fade * 0.8})`
          : `rgba(${EMERALD}, ${fade * 0.55})`;
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, Math.max(0.4, st.r * pr.s * dpr * 1.4), 0, Math.PI * 2);
        ctx.fill();
      }

      /* ------------------------------------------------ network slices */
      // Which phase of the algorithm is running, driven by scroll.
      const flood = smooth(0.02, 0.34, p);
      const treeT = smooth(0.3, 0.66, p);
      const fwd = smooth(0.6, 0.9, p);
      const broken = p > 0.74;
      const activeTree = broken ? TREE_REROUTED : TREE;
      const path = broken ? TRIP2.path : TRIP.path;

      for (let s = 0; s < SLICES; s++) {
        const sliceZ = -s * SLICE_GAP;
        // Only the slice nearest the camera carries the full algorithm state.
        const lead = s === 0;
        const spin = drift * (s % 2 === 0 ? 1 : -1) + s * 0.42;
        const cos = Math.cos(spin);
        const sin = Math.sin(spin);
        const scale = 1 - s * 0.06;

        const world = (n: { x: number; y: number }) => {
          // Centre the 800x460 design space, then rotate about the z axis.
          const lx = (n.x - CANVAS_WIDTH / 2) * scale;
          const ly = (CANVAS_HEIGHT / 2 - n.y) * scale;
          return { x: lx * cos - ly * sin, y: lx * sin + ly * cos };
        };

        const depthFade = clamp01(1 - s * 0.16);

        // edges
        for (const edge of G.edges) {
          const a = findNode(G, edge.a);
          const b = findNode(G, edge.b);
          if (!a || !b) continue;
          const wa = world(a);
          const wb = world(b);
          const pa = project(wa.x, wa.y, sliceZ, camZ, cx, cy);
          const pb = project(wb.x, wb.y, sliceZ, camZ, cx, cy);
          if (!pa || !pb) continue;

          const isDead = broken && edge.id === FAILED_EDGE;
          const inTree = activeTree.find((e) => e.id === edge.id);
          let lit = 0;
          if (inTree && !isDead) {
            const from = inTree.rank / activeTree.length;
            lit = easeOut(smooth(from * 0.9, from * 0.9 + 0.22, treeT));
          }

          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          if (isDead) {
            ctx.lineTo(pb.x, pb.y);
            ctx.setLineDash([9 * pa.s, 9 * pa.s]);
            ctx.strokeStyle = `rgba(${DANGER}, ${0.85 * depthFade})`;
            ctx.lineWidth = Math.max(1, 2.4 * pa.s * dpr);
            ctx.stroke();
            ctx.setLineDash([]);
          } else {
            ctx.lineTo(pb.x, pb.y);
            ctx.strokeStyle = `rgba(120, 180, 150, ${0.2 * depthFade})`;
            ctx.lineWidth = Math.max(0.5, 1.1 * pa.s * dpr);
            ctx.stroke();

            if (lit > 0) {
              ctx.save();
              ctx.shadowColor = `rgba(${EMERALD}, 0.5)`;
              ctx.shadowBlur = 16 * pa.s;
              ctx.strokeStyle = `rgba(${EMERALD}, ${0.9 * lit * depthFade})`;
              ctx.lineWidth = Math.max(1, 2.6 * pa.s * dpr);
              ctx.beginPath();
              ctx.moveTo(pa.x, pa.y);
              ctx.lineTo(pa.x + (pb.x - pa.x) * lit, pa.y + (pb.y - pa.y) * lit);
              ctx.stroke();
              ctx.restore();
            }
          }
        }

        // nodes
        for (const node of G.nodes) {
          const wn = world(node);
          const pn = project(wn.x, wn.y, sliceZ, camZ, cx, cy);
          if (!pn) continue;
          const rank = order(broken ? REROUTED : HEALTHY).indexOf(node.id);
          const on = treeT > (rank / 6) * 0.9;
          const r = Math.max(1.5, 17 * pn.s * dpr);

          if (on) {
            ctx.save();
            ctx.shadowColor = `rgba(${EMERALD}, 0.6)`;
            ctx.shadowBlur = 18 * pn.s;
            ctx.fillStyle = `rgba(6, 22, 16, ${depthFade})`;
            ctx.beginPath();
            ctx.arc(pn.x, pn.y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          ctx.fillStyle = `rgba(5, 10, 8, ${0.92 * depthFade})`;
          ctx.beginPath();
          ctx.arc(pn.x, pn.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = on
            ? `rgba(${EMERALD}, ${0.9 * depthFade})`
            : `rgba(120, 180, 150, ${0.34 * depthFade})`;
          ctx.lineWidth = Math.max(0.6, 1.5 * pn.s * dpr);
          ctx.stroke();

          // Labels only where they are legible.
          if (pn.s > 0.42 && lead) {
            ctx.fillStyle = on
              ? `rgba(234, 255, 245, ${depthFade})`
              : `rgba(139, 148, 158, ${0.8 * depthFade})`;
            ctx.font = `500 ${Math.round(13 * pn.s * dpr)}px ${mono}`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(node.id, pn.x, pn.y);
          }
        }

        /* ------------------------------------------ flood rings (lead slice) */
        if (lead && flood > 0 && flood < 1) {
          const wave = flood * (MAX_HOPS + 1.3);
          for (const node of G.nodes) {
            const local = wave - (HOPS[node.id] ?? 99);
            if (local <= 0 || local > 1.3) continue;
            const wn = world(node);
            const pn = project(wn.x, wn.y, sliceZ, camZ, cx, cy);
            if (!pn) continue;
            ctx.strokeStyle = `rgba(${EMERALD}, ${0.45 * (1 - local / 1.3)})`;
            ctx.lineWidth = Math.max(0.8, 1.4 * pn.s * dpr);
            ctx.beginPath();
            ctx.arc(pn.x, pn.y, (10 + local * 46) * pn.s, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        /* ------------------------------------------ packets (lead slice) */
        if (lead && fwd > 0) {
          const pts = path.map((id) => {
            const n = findNode(G, id);
            return world(n ?? { x: 0, y: 0 });
          });
          for (let k = 0; k < 3; k++) {
            const local = (fwd * 1.5 - k * 0.22) % 1;
            if (local < 0 || local > 1) continue;
            const seg = local * (pts.length - 1);
            const i = Math.min(pts.length - 2, Math.floor(seg));
            const f = seg - i;
            const px = pts[i].x + (pts[i + 1].x - pts[i].x) * f;
            const py = pts[i].y + (pts[i + 1].y - pts[i].y) * f;
            const pp = project(px, py, sliceZ, camZ, cx, cy);
            if (!pp) continue;
            ctx.save();
            ctx.shadowColor = `rgba(${EMERALD}, 0.9)`;
            ctx.shadowBlur = 20 * pp.s;
            ctx.fillStyle = `rgba(214, 255, 235, ${Math.sin(local * Math.PI)})`;
            ctx.beginPath();
            ctx.arc(pp.x, pp.y, Math.max(1.5, 5.5 * pp.s * dpr), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      ctx.globalAlpha = 1;
    };

    const loop = (t: number) => {
      if (!running) return;
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()));
    io.observe(canvas);
    start();

    const onResize = () => draw(performance.now());
    window.addEventListener("resize", onResize);

    return () => {
      stop();
      io.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [getState, reduced]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-screen w-screen"
      role="img"
      aria-label={`The six-router lab network in depth. Scrolling flies the camera through it while link states flood from router ${SOURCE}, Dijkstra lights the shortest-path tree, packets travel ${TRIP.path.join(" to ")} at cost ${TRIP.totalCost}, and a failed D–E link reroutes them at cost ${TRIP2.totalCost}.`}
    />
  );
}

export default HeroStage;
