"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ReactNode, useCallback, useRef } from "react";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  Graph,
  GraphEdge,
  NodeId,
  clamp,
  findNode,
  isBroken,
} from "@/lib/routing/graph";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";

export type NodeTone = "idle" | "source" | "current" | "visited" | "queued" | "path" | "dead";
export type EdgeTone = "idle" | "tree" | "relax" | "accept" | "reject" | "flow" | "broken" | "selected";

export interface PacketSprite {
  id: string;
  from: NodeId;
  to: NodeId;
  color?: string;
  label?: string;
  /** Material Symbols glyph drawn instead of the default dot. */
  icon?: string;
  /** Seconds. */
  duration?: number;
  delay?: number;
}

export interface NodeCard {
  title?: string;
  rows: { k: string; v: string; changed?: boolean; dead?: boolean }[];
}

export interface GraphCanvasProps {
  graph: Graph;
  nodeTones?: Partial<Record<NodeId, NodeTone>>;
  /** Small caption under each node, e.g. its current distance. */
  nodeBadges?: Partial<Record<NodeId, string>>;
  edgeTones?: Record<string, EdgeTone>;
  packets?: PacketSprite[];
  /** Small vector cards drawn beside each router (used for distance vectors). */
  nodeCards?: Partial<Record<NodeId, NodeCard>>;
  /** Absolutely positioned HTML layer above the SVG (tooltips, legends). */
  overlay?: ReactNode;
  onMoveNode?: (id: NodeId, x: number, y: number) => void;
  onNodeClick?: (id: NodeId) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
  /** Shown top-left inside the canvas. */
  caption?: string;
  hint?: string;
  className?: string;
}

/* Wireframe palette: thin outlines, emerald for anything the algorithm has
   committed to, gold while it is still being weighed, red when it is dead. */
const NODE_STYLE: Record<NodeTone, { fill: string; stroke: string; text: string; width: number }> = {
  idle: { fill: "#070c0a", stroke: "rgba(120,180,150,0.35)", text: "#8b949e", width: 1.1 },
  source: { fill: "#0b1f17", stroke: "#34d399", text: "#eafff5", width: 2.2 },
  current: { fill: "#241c05", stroke: "#e0a83a", text: "#f0d79a", width: 2.4 },
  visited: { fill: "#08160f", stroke: "#047958", text: "#b7e8d1", width: 1.7 },
  queued: { fill: "#070c0a", stroke: "rgba(120,180,150,0.28)", text: "#6b7a72", width: 1.1 },
  path: { fill: "#0b1f17", stroke: "#34d399", text: "#eafff5", width: 2 },
  dead: { fill: "#180809", stroke: "#e5484d", text: "#f2a8ab", width: 1.8 },
};

const EDGE_STYLE: Record<EdgeTone, { stroke: string; width: number; dash?: string; opacity: number }> = {
  idle: { stroke: "rgba(120,180,150,0.22)", width: 1.1, opacity: 1 },
  tree: { stroke: "#34d399", width: 3, opacity: 1 },
  relax: { stroke: "#e0a83a", width: 2.4, dash: "5 6", opacity: 1 },
  accept: { stroke: "#34d399", width: 2.8, opacity: 1 },
  reject: { stroke: "#e0a83a", width: 1.8, dash: "3 5", opacity: 0.8 },
  flow: { stroke: "#34d399", width: 1.8, dash: "5 7", opacity: 0.9 },
  broken: { stroke: "#e5484d", width: 2.2, dash: "6 6", opacity: 1 },
  selected: { stroke: "#f8f8f7", width: 2.4, opacity: 1 },
};

const NODE_R = 21;

/**
 * The one graph canvas used by all three simulations.
 *
 * Everything lives in an 800x460 viewBox and the wrapper keeps that exact
 * aspect ratio, so the drawing scales to any width and percentage-positioned
 * HTML overlays line up with the SVG coordinates on every screen size.
 */
export function GraphCanvas({
  graph,
  nodeTones = {},
  nodeBadges = {},
  edgeTones = {},
  packets = [],
  nodeCards,
  overlay,
  onMoveNode,
  onNodeClick,
  onEdgeClick,
  caption,
  hint,
  className = "",
}: GraphCanvasProps) {
  const reduced = useReducedMotionSafe();
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<{ id: NodeId; moved: boolean } | null>(null);

  /** Screen coordinates -> viewBox coordinates. */
  const toLocal = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: pt.x, y: pt.y };
  }, []);

  const onPointerDown = (e: React.PointerEvent, id: NodeId) => {
    if (!onMoveNode) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragging.current = { id, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragging.current;
    if (!drag || !onMoveNode) return;
    const local = toLocal(e.clientX, e.clientY);
    if (!local) return;
    drag.moved = true;
    onMoveNode(
      drag.id,
      clamp(local.x, NODE_R + 4, CANVAS_WIDTH - NODE_R - 4),
      clamp(local.y, NODE_R + 4, CANVAS_HEIGHT - NODE_R - 4),
    );
  };

  const onPointerUp = (e: React.PointerEvent, id: NodeId) => {
    const drag = dragging.current;
    dragging.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    // A press without movement counts as a click (used by the editing modes).
    if (drag && !drag.moved) onNodeClick?.(id);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative w-full overflow-hidden rounded-lg border border-border bg-[#050a08]">
        <div className="relative aspect-[800/460] w-full">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 h-full w-full touch-none"
            role="img"
            aria-label={caption ?? "Network topology"}
          >
            <defs>
              <pattern id="gc-grid" width="26" height="26" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="rgba(120,180,150,0.16)" />
              </pattern>
              <radialGradient id="gc-pulse">
                <stop offset="0%" stopColor="#e0a83a" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#e0a83a" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="url(#gc-grid)" />

            {/* ----------------------------------------------- edges */}
            {graph.edges.map((edge) => {
              const a = findNode(graph, edge.a);
              const b = findNode(graph, edge.b);
              if (!a || !b) return null;
              const tone: EdgeTone = edgeTones[edge.id] ?? (isBroken(edge) ? "broken" : "idle");
              const s = EDGE_STYLE[tone];
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              const interactive = Boolean(onEdgeClick);
              return (
                <g key={edge.id}>
                  {/* Wide invisible hit area, so the link is tappable on a phone. */}
                  {interactive && (
                    <line
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="transparent"
                      strokeWidth="26"
                      className="cursor-pointer"
                      onClick={() => onEdgeClick?.(edge)}
                    />
                  )}
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={s.stroke}
                    strokeWidth={s.width}
                    strokeLinecap="round"
                    strokeDasharray={s.dash}
                    opacity={s.opacity}
                    className={
                      !reduced && (tone === "flow" || tone === "relax") ? "dash-flow" : undefined
                    }
                    pointerEvents="none"
                  />
                  <g pointerEvents="none">
                    <rect
                      x={mx - 15}
                      y={my - 11}
                      width="30"
                      height="20"
                      rx="10"
                      fill="#050a08"
                      stroke={tone === "idle" ? "rgba(120,180,150,0.24)" : s.stroke}
                      strokeWidth="1"
                    />
                    <text
                      x={mx}
                      y={my + 3.5}
                      textAnchor="middle"
                      fontSize="11.5"
                      fontFamily="var(--font-mono)"
                      fill={isBroken(edge) ? "#e5484d" : tone === "idle" ? "#6b7a72" : s.stroke}
                    >
                      {isBroken(edge) ? "∞" : edge.weight}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* ----------------------------------------------- packets */}
            <AnimatePresence>
              {packets.map((p) => {
                const a = findNode(graph, p.from);
                const b = findNode(graph, p.to);
                if (!a || !b) return null;
                const dur = p.duration ?? 0.9;
                return (
                  <motion.g
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{
                      x: reduced ? b.x - a.x : [0, b.x - a.x],
                      y: reduced ? b.y - a.y : [0, b.y - a.y],
                      opacity: [0, 1, 1, 0.9],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduced ? 0.01 : dur, delay: p.delay ?? 0, ease: "linear" }}
                  >
                    {p.icon ? (
                      <>
                        <circle cx={a.x} cy={a.y} r="13" fill="#050a08" stroke={p.color ?? "#34d399"} strokeWidth="1.5" />
                        <text
                          x={a.x}
                          y={a.y + 6}
                          textAnchor="middle"
                          fontSize="16"
                          fontFamily="Material Symbols Outlined"
                          fill={p.color ?? "#34d399"}
                        >
                          {p.icon}
                        </text>
                      </>
                    ) : (
                      <circle cx={a.x} cy={a.y} r="7.5" fill={p.color ?? "#34d399"} />
                    )}
                    {p.label && (
                      <text
                        x={a.x}
                        y={a.y - 12}
                        textAnchor="middle"
                        fontSize="10"
                        fontFamily="var(--font-mono)"
                        fill={p.color ?? "#34d399"}
                      >
                        {p.label}
                      </text>
                    )}
                  </motion.g>
                );
              })}
            </AnimatePresence>

            {/* ----------------------------------------------- nodes */}
            {graph.nodes.map((n) => {
              const tone = nodeTones[n.id] ?? "idle";
              const s = NODE_STYLE[tone];
              const badge = nodeBadges[n.id];
              const draggable = Boolean(onMoveNode);
              return (
                <g key={n.id}>
                  {tone === "current" && (
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r="30"
                      fill="url(#gc-pulse)"
                      className="node-halo"
                      style={{ transformOrigin: `${n.x}px ${n.y}px` }}
                    />
                  )}
                  <g
                    role={onNodeClick ? "button" : undefined}
                    tabIndex={onNodeClick ? 0 : undefined}
                    aria-label={`Router ${n.id}${badge ? `, ${badge}` : ""}`}
                    onKeyDown={(e) => {
                      if (!onNodeClick) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onNodeClick(n.id);
                      }
                    }}
                    onPointerDown={(e) => onPointerDown(e, n.id)}
                    onPointerMove={onPointerMove}
                    onPointerUp={(e) => onPointerUp(e, n.id)}
                    onClick={() => {
                      if (!draggable) onNodeClick?.(n.id);
                    }}
                    className={draggable ? "cursor-grab active:cursor-grabbing" : onNodeClick ? "cursor-pointer" : undefined}
                  >
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={NODE_R}
                      fill={s.fill}
                      stroke={s.stroke}
                      strokeWidth={s.width}
                    />
                    <text
                      x={n.x}
                      y={n.y + 5}
                      textAnchor="middle"
                      fontSize="14"
                      fontWeight="600"
                      fontFamily="var(--font-mono)"
                      fill={s.text}
                      pointerEvents="none"
                    >
                      {n.id}
                    </text>
                  </g>
                  {badge && (
                    <text
                      x={n.x}
                      y={n.y + NODE_R + 15}
                      textAnchor="middle"
                      fontSize="11"
                      fontFamily="var(--font-mono)"
                      fill={tone === "idle" || tone === "queued" ? "#86868b" : s.stroke}
                      pointerEvents="none"
                    >
                      {badge}
                    </text>
                  )}
                </g>
              );
            })}
            {/* ----------------------------------------------- vector cards */}
            {nodeCards &&
              graph.nodes.map((n) => {
                const card = nodeCards[n.id];
                if (!card || card.rows.length === 0) return null;
                return <VectorCard key={`card-${n.id}`} x={n.x} y={n.y} card={card} />;
              })}
          </svg>

          {/* HTML overlay layer, aligned to the same coordinate space. */}
          {overlay && <div className="pointer-events-none absolute inset-0">{overlay}</div>}

          {caption && (
            <p className="t-pill mono pointer-events-none absolute top-2.5 left-3 text-dim">
              {caption}
            </p>
          )}
        </div>
      </div>
      {hint && <p className="t-small mono mt-2 text-dim">{hint}</p>}
    </div>
  );
}

/** Position an HTML element at viewBox coordinates inside GraphCanvas's overlay. */
export function overlayStyle(x: number, y: number): React.CSSProperties {
  return {
    position: "absolute",
    left: `${(x / CANVAS_WIDTH) * 100}%`,
    top: `${(y / CANVAS_HEIGHT) * 100}%`,
  };
}

/**
 * A distance-vector card drawn in SVG coordinates, so it scales with the canvas
 * instead of overflowing it on a narrow screen.
 */
function VectorCard({ x, y, card }: { x: number; y: number; card: NodeCard }) {
  const cols = card.rows.length > 3 ? 2 : 1;
  const perCol = Math.ceil(card.rows.length / cols);
  const colW = 46;
  const rowH = 13;
  const w = cols * colW + 8;
  const headH = card.title ? 13 : 2;
  const h = headH + perCol * rowH + 5;

  // Keep the card inside the canvas: flip it to the other side when needed.
  const left = x + NODE_R + 8 + w > CANVAS_WIDTH;
  const cx = left ? x - NODE_R - 8 - w : x + NODE_R + 8;
  const cy = Math.min(Math.max(y - h / 2, 3), CANVAS_HEIGHT - h - 3);

  return (
    <g pointerEvents="none">
      <rect x={cx} y={cy} width={w} height={h} rx="5" fill="#050a08ee" stroke="rgba(120,180,150,0.24)" strokeWidth="1" />
      {card.title && (
        <text
          x={cx + 4}
          y={cy + 9.5}
          fontSize="8"
          fontFamily="var(--font-mono)"
          fill="#6b7a72"
          letterSpacing="0.6"
        >
          {card.title}
        </text>
      )}
      {card.rows.map((row, i) => {
        const col = Math.floor(i / perCol);
        const rowIdx = i % perCol;
        const rx = cx + 3 + col * colW;
        const ry = cy + headH + rowIdx * rowH;
        return (
          <g key={row.k}>
            {row.changed && (
              <rect x={rx - 1} y={ry} width={colW - 2} height={rowH - 1.5} rx="2.5" fill="#34d39930" />
            )}
            <text x={rx + 2} y={ry + 9.5} fontSize="8.5" fontFamily="var(--font-mono)" fill="#6b7a72">
              {row.k}
            </text>
            <text
              x={rx + colW - 5}
              y={ry + 9.5}
              fontSize="8.5"
              textAnchor="end"
              fontFamily="var(--font-mono)"
              fill={row.dead ? "#e5484d" : row.changed ? "#34d399" : "#c3cdc7"}
            >
              {row.v}
            </text>
          </g>
        );
      })}
    </g>
  );
}
