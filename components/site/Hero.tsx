"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { EXPERIMENT_NUMBER, INSTITUTION, LOGO_SRC } from "@/lib/config";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import { SilkFallback } from "./SilkRibbon";

// The shader is the heaviest thing on the page, so it never blocks first paint.
const SilkRibbon = dynamic(() => import("./SilkRibbon").then((m) => m.SilkRibbon), {
  ssr: false,
  loading: () => <SilkFallback />,
});

// The network is the subject of the hero; the silk is atmosphere behind it.
const HeroRouting = dynamic(() => import("./HeroRouting").then((m) => m.HeroRouting), {
  ssr: false,
  loading: () => null,
});

const EASE = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const reduced = useReducedMotionSafe();
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduced ? 0 : 0.7, delay: reduced ? 0 : delay, ease: EASE },
  });

  return (
    <section className="relative -mt-[76px] overflow-hidden pt-[76px] sm:-mt-[90px] sm:pt-[90px]">
      {/* Ribbon: right half on desktop, full-bleed behind the text on mobile. */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-full opacity-55 lg:w-[58%] lg:opacity-70"
        aria-hidden="true"
      >
        <SilkRibbon />
      </div>
      {/* Keep the copy legible where it overlaps the cloth on small screens. */}
      <div
        className="pointer-events-none absolute inset-0 lg:hidden"
        style={{ background: "linear-gradient(100deg, #050807 4%, rgba(5,8,7,.80) 42%, rgba(5,8,7,.30) 100%)" }}
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-[1280px] px-5 pt-10 pb-20 sm:px-8 sm:pt-24 sm:pb-32 lg:pt-28 lg:pb-40">
        <div className="max-w-[730px]">
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

          <motion.h1 {...rise(0.14)} className="h-hero mt-6 text-foreground sm:mt-8">
            Routing algorithm
            <br />
            implementation.
          </motion.h1>

          <motion.p
            {...rise(0.22)}
            className="t-lead measure-body mt-6 text-muted-foreground sm:mt-7"
          >
            Watch routers learn the network. Step through Distance Vector and Link State routing,
            build routing tables, and forward packets hop by hop.
          </motion.p>

          <motion.div {...rise(0.3)} className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4 sm:mt-9">
            <Button
              asChild
              size="lg"
              className="t-body group h-12 rounded-md bg-primary px-5 text-primary-foreground hover:bg-primary/90"
            >
              <Link href="#simulation">
                Start the simulation
                <ArrowRight className="arrow-nudge size-4" strokeWidth={1.75} />
              </Link>
            </Button>

            <Link
              href="#story"
              className="t-body group inline-flex items-center gap-2 text-foreground"
            >
              <span className="underline-offset-[6px] group-hover:underline">Read the theory</span>
              <ArrowDown className="arrow-nudge arrow-nudge-down size-4" strokeWidth={1.75} />
            </Link>
          </motion.div>
        </div>

        {/* The lab's own network, running the real algorithms. Sits in the right
            half on large screens and becomes a band under the buttons below that. */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduced ? 0 : 1.1, delay: reduced ? 0 : 0.45, ease: EASE }}
          className="relative mt-8 h-[250px] w-full sm:mt-12 sm:h-[300px] lg:pointer-events-none lg:absolute lg:top-1/2 lg:right-4 lg:mt-0 lg:h-[420px] lg:w-[54%] lg:-translate-y-[44%]"
        >
          <HeroRouting className="size-full" />
        </motion.div>
      </div>
    </section>
  );
}
