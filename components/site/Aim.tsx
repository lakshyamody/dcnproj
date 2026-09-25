"use client";

import { AIM } from "@/lib/config";
import { Eyebrow, Hairline, Reveal } from "./primitives";

export function Aim() {
  return (
    <section id="aim" className="relative scroll-mt-28">
      <div className="mx-auto w-full max-w-[1280px] px-5 sm:px-8">
        <Hairline />
        <Reveal className="py-20 text-center sm:py-28">
          <Eyebrow className="text-emerald-bright">Aim</Eyebrow>
          <p className="t-h2 mx-auto mt-6 max-w-[54rem] text-balance text-foreground">
            {AIM}
          </p>
        </Reveal>
        <Hairline />
      </div>
    </section>
  );
}
