import type { Metadata } from "next";
import { DemoOne } from "@/components/demo/horizon-hero-demo";

export const metadata: Metadata = {
  title: "Horizon — hero section demo",
  description:
    "Three.js and GSAP scroll-driven hero section, isolated on its own route.",
};

/**
 * The horizon hero owns the window scroll and the full viewport, so it lives on
 * its own route rather than inside the lab page, which already drives a pinned
 * scroll story from the same scroll position.
 */
export default function HorizonPage() {
  return <DemoOne />;
}
