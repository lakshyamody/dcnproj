"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLink, Reveal } from "./primitives";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import { cn } from "@/lib/utils";

interface Protocol {
  name: string;
  tag: "DV" | "LS" | "PV";
  note: string;
}

const PROTOCOLS: Protocol[] = [
  { name: "RIP", tag: "DV", note: "RFC 1058" },
  { name: "RIPv2", tag: "DV", note: "RFC 2453" },
  { name: "OSPF", tag: "LS", note: "RFC 2328" },
  { name: "IS-IS", tag: "LS", note: "ISO 10589" },
  { name: "EIGRP", tag: "DV", note: "RFC 7868" },
  { name: "BGP", tag: "PV", note: "RFC 4271" },
];

const TAG_COLOUR: Record<Protocol["tag"], string> = {
  DV: "text-[#e0c98a] border-[#e0c98a]/35",
  LS: "text-emerald-bright border-emerald-bright/35",
  PV: "text-[#9bb8ff] border-[#9bb8ff]/35",
};

/**
 * Tiles ride a curved track: each one is placed by angle, then pushed back in
 * z and tilted, so the row reads as a shallow arc turning away at the edges.
 */
export function ProtocolCarousel() {
  const reduced = useReducedMotionSafe();
  const [angle, setAngle] = useState(0);
  const [width, setWidth] = useState(900);
  const trackRef = useRef<HTMLDivElement>(null);
  const paused = useRef(false);

  // The track radius follows the container, so tiles stay on screen on a phone.
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (!paused.current) setAngle((a) => (a + dt * 0.0045) % 360);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const compact = width < 560;
  const tileW = compact ? 138 : 184;
  const tileH = compact ? 104 : 128;
  // Tiles march across a band rather than round a full circle: a circle would
  // stack pairs at the same x and leave a hole in the middle.
  const spread = Math.max(width * 1.12, tileW * PROTOCOLS.length * 0.82);
  const depthPush = compact ? 120 : 190;

  return (
    <section id="protocols" className="relative scroll-mt-28">
      <div className="mx-auto w-full max-w-[1280px] px-5 py-24 text-center sm:px-8 sm:py-32">
        <Reveal>
          <h2 className="h-section mx-auto max-w-[20ch] text-foreground">
            Built on the protocols the Internet runs on.
          </h2>
          <p className="t-lead measure-lead mx-auto mt-5 text-muted-foreground">
            Real-world implementations of these algorithms.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="-mx-5 overflow-hidden px-5 sm:-mx-8 sm:px-8">
          <div
            ref={trackRef}
            className="relative mx-auto mt-14 h-[230px] w-full max-w-[900px] sm:h-[280px]"
            style={{ perspective: "1100px" }}
            onMouseEnter={() => (paused.current = true)}
            onMouseLeave={() => (paused.current = false)}
            onFocus={() => (paused.current = true)}
            onBlur={() => (paused.current = false)}
          >
            {/* glow pooled under the track */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[12%] bottom-6 h-16 rounded-[50%] blur-2xl"
              style={{ background: "radial-gradient(closest-side, rgba(4,121,88,.55), transparent 75%)" }}
            />
            <ul
              className="absolute inset-0"
              style={{ transformStyle: "preserve-3d" }}
              aria-label="Routing protocols"
            >
              {PROTOCOLS.map((p, i) => {
                // Position along the band, wrapped into [-0.5, 0.5).
                const u = (((i / PROTOCOLS.length + angle / 360) % 1) + 1.5) % 1 - 0.5;
                const bow = Math.cos(u * Math.PI); // 1 dead centre, 0 at the ends
                const x = u * spread;
                const z = (bow - 1) * depthPush;
                const rotY = -u * 62;
                const depth = bow;
                return (
                  <li
                    key={p.name}
                    className="absolute top-1/2 left-1/2"
                    style={{
                      marginLeft: -tileW / 2,
                      marginTop: -tileH / 2,
                      transform: `translate3d(${x}px, 0, ${z}px) rotateY(${rotY}deg)`,
                      opacity: 0.12 + depth * 0.88,
                      zIndex: Math.round(depth * 100),
                      transition: reduced ? undefined : "opacity .4s linear",
                    }}
                  >
                    <div
                      className={cn(
                        "glass-tile flex flex-col items-center justify-center gap-2",
                        depth > 0.8 && "ring-1 ring-emerald-bright/25",
                      )}
                      style={{ width: tileW, height: tileH }}
                    >
                      <span
                        className="mono text-foreground"
                        style={{ fontSize: compact ? 19 : 24 }}
                      >
                        {p.name}
                      </span>
                      <span className="t-small mono text-dim">{p.note}</span>
                      <span
                        className={cn(
                          "t-small mono absolute top-2.5 right-2.5 rounded border px-1.5 py-0.5",
                          TAG_COLOUR[p.tag],
                        )}
                      >
                        {p.tag}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          </div>

          <p className="t-small mono mt-6 text-dim">
            DV — distance vector · LS — link state · PV — path vector
          </p>

          <div className="mt-6 flex justify-center">
            <ArrowLink href="https://www.rfc-editor.org/rfc/rfc2328" direction="up-right">
              Read the RFCs
            </ArrowLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
