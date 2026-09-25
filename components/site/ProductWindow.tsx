"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The three traffic-light dots that sit at the right of a window title bar. */
export function TrafficLights({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-1.5", className)} aria-hidden="true">
      <span className="size-[9px] rounded-full bg-[#3f5a4a]" />
      <span className="size-[9px] rounded-full bg-[#3f5a4a]" />
      <span className="size-[9px] rounded-full bg-[#3f5a4a]" />
    </span>
  );
}

/**
 * The "product window" panel: dark, hairline bordered, 12px radius, with a
 * title bar (tiny title left, traffic lights right) and an optional tab strip.
 */
export function ProductWindow({
  title,
  tabs,
  toolbar,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  /** Rendered directly under the title bar — pass a shadcn TabsList. */
  tabs?: ReactNode;
  /** Right-hand side of the title bar, before the traffic lights. */
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn("panel-window overflow-hidden", className)}>
      <div className="flex items-center gap-3 border-b border-border/70 px-4 py-2.5">
        <span className="t-small mono truncate text-dim">{title}</span>
        <div className="ml-auto flex items-center gap-3">
          {toolbar}
          <TrafficLights />
        </div>
      </div>
      {tabs && <div className="border-b border-border/70 px-2">{tabs}</div>}
      <div className={cn("relative", bodyClassName)}>{children}</div>
    </div>
  );
}

/** Sage "paper" document card — the routing table and LSDB artefacts. */
export function PaperCard({
  title,
  subtitle,
  icon,
  children,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("paper-card p-5", className)}>
      {icon && <div className="mb-3 text-paper-ink/60">{icon}</div>}
      <h4 className="t-h3 text-paper-ink">
        {title}
      </h4>
      {subtitle && <p className="t-small mono mt-1.5 text-paper-ink/60">{subtitle}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

/** The single champagne "result" highlight. Used exactly once per page. */
export function GoldCard({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("gold-card p-4", className)}>
      <p className="t-pill mono text-[#4a3b18]">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

/** Dark source card feeding a connector — "Vector from B" and friends. */
export function SourceCard({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("panel-card px-4 py-3.5", className)}>
      <p className="t-pill mono text-dim">{label}</p>
      <div className="t-small mono mt-2.5 space-y-1 text-foreground/85">{children}</div>
    </div>
  );
}
