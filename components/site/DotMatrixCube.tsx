"use client";

import { useEffect, useRef } from "react";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * Face glyphs, drawn on a 16x16 grid. Our own marks: a node-edge-node
 * graph, a forwarding arrow, and a routing-table grid.
 * ------------------------------------------------------------------ */
const N = 16;

function graphGlyph(x: number, y: number): boolean {
  const disc = (cx: number, cy: number, r: number) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  const seg = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / len2));
    const px = x1 + t * dx;
    const py = y1 + t * dy;
    return (x - px) ** 2 + (y - py) ** 2 <= 0.9;
  };
  return (
    disc(3, 4, 1.7) ||
    disc(12, 4, 1.7) ||
    disc(7.5, 12, 1.7) ||
    seg(3, 4, 12, 4) ||
    seg(3, 4, 7.5, 12) ||
    seg(12, 4, 7.5, 12)
  );
}

function arrowGlyph(x: number, y: number): boolean {
  const shaft = y >= 7 && y <= 8 && x >= 2 && x <= 12;
  const head = x >= 9 && x <= 13 && Math.abs(y - 7.5) <= 13.5 - x;
  return shaft || head;
}

function tableGlyph(x: number, y: number): boolean {
  if (x < 2 || x > 13 || y < 3 || y > 12) return false;
  const border = x === 2 || x === 13 || y === 3 || y === 12;
  const rows = y === 6 || y === 9;
  const cols = x === 6 || x === 10;
  return border || rows || cols;
}

const GLYPHS = [graphGlyph, arrowGlyph, tableGlyph];

type V3 = [number, number, number];

/** The six faces of a cube, each an origin plus two edge vectors. */
const FACES: { origin: V3; u: V3; v: V3; glyph: number }[] = [
  { origin: [-1, -1, 1], u: [2, 0, 0], v: [0, 2, 0], glyph: 0 },
  { origin: [1, -1, 1], u: [0, 0, -2], v: [0, 2, 0], glyph: 1 },
  { origin: [1, -1, -1], u: [-2, 0, 0], v: [0, 2, 0], glyph: 2 },
  { origin: [-1, -1, -1], u: [0, 0, 2], v: [0, 2, 0], glyph: 0 },
  { origin: [-1, 1, 1], u: [2, 0, 0], v: [0, 0, -2], glyph: 1 },
  { origin: [-1, -1, -1], u: [2, 0, 0], v: [0, 0, 2], glyph: 2 },
];

interface Dot {
  p: V3;
  lit: boolean;
}

function buildDots(): Dot[] {
  const dots: Dot[] = [];
  for (const face of FACES) {
    const glyph = GLYPHS[face.glyph];
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const s = (i + 0.5) / N;
        const t = (j + 0.5) / N;
        dots.push({
          p: [
            face.origin[0] + face.u[0] * s + face.v[0] * t,
            face.origin[1] + face.u[1] * s + face.v[1] * t,
            face.origin[2] + face.u[2] * s + face.v[2] * t,
          ],
          lit: glyph(i, N - 1 - j),
        });
      }
    }
  }
  return dots;
}

/**
 * The footer object: a slowly rotating cube built from small emerald dots,
 * its faces carrying routing glyphs. Plain canvas, no dependencies, and it
 * stops drawing entirely when scrolled out of view.
 */
export function DotMatrixCube({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotionSafe();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dots = buildDots();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let running = false;

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const cw = Math.round(w * dpr);
      const ch = Math.round(h * dpr);
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
    };

    const draw = (time: number) => {
      resize();
      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) return;
      ctx.clearRect(0, 0, w, h);

      const ry = time * 0.00022;
      const rx = -0.42;
      const cosY = Math.cos(ry);
      const sinY = Math.sin(ry);
      const cosX = Math.cos(rx);
      const sinX = Math.sin(rx);
      const scale = Math.min(w, h) * 0.3;
      const cx = w / 2;
      const cy = h / 2;

      const projected = dots.map((d) => {
        const [x0, y0, z0] = d.p;
        const x1 = x0 * cosY + z0 * sinY;
        const z1 = -x0 * sinY + z0 * cosY;
        const y2 = y0 * cosX - z1 * sinX;
        const z2 = y0 * sinX + z1 * cosX;
        const persp = 3.6 / (3.6 + z2);
        return { x: cx + x1 * scale * persp, y: cy - y2 * scale * persp, z: z2, persp, lit: d.lit };
      });
      // Painter's algorithm: far dots first.
      projected.sort((a, b) => a.z - b.z);

      for (const d of projected) {
        const depth = Math.min(1, Math.max(0, (d.z + 1.8) / 3.6));
        const r = Math.max(0.6, (d.lit ? 1.5 : 1.0) * d.persp * dpr);
        ctx.fillStyle = d.lit
          ? `rgba(122, 240, 190, ${0.3 + depth * 0.65})`
          : `rgba(52, 211, 153, ${0.05 + depth * 0.2})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = (t: number) => {
      if (!running) return;
      draw(t);
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || reduced) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    if (reduced) {
      draw(4200);
    }

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (reduced) draw(4200);
        else start();
      } else {
        stop();
      }
    });
    io.observe(canvas);

    const onResize = () => {
      if (reduced) draw(4200);
    };
    window.addEventListener("resize", onResize);

    return () => {
      stop();
      io.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [reduced]);

  return (
    <canvas
      ref={ref}
      className={cn("size-full", className)}
      role="img"
      aria-label="Rotating cube of emerald dots; its faces show a network graph, a forwarding arrow and a routing table"
    />
  );
}

export default DotMatrixCube;
