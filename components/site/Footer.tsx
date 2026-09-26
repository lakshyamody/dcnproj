"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EXPERIMENT_NUMBER, INSTITUTION, LOGO_SRC } from "@/lib/config";
import { Logo } from "./Logo";

const DotMatrixCube = dynamic(() => import("./DotMatrixCube").then((m) => m.DotMatrixCube), {
  ssr: false,
  loading: () => <div className="size-full" />,
});

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Lab",
    links: [
      { label: "Aim", href: "#aim" },
      { label: "Theory", href: "#story" },
      { label: "Simulations", href: "#simulation" },
      { label: "Conclusion", href: "#conclusion" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "RFC 1058 — RIP", href: "https://www.rfc-editor.org/rfc/rfc1058" },
      { label: "RFC 2328 — OSPF", href: "https://www.rfc-editor.org/rfc/rfc2328" },
      { label: "Pre-Test", href: "#pre-test" },
      { label: "Post-Test", href: "#post-test" },
    ],
  },
  {
    title: "Institute",
    links: [
      { label: INSTITUTION, href: "#top" },
      { label: "Computer Engineering", href: "#top" },
      { label: `Experiment ${EXPERIMENT_NUMBER}`, href: "#top" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative bg-deep">
      <div className="mx-auto w-full max-w-[1280px] px-5 sm:px-8">
        <div className="grid border-x border-t border-emerald-bright/12 lg:grid-cols-2">
          {/* -------------------------------------------- left: mark + object */}
          <div className="border-b border-emerald-bright/12 p-8 lg:border-r lg:border-b-0 lg:p-10">
            <Logo />
            <div className="mt-6 h-[260px] w-full sm:h-[320px]">
              <DotMatrixCube />
            </div>
          </div>

          {/* -------------------------------------------- right: tagline + links */}
          <div className="p-8 lg:p-10">
            <p className="t-h3 max-w-[26ch] text-foreground">
              Routing algorithms, learned by doing.
            </p>
            <Button
              asChild
              className="t-small mt-6 h-10 rounded-md bg-primary px-4 text-primary-foreground hover:bg-primary/90"
            >
              <a href="#simulation">Open the lab</a>
            </Button>

            <div className="mt-14 grid gap-8 sm:grid-cols-3">
              {COLUMNS.map((col) => (
                <div key={col.title}>
                  {col.title === "Institute" && (
                    <span className="mb-4 grid size-14 place-items-center rounded-lg bg-[#f4f6f5]">
                      <Image
                        src={LOGO_SRC}
                        alt={INSTITUTION}
                        width={96}
                        height={96}
                        className="size-[46px] object-contain"
                      />
                    </span>
                  )}
                  <p className="eyebrow mb-3.5">{col.title}</p>
                  <ul className="space-y-2.5">
                    {col.links.map((l) => {
                      const external = l.href.startsWith("http");
                      return (
                        <li key={l.label}>
                          {external ? (
                            <a
                              href={l.href}
                              target="_blank"
                              rel="noreferrer"
                              className="t-small group inline-flex items-start gap-1 text-muted-foreground transition-colors hover:text-foreground"
                            >
                              {l.label}
                              <ArrowUpRight className="mt-0.5 size-3 shrink-0" strokeWidth={1.75} />
                            </a>
                          ) : (
                            <a
                              href={l.href}
                              className="t-small text-muted-foreground transition-colors hover:text-foreground"
                            >
                              {l.label}
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="t-small mono flex flex-col gap-2 border border-emerald-bright/12 px-8 py-5 text-dim sm:flex-row sm:items-center">
          <span>{INSTITUTION}</span>
          <span className="sm:ml-auto">
            © {new Date().getFullYear()} · Virtual Lab · Experiment {EXPERIMENT_NUMBER}
          </span>
        </div>
        <div className="h-10" />
      </div>
    </footer>
  );
}
