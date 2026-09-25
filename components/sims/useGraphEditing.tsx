"use client";

import { useCallback, useState } from "react";
import {
  Graph,
  GraphEdge,
  INFINITY_COST,
  NodeId,
  addEdge,
  addNode,
  findEdge,
  isBroken,
  removeEdge,
  removeNode,
  setEdgeWeight,
} from "@/lib/routing/graph";
import { EdgeTone } from "./GraphCanvas";
import { Icon } from "../Icon";

export type EditMode = "move" | "addEdge" | "removeEdge" | "removeNode" | "breakLink";

export interface GraphEditing {
  mode: EditMode;
  setMode: (m: EditMode) => void;
  pendingNode: NodeId | null;
  selectedEdgeId: string | null;
  onNodeClick: (id: NodeId) => void;
  onEdgeClick: (edge: GraphEdge) => void;
  /** Edge tones contributed by the editor (selection highlight). */
  editorEdgeTones: Record<string, EdgeTone>;
  clearSelection: () => void;
  addRouter: () => void;
  resetNetwork: () => void;
  setWeight: (edgeId: string, weight: number) => void;
}

/**
 * All graph editing behaviour, shared by the Dijkstra and Distance Vector sims.
 * `onEdit` is called after any structural change so the sim can throw away its
 * trace and log the edit.
 */
export function useGraphEditing({
  graph,
  setGraph,
  makeDefault,
  onEdit,
  allowBreakLink = false,
}: {
  graph: Graph;
  setGraph: (g: Graph) => void;
  makeDefault: () => Graph;
  onEdit: (message: string) => void;
  allowBreakLink?: boolean;
}): GraphEditing {
  const [mode, setModeState] = useState<EditMode>("move");
  const [pendingNode, setPendingNode] = useState<NodeId | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const setMode = useCallback((m: EditMode) => {
    setModeState(m);
    setPendingNode(null);
    setSelectedEdgeId(null);
  }, []);

  const onNodeClick = useCallback(
    (id: NodeId) => {
      if (mode === "removeNode") {
        if (graph.nodes.length <= 2) {
          onEdit(`[EDIT] Refused: a network needs at least two routers.`);
          return;
        }
        setGraph(removeNode(graph, id));
        onEdit(`[EDIT] Router ${id} removed, along with every link attached to it.`);
        return;
      }
      if (mode === "addEdge") {
        if (pendingNode === null) {
          setPendingNode(id);
          onEdit(`[EDIT] Add link: ${id} selected. Now pick the other end.`);
          return;
        }
        if (pendingNode === id) {
          setPendingNode(null);
          return;
        }
        if (findEdge(graph, pendingNode, id)) {
          onEdit(`[EDIT] Link ${pendingNode}\u2013${id} already exists. Click it to change its cost.`);
          setPendingNode(null);
          return;
        }
        setGraph(addEdge(graph, pendingNode, id, 1));
        onEdit(`[EDIT] Link ${pendingNode}\u2013${id} added with cost 1. Click the link to change it.`);
        setPendingNode(null);
        setSelectedEdgeId(pendingNode < id ? `${pendingNode}-${id}` : `${id}-${pendingNode}`);
      }
    },
    [graph, mode, onEdit, pendingNode, setGraph],
  );

  const onEdgeClick = useCallback(
    (edge: GraphEdge) => {
      if (mode === "removeEdge") {
        setGraph(removeEdge(graph, edge.a, edge.b));
        onEdit(`[EDIT] Link ${edge.a}\u2013${edge.b} removed.`);
        return;
      }
      if (mode === "breakLink" && allowBreakLink) {
        if (isBroken(edge)) {
          setGraph(setEdgeWeight(graph, edge.id, 1));
          onEdit(`[EDIT] Link ${edge.a}\u2013${edge.b} restored with cost 1.`);
        } else {
          setGraph(setEdgeWeight(graph, edge.id, INFINITY_COST));
          onEdit(
            `[FAIL] Link ${edge.a}\u2013${edge.b} has failed \u2014 cost set to \u221e (${INFINITY_COST}). Run exchange rounds to see the network react.`,
          );
        }
        return;
      }
      setSelectedEdgeId((cur) => (cur === edge.id ? null : edge.id));
    },
    [allowBreakLink, graph, mode, onEdit, setGraph],
  );

  const setWeight = useCallback(
    (edgeId: string, weight: number) => {
      const edge = graph.edges.find((e) => e.id === edgeId);
      if (!edge) return;
      const w = Math.max(1, Math.min(INFINITY_COST, Math.round(weight)));
      setGraph(setEdgeWeight(graph, edgeId, w));
      onEdit(
        w >= INFINITY_COST
          ? `[EDIT] Link ${edge.a}\u2013${edge.b} cost set to \u221e (${INFINITY_COST}) \u2014 the link is now unusable.`
          : `[EDIT] Link ${edge.a}\u2013${edge.b} cost changed to ${w}.`,
      );
    },
    [graph, onEdit, setGraph],
  );

  const addRouter = useCallback(() => {
    const next = addNode(graph);
    const created = next.nodes[next.nodes.length - 1].id;
    setGraph(next);
    onEdit(`[EDIT] Router ${created} added. Use "Add link" to connect it.`);
    setModeState("addEdge");
    setPendingNode(created);
  }, [graph, onEdit, setGraph]);

  const resetNetwork = useCallback(() => {
    setGraph(makeDefault());
    setModeState("move");
    setPendingNode(null);
    setSelectedEdgeId(null);
    onEdit("[RESET] Default network restored: A-B 4, A-C 2, B-C 1, B-D 5, C-D 8, C-E 10, D-E 2, D-F 6, E-F 3.");
  }, [makeDefault, onEdit, setGraph]);

  const editorEdgeTones: Record<string, EdgeTone> = {};
  if (selectedEdgeId) editorEdgeTones[selectedEdgeId] = "selected";

  return {
    mode,
    setMode,
    pendingNode,
    selectedEdgeId,
    onNodeClick,
    onEdgeClick,
    editorEdgeTones,
    clearSelection: () => setSelectedEdgeId(null),
    addRouter,
    resetNetwork,
    setWeight,
  };
}

const MODE_LABELS: { mode: EditMode; label: string; icon: string }[] = [
  { mode: "move", label: "Drag / inspect", icon: "open_with" },
  { mode: "addEdge", label: "Add link", icon: "add_link" },
  { mode: "removeEdge", label: "Remove link", icon: "link_off" },
  { mode: "removeNode", label: "Remove router", icon: "delete" },
];

/** Editing toolbar: modes, add/remove, reset, and the inline weight editor. */
export function GraphToolbar({
  editing,
  graph,
  extra,
  allowBreakLink = false,
}: {
  editing: GraphEditing;
  graph: Graph;
  extra?: React.ReactNode;
  allowBreakLink?: boolean;
}) {
  const modes = allowBreakLink
    ? [...MODE_LABELS, { mode: "breakLink" as EditMode, label: "Break link", icon: "heart_broken" }]
    : MODE_LABELS;
  const selected = editing.selectedEdgeId
    ? graph.edges.find((e) => e.id === editing.selectedEdgeId)
    : undefined;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {modes.map((m) => (
          <button
            key={m.mode}
            type="button"
            onClick={() => editing.setMode(m.mode)}
            aria-pressed={editing.mode === m.mode}
            className={`t-small mono flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 transition-colors ${
              editing.mode === m.mode
                ? m.mode === "breakLink"
                  ? "border-danger/60 bg-danger/15 text-danger"
                  : "border-emerald-bright/60 bg-emerald-bright/15 text-emerald-bright"
                : "border-border text-muted-foreground hover:bg-white/5 hover:text-foreground"
            }`}
          >
            <Icon name={m.icon} size={14} />
            {m.label}
          </button>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
        <button
          type="button"
          onClick={editing.addRouter}
          className="t-small mono flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <Icon name="add_circle" size={14} />
          Add router
        </button>
        <button
          type="button"
          onClick={editing.resetNetwork}
          className="t-small mono flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <Icon name="restart_alt" size={14} />
          Reset network
        </button>
        {extra}
      </div>

      {editing.mode === "addEdge" && (
        <p className="t-small mono text-emerald-bright">
          {editing.pendingNode
            ? `Add link: ${editing.pendingNode} selected \u2014 click the router at the other end.`
            : "Add link: click the two routers to connect."}
        </p>
      )}
      {editing.mode === "removeNode" && (
        <p className="t-small mono text-warn">Remove router: click a router to delete it and its links.</p>
      )}
      {editing.mode === "removeEdge" && (
        <p className="t-small mono text-warn">Remove link: click a link to delete it.</p>
      )}
      {editing.mode === "breakLink" && (
        <p className="t-small mono text-danger">
          Break link: click a link to fail it (cost → ∞). Click a failed link to restore it.
        </p>
      )}

      {selected && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-border bg-black/30 px-3 py-2.5">
          <span className="t-small mono text-muted-foreground">
            Link{" "}
            <span className="text-foreground">
              {selected.a}&ndash;{selected.b}
            </span>{" "}
            cost
          </span>
          <input
            type="number"
            min={1}
            max={INFINITY_COST}
            value={selected.weight}
            onChange={(e) => editing.setWeight(selected.id, Number(e.target.value))}
            aria-label={`Cost of link ${selected.a} to ${selected.b}`}
            className="t-small mono w-20 rounded-md border border-border bg-black/50 px-2 py-1 text-foreground"
          />
          <input
            type="range"
            min={1}
            max={INFINITY_COST}
            value={selected.weight}
            onChange={(e) => editing.setWeight(selected.id, Number(e.target.value))}
            aria-label={`Cost slider for link ${selected.a} to ${selected.b}`}
            className="h-1 w-32 accent-[#34d399]"
          />
          <span className="t-small mono text-dim">
            {isBroken(selected) ? "\u221e \u2014 link unusable" : "1\u201315 usable"}
          </span>
          <button
            type="button"
            onClick={editing.clearSelection}
            className="t-small mono ml-auto rounded-md px-2 py-1 text-dim transition-colors hover:text-foreground"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
