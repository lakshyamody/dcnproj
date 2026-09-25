"use client";

import { Pause, Play, RefreshCw, ChevronRight } from "lucide-react";
import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select as ShadSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCost } from "@/lib/routing/graph";
import { RouteRow, isUnreachable } from "@/lib/routing/table";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  accent: "border-emerald-bright/35 bg-emerald-deep/50 text-emerald-bright",
  ok: "border-emerald-bright/40 bg-emerald-deep/60 text-emerald-bright",
  signal: "border-warn/35 bg-warn/10 text-warn",
  danger: "border-danger/40 bg-danger/10 text-danger",
};

/**
 * Header strip for one simulation. The surrounding window chrome comes from
 * ProductWindow in the Simulations section, so this only carries the title,
 * the status badge and whatever actions the sim needs.
 */
export function SimShell({
  index,
  title,
  subtitle,
  badge,
  badgeTone = "accent",
  actions,
  children,
}: {
  index: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeTone?: keyof typeof TONE;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2.5">
            <span className="t-small mono text-emerald-bright">{index}</span>
            <h3 className="t-lead text-foreground">
              {title}
            </h3>
          </div>
          <p className="t-small mt-1 text-muted-foreground">{subtitle}</p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {actions}
          {badge && (
            <Badge
              variant="outline"
              className={cn("t-pill mono rounded-full px-3 py-1", TONE[badgeTone])}
            >
              {badge}
            </Badge>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

/** Step / Play / Reset plus the speed slider. */
export function PlaybackControls({
  playing,
  atEnd,
  speed,
  onStep,
  onTogglePlay,
  onReset,
  onSpeed,
  stepLabel = "Step",
}: {
  playing: boolean;
  atEnd: boolean;
  speed: number;
  onStep: () => void;
  onTogglePlay: () => void;
  onReset: () => void;
  onSpeed: (ms: number) => void;
  stepLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-black/30 p-3 sm:flex-row sm:items-center">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={onStep}
          disabled={atEnd}
          className="t-small h-9 gap-1.5 rounded-md bg-primary px-4 text-primary-foreground hover:bg-primary/90"
        >
          {stepLabel}
          <ChevronRight className="size-3.5" strokeWidth={2} />
        </Button>
        <Button
          variant="outline"
          onClick={onTogglePlay}
          disabled={atEnd}
          aria-pressed={playing}
          className="t-small h-9 gap-1.5 rounded-md border-border bg-transparent px-3.5 text-foreground hover:bg-white/5"
        >
          {playing ? <Pause className="size-3.5" strokeWidth={2} /> : <Play className="size-3.5" strokeWidth={2} />}
          {playing ? "Pause" : "Play"}
        </Button>
        <Button
          variant="ghost"
          onClick={onReset}
          className="t-small h-9 gap-1.5 rounded-md border border-border px-3.5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
        >
          <RefreshCw className="size-3.5" strokeWidth={1.75} />
          Reset
        </Button>
      </div>

      <div className="t-pill mono flex flex-1 items-center gap-3 text-dim sm:justify-end">
        <label htmlFor="sim-speed">Speed</label>
        <Slider
          id="sim-speed"
          min={150}
          max={2000}
          step={50}
          /* Inverted so dragging right feels faster. */
          value={[2150 - speed]}
          onValueChange={([v]) => onSpeed(2150 - v)}
          aria-label="Playback speed"
          className="w-32 sm:w-40 [&_[data-slot=slider-range]]:bg-emerald-bright [&_[data-slot=slider-thumb]]:border-emerald-bright [&_[data-slot=slider-track]]:bg-border"
        />
        <span className="w-14 text-right text-foreground/70">{(speed / 1000).toFixed(2)}s</span>
      </div>
    </div>
  );
}

export function Select({
  label,
  value,
  options,
  onChange,
  tone = "accent",
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  tone?: "accent" | "signal";
}) {
  return (
    <div className="t-pill mono flex items-center gap-2 text-dim">
      <span>{label}</span>
      <ShadSelect value={value} onValueChange={onChange}>
        <SelectTrigger
          size="sm"
          aria-label={label}
          className={cn(
            "t-small mono h-8 w-auto min-w-[4.5rem] rounded-md border-border bg-black/40 normal-case",
            tone === "signal" ? "text-warn" : "text-emerald-bright",
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-border bg-popover">
          {options.map((o) => (
            <SelectItem key={o} value={o} className="t-small mono text-foreground">
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </ShadSelect>
    </div>
  );
}

/** Destination | Next Hop | Cost — the table every algorithm here produces. */
export function RoutingTableView({
  title,
  rows,
  ready = true,
  notReadyNote,
  highlightDestination,
  compact = false,
}: {
  title: string;
  rows: RouteRow[];
  ready?: boolean;
  notReadyNote?: string;
  highlightDestination?: string | null;
  compact?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-black/25">
      <div className="border-b border-border px-3 py-2.5">
        <span className="t-pill mono text-dim">{title}</span>
      </div>
      <div className="table-scroll scroll-thin">
        <Table className="t-small mono min-w-[20rem]">
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="t-pill h-8 px-3 text-dim">Dest</TableHead>
              <TableHead className="t-pill h-8 px-3 text-dim">Next hop</TableHead>
              <TableHead className="t-pill h-8 px-3 text-dim">Cost</TableHead>
              {!compact && (
                <TableHead className="t-pill h-8 px-3 text-dim">Path</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const dead = isUnreachable(row.cost) || row.nextHop === null;
              const on = highlightDestination === row.destination;
              return (
                <TableRow
                  key={row.destination}
                  className={cn(
                    "border-border/50",
                    on && "bg-emerald-deep/45",
                    dead && "opacity-55",
                  )}
                >
                  <TableCell className={cn("px-3 py-2", on ? "text-emerald-bright" : "text-foreground")}>
                    {row.destination}
                  </TableCell>
                  <TableCell
                    className={cn("px-3 py-2", dead ? "text-danger" : on ? "text-emerald-bright" : "text-warn")}
                  >
                    {row.nextHop ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-foreground/80">{formatCost(row.cost)}</TableCell>
                  {!compact && (
                    <TableCell className="px-3 py-2 text-dim">
                      {row.path.length > 1 ? row.path.join("→") : "—"}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {!ready && notReadyNote && (
        <p className="t-small mono border-t border-border/60 px-3 py-2 text-warn">{notReadyNote}</p>
      )}
    </div>
  );
}

/** Small labelled panel used for the working tables and side panels. */
export function SimPanel({
  icon,
  label,
  children,
  className,
}: {
  icon?: ReactNode;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-black/25", className)}>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        {icon}
        <span className="t-pill mono text-dim">{label}</span>
      </div>
      {children}
    </div>
  );
}
