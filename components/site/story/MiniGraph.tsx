"use client";

import { CANVAS_HEIGHT, CANVAS_WIDTH, Graph, findNode, defaultGraph } from "@/lib/routing/graph";
import { cn } from "@/lib/utils";

/**
 * Small read-only picture of the default network, used inside the story
 * illustrations. The live, editable canvas lives in components/sims.
 */
export function MiniGraph({
  graph = defaultGraph(),
  treeEdges = [],
  path = [],
  className,
  showWeights = true,
}: {
  graph?: Graph;
  treeEdges?: string[];
  path?: string[];
  className?: string;
  showWeights?: boolean;
}) {
  const onPath = (a: string, b: string) =>
    path.some((n, i) => i < path.length - 1 && ((n === a && path[i + 1] === b) || (n === b && path[i + 1] === a)));

  return (
    <svg
      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
      className={cn("size-full", className)}
      aria-hidden="true"
    >
      {graph.edges.map((e) => {
        const a = findNode(graph, e.a);
        const b = findNode(graph, e.b);
        if (!a || !b) return null;
        const lit = treeEdges.includes(e.id) || onPath(e.a, e.b);
        return (
          <g key={e.id}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={lit ? "#34d399" : "rgba(120,180,150,0.22)"}
              strokeWidth={lit ? 2.4 : 1.1}
              strokeLinecap="round"
            />
            {showWeights && (
              <g>
                <rect
                  x={(a.x + b.x) / 2 - 13}
                  y={(a.y + b.y) / 2 - 10}
                  width="26"
                  height="19"
                  rx="9.5"
                  fill="#070c0a"
                  stroke={lit ? "rgba(52,211,153,.45)" : "rgba(120,180,150,0.18)"}
                  strokeWidth="1"
                />
                <text
                  x={(a.x + b.x) / 2}
                  y={(a.y + b.y) / 2 + 4}
                  textAnchor="middle"
                  fontSize="11"
                  fontFamily="var(--font-mono)"
                  fill={lit ? "#34d399" : "#6b7a72"}
                >
                  {e.weight}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {graph.nodes.map((n) => {
        const lit = path.includes(n.id) || treeEdges.some((id) => id.split("-").includes(n.id));
        return (
          <g key={n.id}>
            <circle
              cx={n.x}
              cy={n.y}
              r="18"
              fill="#070c0a"
              stroke={lit ? "#34d399" : "rgba(120,180,150,0.35)"}
              strokeWidth={lit ? 1.8 : 1.1}
            />
            <text
              x={n.x}
              y={n.y + 5}
              textAnchor="middle"
              fontSize="13"
              fontFamily="var(--font-mono)"
              fill={lit ? "#eafff5" : "#8b949e"}
            >
              {n.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
