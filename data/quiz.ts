/**
 * All quiz content lives here: pre-test, post-test, answers and explanations.
 * To edit a question, change it in this file only — the modal reads from here.
 *
 * `answer` is the 0-based index of the correct entry in `options`.
 * `figure` is rendered as a monospace block above the options, for questions
 * that need a small graph or table.
 */

export interface QuizQuestion {
  id: string;
  prompt: string;
  figure?: string[];
  options: string[];
  answer: number;
  explanation: string;
}

/* ================================================================== *
 * Pre-Test — routing fundamentals
 * ================================================================== */

export const PRE_TEST: QuizQuestion[] = [
  {
    id: "pre-1",
    prompt: "What is the difference between routing and forwarding?",
    options: [
      "Routing builds the routing table by exchanging information between routers; forwarding moves an individual packet out of an interface using that table.",
      "Routing moves packets between interfaces; forwarding decides which paths through the network are best.",
      "They are two names for the same operation, used by different vendors.",
      "Routing applies only inside a LAN, while forwarding applies only between autonomous systems.",
    ],
    answer: 0,
    explanation:
      "Routing is the control plane: it runs between routers over seconds, learns what paths exist, and produces a table. Forwarding is the data plane: for one packet it reads the destination, does one table lookup, and sends the packet on. Routing decides; forwarding acts.",
  },
  {
    id: "pre-2",
    prompt: "Which three columns make up a basic routing table entry?",
    options: [
      "Destination | Next Hop | Cost",
      "Source | Destination | Payload length",
      "MAC address | IP address | VLAN ID",
      "Destination | Full path | Round-trip time",
    ],
    answer: 0,
    explanation:
      "Each row says where a packet is going (destination), which single neighbour to hand it to (next hop), and how expensive that route is according to the protocol's metric (cost). A real table also carries the outgoing interface and the prefix length, but these three are the core.",
  },
  {
    id: "pre-3",
    prompt: "A router stores which of the following for each destination?",
    options: [
      "Only the next hop — one neighbour to forward through.",
      "The complete list of routers the packet will pass through.",
      "The IP addresses of every host on the destination network.",
      "A cached copy of the last packet sent to that destination.",
    ],
    answer: 0,
    explanation:
      "Forwarding is hop by hop. A router only ever commits to the next router and trusts that one to know the rest of the way. This is why hop-by-hop forwarding is fast and scalable — and why one inconsistent table anywhere along the way can loop or drop the packet.",
  },
  {
    id: "pre-4",
    prompt: "What is a routing metric (cost)?",
    options: [
      "A number the protocol assigns to a route so it can compare alternatives; the lowest total wins.",
      "The physical length of the cable in metres.",
      "The number of packets currently queued on the interface.",
      "A priority tag carried inside every packet header.",
    ],
    answer: 0,
    explanation:
      "The metric is whatever the protocol chooses to measure. RIP counts hops. OSPF derives cost from interface bandwidth, so a fast link is 'shorter' than a slow one. Either way the algorithm simply minimises the total, so the metric definition decides which path is considered 'best'.",
  },
  {
    id: "pre-5",
    prompt: "Which statement correctly contrasts static and dynamic routing?",
    options: [
      "Static routes are configured by an administrator and do not react to failure; dynamic routes are computed by a protocol and are recomputed when the topology changes.",
      "Static routes change every 30 seconds; dynamic routes are permanent once installed.",
      "Static routing needs more CPU and bandwidth than dynamic routing.",
      "Dynamic routing works only on a single subnet; static routing is required between networks.",
    ],
    answer: 0,
    explanation:
      "A static route is a manual entry: zero protocol overhead and completely predictable, but if the link it points over fails, the route stays wrong until a human fixes it. Dynamic routing costs bandwidth and CPU but discovers topology and heals automatically.",
  },
  {
    id: "pre-6",
    prompt: "In Distance Vector Routing, who does a router share its information with?",
    options: [
      "Its directly connected neighbours only.",
      "Every router in the network, by flooding.",
      "A central route server that redistributes it.",
      "Only the routers it has a route to.",
    ],
    answer: 0,
    explanation:
      "That restriction is the defining property of the family. A distance vector router talks only to the routers next door, which is why information advances one hop per update period and why convergence is slow.",
  },
  {
    id: "pre-7",
    prompt: "In Link State Routing, what does a router send, and to whom?",
    options: [
      "A description of its own directly attached links, flooded to every router in the area.",
      "Its complete routing table, to its neighbours only.",
      "Its distance to every destination, to every router in the area.",
      "Nothing — it queries a neighbour whenever it needs a route.",
    ],
    answer: 0,
    explanation:
      "A Link State Packet carries observations, not conclusions: 'these are the links I have and what they cost'. Flooding it to everyone means all routers build the same Link State Database — the same map — and can then each compute independently.",
  },
  {
    id: "pre-8",
    prompt: "Which of these is a Distance Vector protocol?",
    options: ["RIP", "OSPF", "IS-IS", "BGP-LS"],
    answer: 0,
    explanation:
      "RIP (and RIPv2, and Cisco's IGRP) is distance vector: hop count as the metric, full vectors broadcast to neighbours every 30 seconds, and a maximum usable metric of 15. OSPF and IS-IS are link state protocols.",
  },
  {
    id: "pre-9",
    prompt: "Which of these is a Link State protocol?",
    options: ["OSPF", "RIPv2", "IGRP", "RIPng"],
    answer: 0,
    explanation:
      "OSPF floods Link State Advertisements, builds an LSDB in every router, and runs Dijkstra locally. IS-IS works the same way. RIPv2, RIPng and IGRP are all distance vector.",
  },
  {
    id: "pre-10",
    prompt: "Which algorithm belongs to which family?",
    options: [
      "Bellman-Ford → Distance Vector; Dijkstra → Link State",
      "Dijkstra → Distance Vector; Bellman-Ford → Link State",
      "Both families use Dijkstra; they differ only in the metric.",
      "Both families use Bellman-Ford; they differ only in the update timer.",
    ],
    answer: 0,
    explanation:
      "Distance vector routing is a distributed Bellman-Ford: each router computes part of the answer using its neighbours' estimates. Link state routing hands every router the whole map, so each one can run Dijkstra locally and finish the computation by itself.",
  },
];

/* ================================================================== *
 * Post-Test — applying the algorithms
 * ================================================================== */

export const POST_TEST: QuizQuestion[] = [
  {
    id: "post-1",
    prompt:
      "Run Dijkstra from source P on the network below. What is the cost of the shortest path from P to T?",
    figure: [
      "Nodes:  P  Q  R  S  T",
      "Edges:  P-Q 1    P-R 4    Q-R 2",
      "        Q-S 6    R-S 3    S-T 2    R-T 8",
    ],
    options: ["8", "10", "11", "9"],
    answer: 0,
    explanation:
      "P→Q = 1. P→R = min(4 direct, 1+2 via Q) = 3. P→S = min(1+6 via Q, 3+3 via R) = 6. P→T = min(6+2 via S, 3+8 via R) = 8. So the shortest path is P→Q→R→S→T at a total cost of 8 — cheaper than the single direct-looking route through R.",
  },
  {
    id: "post-2",
    prompt: "For the same network, what is the Next Hop entry in P's routing table for destination T?",
    figure: [
      "Nodes:  P  Q  R  S  T",
      "Edges:  P-Q 1    P-R 4    Q-R 2",
      "        Q-S 6    R-S 3    S-T 2    R-T 8",
    ],
    options: ["Q", "R", "S", "T"],
    answer: 0,
    explanation:
      "The shortest path is P→Q→R→S→T. The next hop is always the FIRST router on that path, so P's table reads 'T | Q | 8'. P never stores the rest of the path — R, S and T each make their own independent decision when the packet arrives.",
  },
  {
    id: "post-3",
    prompt:
      "In which order does Dijkstra finalise (permanently label) the nodes for source P on the same network?",
    figure: [
      "Nodes:  P  Q  R  S  T",
      "Edges:  P-Q 1    P-R 4    Q-R 2",
      "        Q-S 6    R-S 3    S-T 2    R-T 8",
    ],
    options: ["P, Q, R, S, T", "P, Q, S, R, T", "P, R, Q, S, T", "P, Q, R, T, S"],
    answer: 0,
    explanation:
      "Dijkstra always extracts the smallest tentative distance next, so nodes are finalised in non-decreasing order of final distance: P(0), Q(1), R(3), S(6), T(8). That ordering property is exactly why a node's distance can never improve after it has been finalised.",
  },
  {
    id: "post-4",
    prompt:
      "Router B currently has D(B,F) = 12 with next hop D. Neighbour C advertises D(C,F) = 9, and the link cost c(B,C) = 1. Applying one Bellman-Ford update step, what does B's entry for F become?",
    options: [
      "Cost 10, next hop C",
      "Cost 9, next hop C",
      "Cost 12, next hop D — unchanged, because 9 < 12 only at C",
      "Cost 13, next hop D",
    ],
    answer: 0,
    explanation:
      "The rule is D(x,y) = min over v of { c(x,v) + D(v,y) }. Here the candidate via C is c(B,C) + D(C,F) = 1 + 9 = 10. Since 10 < 12 the route is replaced: cost 10, next hop C. Note the neighbour's own cost (9) is not copied — the link cost to that neighbour is always added on.",
  },
  {
    id: "post-5",
    prompt:
      "On the chain A–B–C, the link B–C fails. With no loop-prevention features enabled, what happens next?",
    options: [
      "B hears A advertise a cost of 2 to C — a route that actually runs through B — and raises its own cost step by step towards infinity along with A. This is count-to-infinity.",
      "B immediately sets its cost to C to infinity and A follows in the next update period.",
      "A and B both delete every entry in their tables and rebuild from scratch.",
      "The packets to C are buffered until the link is repaired, and no table entry changes.",
    ],
    answer: 0,
    explanation:
      "B loses its direct route and looks for an alternative. A is still advertising cost 2 to C, and B has no way to know that A's route goes back through B itself. B believes it (1 + 2 = 3), A then believes B's new figure (1 + 3 = 4), and the two crawl upward. Only the RIP infinity cap of 16 ends it — which is why convergence after a failure is so slow.",
  },
  {
    id: "post-6",
    prompt: "What exactly does split horizon do?",
    options: [
      "A router never advertises a route back out of the interface it learned that route on.",
      "A router splits its routing table in half and advertises each half on alternate update periods.",
      "A router refuses to accept any route whose cost exceeds half of infinity.",
      "A router advertises only routes to directly attached networks.",
    ],
    answer: 0,
    explanation:
      "If A learned its route to C from B, then that route goes through B, and telling B about it is worthless at best and dangerous at worst. Withholding it means that when B loses its own path to C, nobody hands B a stale echo of B's own route — so the counting never starts.",
  },
  {
    id: "post-7",
    prompt: "How does poison reverse differ from plain split horizon?",
    options: [
      "Split horizon stays silent about such a route; poison reverse advertises it back explicitly with cost = infinity.",
      "Poison reverse deletes the route from the table, while split horizon only hides it.",
      "Poison reverse applies to link state protocols, split horizon to distance vector protocols.",
      "They are identical; poison reverse is simply the name used in OSPF.",
    ],
    answer: 0,
    explanation:
      "Both stop a router echoing a route back where it came from, but silence is ambiguous — the neighbour has to wait for a timeout to conclude anything. Poison reverse replaces silence with an explicit 'cost infinity, do not use me', so the bad news propagates immediately instead of expiring quietly.",
  },
  {
    id: "post-8",
    prompt: "Which statement about OSPF versus RIP is correct?",
    options: [
      "OSPF floods link state information to all routers and each runs Dijkstra; RIP sends distance vectors to neighbours only and uses hop count with a maximum of 15.",
      "OSPF uses hop count with a maximum of 15; RIP derives its cost from interface bandwidth.",
      "Both flood link state packets, but OSPF updates every 30 seconds and RIP only on change.",
      "RIP converges faster than OSPF because its updates are smaller.",
    ],
    answer: 0,
    explanation:
      "OSPF is link state: LSAs flooded network-wide, an identical LSDB in every router, Dijkstra run locally, cost derived from bandwidth, and updates triggered by change. RIP is distance vector: full vectors to neighbours every 30 seconds, hop count as the metric, 15 as the usable maximum and 16 meaning unreachable.",
  },
  {
    id: "post-9",
    prompt: "In RIP, what does a metric of 16 mean?",
    options: [
      "Unreachable — 16 is RIP's 'infinity', and the route is discarded.",
      "A very long but still usable path of 16 hops.",
      "The route is on hold-down and will be usable after the timer expires.",
      "The metric has overflowed and must be reset to 1 by the administrator.",
    ],
    answer: 0,
    explanation:
      "RIP's usable range is 1–15 hops; 16 is defined as infinity. Capping infinity at a small number is deliberate: it puts a hard ceiling on how long count-to-infinity can run, at the price of limiting the network diameter to 15 hops.",
  },
  {
    id: "post-10",
    prompt:
      "Why does link state routing converge faster and stay essentially loop-free compared with distance vector routing?",
    options: [
      "Flooding spreads raw topology information almost immediately, and every router then computes its own tree from an identical LSDB, so no router depends on another's conclusions.",
      "Link state protocols use a shorter update timer, so the same one-hop-per-period process simply runs more often.",
      "Link state routers exchange their finished routing tables, which removes the need to recompute anything.",
      "Link state routing forwards packets along multiple paths at once, so a loop cannot form.",
    ],
    answer: 0,
    explanation:
      "Distance vector routers pass along conclusions, so an error propagates as fact and news advances one hop per period. Link state routers pass along observations, which are flooded network-wide in one burst. Every router then solves the same problem over the same map, so the resulting trees agree with each other — and disagreement is what causes loops.",
  },
];
