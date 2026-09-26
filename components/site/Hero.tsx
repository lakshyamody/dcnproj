"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { ArrowDown, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EXPERIMENT_NUMBER, INSTITUTION, LOGO_SRC } from "@/lib/config";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import { SilkFallback } from "./SilkRibbon";

const SilkRibbon = dynamic(() => import("./SilkRibbon").then((m) => m.SilkRibbon), {
  ssr: false,
  loading: () => <SilkFallback />,
});

// The stage is the subject of the hero; the silk is atmosphere behind it.
const HeroStage = dynamic(() => import("./HeroStage").then((m) => m.HeroStage), {
  ssr: false,
  loading: () => null,
});

const EASE = [0.22, 1, 0.36, 1] as const;
// Same-page fragments use a plain <a>, not next/link. The App Router
// intercepts hash Links and does not scroll to the target, so the
// hero and nav anchors silently did nothing.


/** The three beats you scroll through, matching the algorithm phases on stage. */
const BEATS = [
  { n: "01", title: "Link State", top: "Flood what you see.", bottom: "Then compute your own tree." },
  { n: "02", title: "Forwarding", top: "One lookup per hop.", bottom: "A to F, cost thirteen." },
] as const;

const TOTAL_SECTIONS = BEATS.length + 1;

/** Split a headline so each glyph can be staggered in. */
function SplitTitle({ text }: { text: string }) {
  return (
    <>
      {text.split("").map((char, i) => (
        <span key={i} className="title-char inline-block" data-char>
          {char === " " ? " " : char}
        </span>
      ))}
    </>
  );
}

export function Hero() {
  const reduced = useReducedMotionSafe();
  const rootRef = useRef<HTMLDivElement>(null);
  const silkRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const beatRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Live scroll state through the hero, read by the stage every frame.
  const state = useRef({ p: 0, alpha: 1 });
  const getState = useCallback(() => state.current, []);
  const [section, setSection] = useState(0);

  useEffect(() => {
    const apply = () => {
      const el = rootRef.current;
      if (!el) return;
      const travel = el.offsetHeight - window.innerHeight;
      const p = travel > 0 ? Math.min(1, Math.max(0, -el.getBoundingClientRect().top / travel)) : 0;
      state.current.p = p;

      // Fade the fixed layers only once the hero has scrolled past, not while
      // its last beat is still on screen.
      const bottom = el.getBoundingClientRect().bottom;
      const out = Math.min(1, Math.max(0, (window.innerHeight - bottom) / (window.innerHeight * 0.6)));
      state.current.alpha = 1 - out;
      if (silkRef.current) silkRef.current.style.opacity = String((1 - out) * 0.6);
      // Opacity only. The chrome is a full-viewport overlay holding nothing
      // interactive, so it must never take pointer events — setting them
      // inline here overrode the pointer-events-none class and swallowed
      // every click in the hero.
      if (chromeRef.current) chromeRef.current.style.opacity = String(1 - out);

      const current = Math.min(TOTAL_SECTIONS, Math.floor(p * TOTAL_SECTIONS) + 1);
      setSection((prev) => (prev === current ? prev : current));

      // Readability: a left wash while the copy is left-aligned, handing over to
      // a centred wash once the centred beats arrive.
      if (scrimRef.current) {
        const left = 1 - Math.min(1, Math.max(0, (p - 0.04) / 0.26));
        scrimRef.current.style.setProperty("--scrim-left", String(left));
        scrimRef.current.style.setProperty("--scrim-mid", String(1 - left));
      }

      // Crossfade the beats: each owns a third of the travel.
      beatRefs.current.forEach((node, i) => {
        if (!node) return;
        // Section k is centred when p = k / (TOTAL_SECTIONS - 1).
        const centre = (i + 1) / (TOTAL_SECTIONS - 1);
        const d = Math.abs(p - centre);
        // Plateau at the top so a beat sits at full strength rather than only
        // touching it at the exact centre of its range.
        const a = Math.min(1, Math.max(0, 1.38 - d / (0.62 / (TOTAL_SECTIONS - 1))));
        node.style.opacity = String(a);
        node.style.transform = reduced ? "none" : `translateY(${(1 - a) * 26}px)`;
      });
    };

    apply();
    window.addEventListener("scroll", apply, { passive: true });
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
    };
  }, [reduced]);

  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduced ? 0 : 0.7, delay: reduced ? 0 : delay, ease: EASE },
  });

  return (
    <div ref={rootRef} className="relative -mt-[76px] pt-[76px] sm:-mt-[90px] sm:pt-[90px]">
      {/* ---------------------------------------------- fixed backdrop */}
      <div
        ref={silkRef}
        className="pointer-events-none fixed inset-0 z-0"
        style={{ opacity: 0.6 }}
        aria-hidden="true"
      >
        <SilkRibbon />
      </div>
      <HeroStage getState={getState} />

      {/* Readability wash. Weighted left while the copy is left-aligned, then
          crossfading to a centred wash for the centred beats. */}
      <div
        ref={scrimRef}
        className="pointer-events-none fixed inset-0 z-0"
        style={
          {
            "--scrim-left": 1,
            "--scrim-mid": 0,
          } as React.CSSProperties
        }
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 hidden min-[1360px]:block"
          style={{
            opacity: "var(--scrim-left)",
            background:
              "linear-gradient(90deg, rgba(5,8,7,.95) 0%, rgba(5,8,7,.9) 40%, rgba(5,8,7,.42) 64%, rgba(5,8,7,0) 84%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            opacity: "var(--scrim-mid)",
            background:
              "radial-gradient(58% 46% at 50% 52%, rgba(5,8,7,.88) 0%, rgba(5,8,7,.58) 55%, rgba(5,8,7,0) 100%)",
          }}
        />
        <div
          className="absolute inset-0 min-[1360px]:hidden"
          style={{
            background:
              "radial-gradient(62% 50% at 50% 50%, rgba(5,8,7,.9) 0%, rgba(5,8,7,.62) 58%, rgba(5,8,7,.1) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(130% 78% at 50% 50%, transparent 42%, rgba(5,8,7,.66) 100%)",
          }}
        />
      </div>

      {/* ---------------------------------------------- fixed chrome */}
      <div ref={chromeRef} className="pointer-events-none fixed inset-0 z-20">
        {/* side menu */}
        <div className="absolute top-1/2 left-5 hidden -translate-y-1/2 flex-col items-center gap-6 min-[1360px]:flex">
          <span className="flex flex-col gap-[5px]" aria-hidden="true">
            <span className="block h-px w-6 bg-foreground/60" />
            <span className="block h-px w-6 bg-foreground/60" />
            <span className="block h-px w-4 bg-foreground/60" />
          </span>
          <span
            className="t-pill text-dim"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            Routing
          </span>
        </div>

      </div>

      {/* ---------------------------------------------- beat 1: the lab */}
      <section className="relative z-10 flex min-h-[100svh] items-center pb-28 sm:pb-0">
        <div className="mx-auto w-full max-w-[1280px] px-5 sm:px-8">
          <div className="max-w-[760px]">
            <motion.div {...rise(0.05)}>
              <span className="inline-flex items-center gap-2.5 rounded-md border border-border bg-[rgba(5,12,8,.8)] py-1.5 pr-4 pl-1.5 backdrop-blur-sm">
                <span className="grid size-7 shrink-0 place-items-center rounded-[5px] bg-[#f4f6f5]">
                  <Image
                    src={LOGO_SRC}
                    alt=""
                    width={48}
                    height={48}
                    className="size-[23px] object-contain"
                    priority
                  />
                </span>
                <span className="t-small mono text-muted-foreground">
                  {INSTITUTION}
                  <span className="mx-1.5 text-dim">·</span>
                  <span className="text-emerald-bright">Experiment {EXPERIMENT_NUMBER}</span>
                </span>
              </span>
            </motion.div>

            <motion.h1
              initial={reduced ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduced ? 0 : 0.01, delay: reduced ? 0 : 0.14 }}
              className="t-display mt-6 text-foreground sm:mt-8"
            >
              <motion.span
                className="block"
                initial="hidden"
                animate="shown"
                variants={{
                  shown: { transition: { staggerChildren: reduced ? 0 : 0.035, delayChildren: 0.18 } },
                }}
              >
                {"Routing algorithm".split("").map((c, i) => (
                  <motion.span
                    key={i}
                    className="inline-block"
                    variants={{
                      hidden: { y: reduced ? 0 : "0.9em", opacity: 0 },
                      shown: { y: 0, opacity: 1, transition: { duration: reduced ? 0 : 0.8, ease: EASE } },
                    }}
                  >
                    {c === " " ? " " : c}
                  </motion.span>
                ))}
              </motion.span>
              <motion.span
                className="block"
                initial="hidden"
                animate="shown"
                variants={{
                  shown: { transition: { staggerChildren: reduced ? 0 : 0.035, delayChildren: 0.36 } },
                }}
              >
                {"implementation.".split("").map((c, i) => (
                  <motion.span
                    key={i}
                    className="inline-block"
                    variants={{
                      hidden: { y: reduced ? 0 : "0.9em", opacity: 0 },
                      shown: { y: 0, opacity: 1, transition: { duration: reduced ? 0 : 0.8, ease: EASE } },
                    }}
                  >
                    {c === " " ? " " : c}
                  </motion.span>
                ))}
              </motion.span>
            </motion.h1>

            <motion.p
              {...rise(0.7)}
              className="t-lead measure-body mt-6 text-muted-foreground sm:mt-7"
            >
              Watch routers learn the network. Step through Distance Vector and Link State routing,
              build routing tables, and forward packets hop by hop.
            </motion.p>

            <motion.div {...rise(0.8)} className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4 sm:mt-9">
              <Button
                asChild
                size="lg"
                className="t-body group h-12 rounded-md bg-primary px-5 text-primary-foreground hover:bg-primary/90"
              >
                <a href="#simulation">
                  Start the simulation
                  <ArrowRight className="arrow-nudge size-4" strokeWidth={1.75} />
                </a>
              </Button>

              <a href="#story" className="t-body group inline-flex items-center gap-2 text-foreground">
                <span className="underline-offset-[6px] group-hover:underline">Read the theory</span>
                <ArrowDown className="arrow-nudge arrow-nudge-down size-4" strokeWidth={1.75} />
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------- beats 2 and 3 */}
      {BEATS.map((beat, i) => (
        <section key={beat.n} className="relative z-10 flex min-h-[100svh] items-center justify-center">
          <div
            ref={(el) => {
              beatRefs.current[i] = el;
            }}
            className="mx-auto w-full max-w-[1280px] px-5 text-center sm:px-8"
            style={{ opacity: 0 }}
          >
            <p className="t-pill text-emerald-bright">
              {beat.n} · {beat.title}
            </p>
            <h2 className="t-display mt-5 text-foreground">
              <SplitTitle text={beat.title} />
            </h2>
            <p className="t-lead measure-lead mx-auto mt-6 text-foreground">{beat.top}</p>
            <p className="t-lead measure-lead mx-auto text-muted-foreground">{beat.bottom}</p>
          </div>
        </section>
      ))}

      <span className="sr-only" aria-live="polite">
        Hero section {section} of {TOTAL_SECTIONS}
      </span>
    </div>
  );
}
