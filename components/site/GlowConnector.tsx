"use client";

import { cn } from "@/lib/utils";

export interface ConnectorPath {
  /** SVG path in the connector's own 0..100 x 0..100 coordinate box. */
  d: string;
  /** Stagger the dash flow so the lines do not pulse in lockstep. */
  delay?: number;
}

/**
 * Curved glowing connectors: a static hairline plus an emerald dash layer that
 * flows from the source side to the target side. Drawn in a normalised
 * viewBox so it stretches to whatever box it is placed in.
 */
export function GlowConnector({
  paths,
  className,
  active = true,
  strokeWidth = 0.7,
}: {
  paths: ConnectorPath[];
  className?: string;
  active?: boolean;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gc-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.05" />
          <stop offset="45%" stopColor="#34d399" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#d6ffe9" stopOpacity="0.95" />
        </linearGradient>
        <filter id="gc-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
      </defs>

      {paths.map((p, i) => (
        <g key={i}>
          <path
            d={p.d}
            fill="none"
            stroke="rgba(120,180,150,0.16)"
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
          {active && (
            <>
              <path
                d={p.d}
                fill="none"
                stroke="url(#gc-line)"
                strokeWidth={strokeWidth * 2.6}
                filter="url(#gc-blur)"
                opacity="0.5"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={p.d}
                fill="none"
                stroke="url(#gc-line)"
                strokeWidth={strokeWidth}
                className="dash-flow"
                style={{ animationDelay: `${p.delay ?? i * 0.4}s` }}
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
        </g>
      ))}
    </svg>
  );
}

/** Soft emerald radial glow placed under a key object. */
export function UnderGlow({
  className,
  intensity = 0.5,
}: {
  className?: string;
  intensity?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute", className)}
      style={{
        background: `radial-gradient(closest-side, rgba(52,211,153,${intensity}), transparent 72%)`,
      }}
    />
  );
}
