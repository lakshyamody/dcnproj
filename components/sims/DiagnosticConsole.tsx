"use client";

import { Eraser, Terminal } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface LogLine {
  id: number;
  text: string;
  tone?: "info" | "ok" | "warn" | "error" | "accent";
}

const TONE: Record<NonNullable<LogLine["tone"]>, string> = {
  info: "text-foreground/70",
  ok: "text-emerald-bright",
  warn: "text-warn",
  error: "text-danger",
  accent: "text-emerald-bright/85",
};

const DOT: Record<NonNullable<LogLine["tone"]>, string> = {
  info: "bg-dim",
  ok: "bg-emerald-bright",
  warn: "bg-warn",
  error: "bg-danger",
  accent: "bg-emerald-bright",
};

/** Split a leading [TAG n] so it can be tinted emerald like a shell prompt. */
function splitTag(text: string): [string | null, string] {
  const m = /^(\[[^\]]+\])\s*/.exec(text);
  return m ? [m[1], text.slice(m[0].length)] : [null, text];
}

/**
 * Terminal-style log shared by all three simulations. Auto-scrolls to the
 * newest line, and is a live region so screen readers hear each step.
 */
export function DiagnosticConsole({
  lines,
  status,
  statusTone = "info",
  onClear,
  height = "h-52",
}: {
  lines: LogLine[];
  status: string;
  statusTone?: NonNullable<LogLine["tone"]>;
  onClear?: () => void;
  height?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-[#040706]">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <Terminal className="size-3.5 text-emerald-bright" strokeWidth={1.75} />
        <span className="t-pill mono text-dim">
          Diagnostic console
        </span>
        <span className={cn("t-small mono ml-auto flex items-center gap-1.5", TONE[statusTone])}>
          <span className={cn("size-1.5 rounded-full", DOT[statusTone])} />
          {status}
        </span>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear console"
            className="ml-1 rounded p-1 text-dim transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <Eraser className="size-3.5" strokeWidth={1.75} />
          </button>
        )}
      </div>
      <div
        ref={boxRef}
        role="log"
        aria-live="polite"
        aria-label="Simulation log"
        className={cn(
          "t-small scroll-thin mono overflow-y-auto p-3 sm:p-3.5",
          height,
        )}
      >
        {lines.length === 0 ? (
          <p className="text-dim">
            <span className="mr-2 text-emerald-bright/60 select-none">$</span>
            waiting for simulation sequence
            <span className="caret-blink ml-0.5 text-emerald-bright">▌</span>
          </p>
        ) : (
          lines.map((line) => {
            const [tag, rest] = splitTag(line.text);
            return (
              <p key={line.id} className={cn("break-words", TONE[line.tone ?? "info"])}>
                <span className="mr-2 text-emerald-bright/50 select-none">$</span>
                {tag && <span className="text-emerald-bright">{tag} </span>}
                {rest}
              </p>
            );
          })
        )}
      </div>
    </div>
  );
}

/** Small append-only log buffer with monotonic ids. */
export function makeLogger() {
  let next = 0;
  return (text: string, tone?: LogLine["tone"]): LogLine => ({ id: next++, text, tone });
}
