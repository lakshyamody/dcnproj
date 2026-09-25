"use client";

import { motion } from "framer-motion";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Small uppercase letter-spaced mono label: "PHASE 1 · BASELINE ASSESSMENT". */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("eyebrow", className)}>{children}</p>;
}

/**
 * The signature two-line subhead: first line white, second line muted.
 * "Trust your neighbours." / "Share what you know."
 */
export function TwoTone({
  top,
  bottom,
  className,
  as: Tag = "h3",
}: {
  top: string;
  bottom: string;
  className?: string;
  as?: "h2" | "h3" | "p";
}) {
  return (
    <Tag className={cn("h-card", className)}>
      <span className="block text-foreground">{top}</span>
      <span className="block text-muted-foreground">{bottom}</span>
    </Tag>
  );
}

/** Fade-and-rise on enter. 600ms, ease-out, once. */
export function Reveal({
  children,
  delay = 0,
  className,
  y = 22,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  const reduced = useReducedMotionSafe();
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: reduced ? 0 : 0.6, delay: reduced ? 0 : delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Number that counts up when it scrolls into view. Snaps under reduced motion. */
export function CountUp({
  to,
  duration = 800,
  className,
  format = (n: number) => String(n),
}: {
  to: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const reduced = useReducedMotionSafe();
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      setValue(to);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || started.current) return;
        started.current = true;
        const t0 = performance.now();
        const tick = () => {
          const p = Math.min(1, (performance.now() - t0) / duration);
          // ease-out cubic
          setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [duration, reduced, to]);

  // Re-run when the target changes after the first animation.
  useEffect(() => {
    if (started.current) setValue(to);
  }, [to]);

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}

/** Secondary action: plain text link with an arrow and an underline on hover. */
export function ArrowLink({
  href,
  children,
  direction = "right",
  className,
  onClick,
}: {
  href: string;
  children: ReactNode;
  direction?: "right" | "down" | "up-right";
  className?: string;
  onClick?: () => void;
}) {
  const Icon = direction === "down" ? ArrowDown : direction === "up-right" ? ArrowUpRight : ArrowRight;
  const external = href.startsWith("http");
  const inner = (
    <>
      <span className="underline-offset-[6px] group-hover:underline">{children}</span>
      <Icon
        className={cn(
          "size-4 shrink-0",
          direction === "down" ? "arrow-nudge-down arrow-nudge" : "arrow-nudge",
        )}
        strokeWidth={1.75}
      />
    </>
  );
  const cls = cn(
    "t-small group inline-flex items-center gap-2 text-foreground transition-colors hover:text-foreground",
    className,
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} onClick={onClick}>
      {inner}
    </Link>
  );
}

/** Page section with the standard rhythm and optional lifted background. */
export function SectionShell({
  id,
  children,
  className,
  lifted = false,
  bleed = false,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  lifted?: boolean;
  bleed?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn("relative scroll-mt-28", lifted && "bg-surface", className)}
    >
      <div className={cn(bleed ? "" : "mx-auto w-full max-w-[1280px] px-5 py-24 sm:px-8 sm:py-32")}>
        {children}
      </div>
    </section>
  );
}

/** Full-bleed 1px hairline. */
export function Hairline({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-border", className)} aria-hidden="true" />;
}
