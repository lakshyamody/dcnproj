"use client";

import { ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Pseudocode with line numbers. The line the algorithm is currently executing
 * gets an emerald left border, matching the trace's `pseudoLine`.
 */
export function Pseudocode({
  lines,
  title,
  highlight,
  className,
}: {
  lines: readonly string[];
  title: string;
  highlight?: number;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-black/30", className)}>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <ListOrdered className="size-3.5 text-emerald-bright" strokeWidth={1.75} />
        <span className="t-pill mono text-dim">{title}</span>
      </div>
      <ol className="t-small scroll-thin mono max-h-[24rem] overflow-auto bg-[#040706] py-3">
        {lines.map((line, i) => {
          const n = i + 1;
          const on = highlight === n;
          return (
            <li
              key={n}
              aria-current={on ? "step" : undefined}
              className={cn(
                "flex gap-3 border-l-2 px-3 sm:px-4",
                on ? "border-emerald-bright bg-emerald-deep/40" : "border-transparent",
              )}
            >
              <span className={cn("w-5 shrink-0 text-right", on ? "text-emerald-bright" : "text-dim")}>
                {n}
              </span>
              <span className={cn("whitespace-pre", on ? "text-foreground" : "text-foreground/65")}>
                {line || " "}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
