"use client";

import { Minus, Plus } from "lucide-react";
import { ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/** Inline code chip used throughout the theory prose. */
export function K({ children }: { children: ReactNode }) {
  return (
    <code className="mono rounded border border-border bg-black/40 px-1.5 py-0.5 text-[0.85em] text-emerald-bright">
      {children}
    </code>
  );
}

export interface TheoryBody {
  basicIdea: ReactNode;
  howItWorks: ReactNode;
  analogy: ReactNode;
  advantages: string[];
  disadvantages: string[];
  extra?: ReactNode;
}

/** Collapsible full theory under each story step. All lab prose stays on the page. */
export function FullTheory({ body }: { body: TheoryBody }) {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="theory" className="border-t border-b-0 border-border">
        <AccordionTrigger className="group py-4 hover:no-underline [&>svg]:hidden">
          <span className="t-pill mono flex items-center gap-2.5 text-dim transition-colors group-hover:text-foreground">
            <Plus className="size-3.5 group-data-[state=open]:hidden" />
            <Minus className="hidden size-3.5 group-data-[state=open]:block" />
            Full theory
          </span>
        </AccordionTrigger>
        <AccordionContent className="pb-8">
          <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
            <div className="t-body space-y-6 text-muted-foreground">
              <Block label="Basic idea">{body.basicIdea}</Block>
              <Block label="How it works">{body.howItWorks}</Block>
              <Block label="Simple analogy">{body.analogy}</Block>
              {body.extra}
            </div>
            <div className="space-y-4">
              <Bullets tone="ok" heading="Advantages" items={body.advantages} />
              <Bullets tone="danger" heading="Disadvantages" items={body.disadvantages} />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="t-pill mono mb-2 text-emerald-bright">
        {label}
      </p>
      <div>{children}</div>
    </div>
  );
}

function Bullets({
  heading,
  items,
  tone,
}: {
  heading: string;
  items: string[];
  tone: "ok" | "danger";
}) {
  return (
    <div className="panel-card p-4">
      <p
        className={`t-label mono mb-3 ${
          tone === "ok" ? "text-emerald-bright" : "text-danger"
        }`}
      >
        {heading}
      </p>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item} className="t-small flex gap-2.5 text-muted-foreground">
            <span
              className={`mt-[9px] h-px w-2.5 shrink-0 ${
                tone === "ok" ? "bg-emerald-bright" : "bg-danger"
              }`}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ================================================================== *
 * The lab's theory text. Same content as before the restyle.
 * ================================================================== */

export const DV_THEORY: TheoryBody = {
  basicIdea: (
    <>
      Each router keeps a <span className="text-foreground">distance vector</span>: one row holding
      its current best cost to every destination, plus the neighbour it would forward through.
      Periodically it hands that entire vector to its{" "}
      <span className="text-foreground">direct neighbours only</span> — never to the whole network.
      No router ever learns the topology; it only learns other routers&rsquo; claims about distance.
    </>
  ),
  howItWorks: (
    <>
      A router starts knowing only its own attached links. When neighbour <K>v</K> advertises its
      vector, router <K>x</K> applies the{" "}
      <span className="text-foreground">Bellman-Ford update rule</span>:
      <span className="t-small mono my-4 block overflow-x-auto rounded-lg border border-emerald-bright/20 bg-black/40 px-4 py-3.5 text-center text-emerald-bright">
        D(x, y) = min<sub className="text-dim">v ∈ N(x)</sub> &#123; c(x, v) + D(v, y) &#125;
      </span>
      &ldquo;My cost to <K>y</K> is the cheapest, over all my neighbours <K>v</K>, of the cost of
      getting to <K>v</K> plus what <K>v</K> tells me it costs from there.&rdquo; If that beats the
      stored value, the cost and the next hop are replaced and the improved vector is advertised in
      the next period. Good news spreads one hop per period, so a network with a diameter of five
      needs five periods to settle.
      <span className="mt-4 block">
        The real protocol is <span className="text-foreground">RIP</span>: metric is hop count, the
        maximum usable metric is 15, <span className="text-foreground">16 means unreachable</span>,
        and full vectors are broadcast every 30 seconds.
      </span>
    </>
  ),
  analogy: (
    <>
      You are lost, so you ask the people standing nearest to you how far the station is. You take
      the smallest answer, add how far it is to that person, and repeat. It works, and it needs no
      map — but you are trusting an estimate from someone who is also only repeating what{" "}
      <em>they</em> were told. When the station moves, the stale estimate keeps circulating for a
      while.
    </>
  ),
  advantages: [
    "Very simple to implement: one vector per router and a minimum operation.",
    "Low memory and CPU cost, so it runs on the cheapest hardware.",
    "No router needs global knowledge, which keeps configuration trivial on small networks.",
  ],
  disadvantages: [
    "Slow convergence: news advances only one hop per update period.",
    "Count-to-infinity — after a failure, routers keep believing each other's stale estimates and costs creep upward instead of jumping to infinity.",
    "Periodic full-table broadcasts waste bandwidth even when nothing has changed.",
  ],
  extra: (
    <div className="rounded-lg border border-danger/25 bg-danger/[0.05] p-4">
      <p className="t-pill mono mb-2.5 text-danger">
        The two classic problems — and their fixes
      </p>
      <p className="t-small">
        <span className="text-foreground">Slow convergence</span> is inherent: an update takes one
        period per hop. <span className="text-foreground">Count-to-infinity</span> is worse. Take the
        chain <K>A–B–C</K>. When <K>B–C</K> fails, <K>B</K> asks around and hears <K>A</K> claim a
        cost of 2 to <K>C</K> — a route that in fact runs <em>through B itself</em>. <K>B</K> sets
        its cost to 3, <K>A</K> then raises its own to 4, and the pair crawl upward to the infinity
        cap of 16 before either gives up.
      </p>
      <ul className="mt-4 space-y-2.5">
        {[
          ["Split horizon", "Never advertise a route back out of the interface it was learned on. A cannot tell B about a route that goes through B."],
          ["Poison reverse", "Stronger: advertise such routes back with cost = infinity, so the neighbour is told explicitly rather than left to time out."],
          ["Hold-down timers", "After hearing a route has become unreachable, ignore better news about it for a fixed period, so a stale advertisement in flight cannot resurrect it."],
        ].map(([name, text]) => (
          <li key={name} className="t-small flex gap-2.5">
            <span className="mt-[9px] h-px w-2.5 shrink-0 bg-emerald-bright" />
            <span>
              <span className="text-foreground">{name}</span> — {text}
            </span>
          </li>
        ))}
      </ul>
      <p className="t-small mono mt-3.5 text-dim">
        Simulation 2 lets you break a link and toggle these on and off, so you can watch the counting
        start and then watch it stop.
      </p>
    </div>
  ),
};

export const LS_THEORY: TheoryBody = {
  basicIdea: (
    <>
      Instead of sharing conclusions, each router shares <em>observations</em>. A router describes
      only what it can see for itself — its directly attached links and their costs — in a{" "}
      <span className="text-foreground">Link State Packet (LSP)</span>, and floods that packet to{" "}
      <span className="text-foreground">every router</span>, not just its neighbours.
    </>
  ),
  howItWorks: (
    <>
      <span className="text-foreground">Flooding.</span> A router sends its LSP out of every
      interface. Each receiver stores it, checks the sequence number, and passes it on out of every
      interface except the one it arrived on; duplicates are dropped. Within a round trip or two,
      every router holds every LSP.
      <span className="mt-3 block">
        <span className="text-foreground">The LSDB.</span> That collection is the{" "}
        <span className="text-foreground">Link State Database</span> — and because all routers
        receive all LSPs, every router holds an <em>identical</em> copy. The LSDB is a complete,
        consistent map of the topology.
      </span>
      <span className="mt-3 block">
        <span className="text-foreground">Computation.</span> Each router now runs{" "}
        <span className="text-foreground">Dijkstra&rsquo;s algorithm</span> over its LSDB with{" "}
        <em>itself</em> as the source. It repeatedly finalises the nearest unvisited node and relaxes
        that node&rsquo;s links, producing its own{" "}
        <span className="text-foreground">shortest-path tree</span>. Reading the first hop of each
        branch gives the routing table. The computation is purely local: no negotiation, no waiting,
        and because everyone computed from the same map, the trees are mutually consistent — which is
        why loops essentially do not occur.
      </span>
      <span className="mt-3 block">
        The real protocols are <span className="text-foreground">OSPF</span> (the common interior
        gateway protocol on IP networks, which divides large domains into areas to keep the LSDB and
        the Dijkstra run manageable) and <span className="text-foreground">IS-IS</span> (widely used
        in service provider cores).
      </span>
    </>
  ),
  analogy: (
    <>
      Nobody asks for directions. Instead, every resident publishes a note listing only the streets
      on their own block. The notes are copied to everyone, so each person ends up holding the{" "}
      <em>same full city map</em> — and then plans their own route across it. More paperwork up
      front, but nobody is relying on anybody else&rsquo;s opinion about how far away things are.
    </>
  ),
  advantages: [
    "Fast convergence: flooding is near-immediate and each router then computes alone, with no round-by-round waiting.",
    "Essentially loop-free, because every router computes from an identical topology map.",
    "Sends updates on change rather than on a timer, and supports rich metrics, areas and equal-cost multipath.",
  ],
  disadvantages: [
    "Every router must store the entire LSDB, so memory grows with the size of the network.",
    "Running Dijkstra is far more CPU-expensive than taking a minimum over a vector.",
    "Flooding produces a burst of control traffic, and large domains must be split into areas to stay tractable.",
  ],
};

export const FORWARDING_THEORY: TheoryBody = {
  basicIdea: (
    <>
      Once the tables exist, forwarding is almost trivial — and deliberately so, because it has to
      happen for every packet at line rate. The router reads the destination address, finds the
      matching row, and sends the packet out towards that row&rsquo;s next hop. It does not know the
      path, does not modify the payload, and does not remember the packet.
    </>
  ),
  howItWorks: (
    <>
      At each hop the router performs one lookup and one hand-off:
      <ol className="t-small mono mt-3.5 space-y-2">
        {[
          "Read the destination address out of the packet header.",
          "Search the routing table for the entry that matches it.",
          "Read that entry's next hop and outgoing interface.",
          "Decrement the TTL; if it hits zero, discard and send ICMP time-exceeded.",
          "Transmit the frame to the next hop — and forget the packet.",
        ].map((s, i) => (
          <li key={s} className="flex gap-3">
            <span className="w-4 shrink-0 text-right text-emerald-bright">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <span className="mt-4 block">
        The packet then repeats this at the next router, and the next, until it reaches a router to
        which the destination is directly attached. Each decision is completely independent, which is
        the strength and the weakness: a single stale table drops the packet (no matching entry →
        ICMP destination-unreachable) or sends it in a circle until the TTL expires.
      </span>
      <span className="mt-4 block">
        <span className="text-foreground">Longest-prefix match.</span> Real tables hold network
        prefixes, not single hosts, and several can match one address at once — <K>10.1.2.0/24</K>,{" "}
        <K>10.1.0.0/16</K> and <K>0.0.0.0/0</K> all match <K>10.1.2.7</K>. The router always chooses
        the <span className="text-foreground">most specific</span> one, i.e. the longest prefix,
        which is how a specific route can override a summary and how the default route works as a
        catch-all. In this experiment destinations are single routers, so the match is exact and the
        rule collapses to a simple lookup.
      </span>
    </>
  ),
  analogy: (
    <>
      A parcel moving through a chain of sorting offices. No office knows the whole journey; each one
      reads the address, drops the parcel into one outgoing bag, and is finished with it. The parcel
      arrives because every office along the way was consistent — and goes round in circles if two of
      them disagree.
    </>
  ),
  advantages: [
    "Extremely fast: one table lookup per packet, with no per-flow state to maintain.",
    "Completely decoupled from routing, so the algorithm can change without touching the data plane.",
    "Scales through prefix aggregation — one summary row can cover millions of addresses.",
  ],
  disadvantages: [
    "Only as correct as the tables: stale entries silently drop or loop traffic.",
    "Hop-by-hop decisions mean no router can guarantee or even observe the end-to-end path.",
    "Cannot react to congestion or failure by itself; it must wait for the routing protocol to re-converge.",
  ],
};

export const IMPLEMENTATION_THEORY: TheoryBody = {
  basicIdea: (
    <>
      Both algorithms are short enough to write from scratch. Every program below models the default
      lab network and prints router <K>A</K>&rsquo;s routing table, so its output can be checked
      against the simulations: <K>B C 3</K>, <K>C C 2</K>, <K>D C 8</K>, <K>E C 10</K>,{" "}
      <K>F C 13</K>.
    </>
  ),
  howItWorks: (
    <>
      The <span className="text-foreground">Link State</span> programs build an adjacency structure
      (the LSDB), run Dijkstra from the source, and then walk the predecessor array backwards to
      recover the <em>first</em> hop of each path — because that single hop is all a router stores.
      <span className="mt-3 block">
        The <span className="text-foreground">Distance Vector</span> programs hold a full{" "}
        <K>dv[x][y]</K> matrix and repeat synchronous exchange rounds: every router advertises, then
        every router recomputes <K>min over v of c(x,v) + D(v,y)</K> from that same snapshot. The
        loop runs until a round changes nothing. Costs are clamped at{" "}
        <span className="text-foreground">16</span>, RIP&rsquo;s infinity, which is what stops
        count-to-infinity running forever.
      </span>
      <span className="mt-3 block">
        The C versions use fixed-size arrays and no dynamic allocation, which is what most submitted
        lab programs look like. The C++ and Java versions use a real priority queue, so they show the
        O((V+E) log V) form of Dijkstra rather than the O(V²) scan.
      </span>
    </>
  ),
  analogy: (
    <>
      The pseudocode is the recipe; these are four kitchens cooking it. The ingredients and the
      result are identical — only the utensils differ.
    </>
  ),
  advantages: [
    "Every program is self-contained: one file, no dependencies, compiles and runs as-is.",
    "All four print the same table, so a student can check one language against another.",
    "Comments mark each phase of the algorithm against the pseudocode.",
  ],
  disadvantages: [
    "Fixed-size arrays cap the network at six routers; real implementations grow dynamically.",
    "The DV programs simulate synchronous rounds, whereas real routers update on independent timers.",
    "No sequence numbers, timers or authentication — a real protocol needs all three.",
  ],
};
