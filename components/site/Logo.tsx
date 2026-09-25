import { cn } from "@/lib/utils";

/**
 * Our own mark: a bordered tile holding a three-node routing glyph
 * (two outer nodes, one centre node, edges between them), then the
 * mono wordmark `vlab` with `.routing` in emerald.
 */
export function LogoTile({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-[6px] border border-emerald-bright/30 bg-emerald-deep/60",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none">
        <path d="M5 12h6m2 0h6" stroke="#34d399" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="4" cy="12" r="2.1" stroke="#34d399" strokeWidth="1.3" />
        <circle cx="12" cy="12" r="2.1" fill="#34d399" />
        <circle cx="20" cy="12" r="2.1" stroke="#34d399" strokeWidth="1.3" />
        <path d="M12 9.9V6.4M12 14.1v3.5" stroke="#34d399" strokeWidth="1.3" strokeLinecap="round" opacity=".5" />
      </svg>
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("t-h3 mono", className)}>
      <span className="text-foreground">vlab</span>
      <span className="text-emerald-bright">.routing</span>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoTile />
      <Wordmark />
    </span>
  );
}
