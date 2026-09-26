"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronDown, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Logo, LogoTile, Wordmark } from "./Logo";

type Item = { label: string; href: string; note: string };

const MENUS: { label: string; items: Item[] }[] = [
  {
    label: "Theory",
    items: [
      { label: "Distance Vector", href: "#story", note: "Bellman-Ford, neighbours only" },
      { label: "Link State", href: "#story", note: "Dijkstra over a flooded LSDB" },
      { label: "Packet Forwarding", href: "#story", note: "One lookup per hop" },
      { label: "Implementation", href: "#story", note: "C, C++, Python, Java" },
    ],
  },
  {
    label: "Simulations",
    items: [
      { label: "Dijkstra", href: "#simulation", note: "Flood, then compute the tree" },
      { label: "Distance Vector", href: "#simulation", note: "Exchange rounds, count-to-infinity" },
      { label: "Packet Forwarding", href: "#simulation", note: "Hop by hop, with link failure" },
    ],
  },
  {
    label: "Tests",
    items: [
      { label: "Pre-Test", href: "#pre-test", note: "10 questions on routing basics" },
      { label: "Post-Test", href: "#post-test", note: "10 questions applying the algorithms" },
    ],
  },
];

// Same-page fragments use a plain <a>, not next/link. The App Router
// intercepts hash Links and does not scroll to the target, so the
// hero and nav anchors silently did nothing.
const LINKS = [
  { label: "Aim", href: "#aim" },
  { label: "Conclusion", href: "#conclusion" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);

  // The page behind an open dropdown dims and blurs.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, { passive: true });
    return () => window.removeEventListener("scroll", close);
  }, [open]);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[7px]"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-5">
        <div
          className="mx-auto flex h-[60px] w-full max-w-[1280px] items-center gap-3 rounded-lg border px-3 sm:h-[70px] sm:px-5"
          style={{
            background: "rgba(5, 12, 8, 0.94)",
            borderColor: "var(--hairline)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          <a href="#top" aria-label="vlab.routing — back to top" className="shrink-0">
            <Logo />
          </a>

          {/* ------------------------------------------------ desktop nav */}
          <NavigationMenu
            className="ml-auto hidden lg:flex"
            value={open ? undefined : ""}
            onValueChange={(v) => setOpen(Boolean(v))}
            viewport={false}
          >
            <NavigationMenuList className="gap-0.5">
              {MENUS.map((menu) => (
                <NavigationMenuItem key={menu.label}>
                  <NavigationMenuTrigger className="h-9 bg-transparent px-3 t-small text-foreground hover:bg-white/5 data-[state=open]:bg-white/5">
                    {menu.label}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="rounded-lg border border-border bg-popover p-1.5 shadow-[0_24px_60px_rgba(0,0,0,.5)]">
                    <ul className="w-[300px]">
                      {menu.items.map((item) => (
                        <li key={item.label}>
                          <NavigationMenuLink asChild>
                            <a
                              href={item.href}
                              className="block rounded-md px-3 py-2.5 transition-colors hover:bg-emerald-deep/50 focus:bg-emerald-deep/50"
                            >
                              <span className="block t-small text-foreground">{item.label}</span>
                              <span className="t-small mono mt-0.5 block text-dim">
                                {item.note}
                              </span>
                            </a>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ))}

              {LINKS.map((l) => (
                <NavigationMenuItem key={l.href}>
                  <NavigationMenuLink asChild>
                    <a
                      href={l.href}
                      className="flex h-9 items-center rounded-md px-3 t-small text-foreground transition-colors hover:bg-white/5"
                    >
                      {l.label}
                    </a>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>

          <Button
            asChild
            variant="outline"
            className="ml-auto hidden h-9 border-emerald-bright/25 bg-emerald-deep/50 px-4 t-small text-foreground hover:bg-emerald-deep lg:ml-2 lg:flex"
          >
            <a href="#simulation">Start Lab</a>
          </Button>

          {/* ------------------------------------------------ mobile nav */}
          <Sheet open={sheet} onOpenChange={setSheet}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="ml-auto grid size-10 place-items-center rounded-md border border-border transition-colors hover:bg-white/5 lg:hidden"
              >
                <Menu className="size-5" strokeWidth={1.5} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] border-border bg-surface p-0">
              <SheetHeader className="border-b border-border px-5 py-4">
                <SheetTitle className="flex items-center gap-2.5">
                  <LogoTile />
                  <Wordmark />
                </SheetTitle>
              </SheetHeader>
              <nav className="scroll-thin overflow-y-auto px-3 pb-8">
                {MENUS.map((menu) => (
                  <div key={menu.label} className="py-3">
                    <p className="eyebrow px-2 pb-1.5">{menu.label}</p>
                    {menu.items.map((item) => (
                      <a
                        key={item.label + item.href}
                        href={item.href}
                        onClick={() => setSheet(false)}
                        className="block rounded-md px-2 py-2 t-small text-foreground transition-colors hover:bg-emerald-deep/50"
                      >
                        {item.label}
                        <span className="t-small mono block text-dim">{item.note}</span>
                      </a>
                    ))}
                  </div>
                ))}
                <div className="border-t border-border py-3">
                  {LINKS.map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      onClick={() => setSheet(false)}
                      className="block rounded-md px-2 py-2 t-small text-foreground transition-colors hover:bg-emerald-deep/50"
                    >
                      {l.label}
                    </a>
                  ))}
                </div>
                <Button
                  asChild
                  className="group mt-2 w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => setSheet(false)}
                >
                  <a href="#simulation">
                    Start Lab
                    <ArrowRight className="arrow-nudge size-4" />
                  </a>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
    </>
  );
}

/** Chevron used by the trigger; exported so the mobile sheet can match it. */
export function Chevron({ className }: { className?: string }) {
  return <ChevronDown className={cn("size-3.5", className)} strokeWidth={1.75} />;
}
