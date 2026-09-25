/**
 * Single source of truth for the lab's identity.
 * Change EXPERIMENT_NUMBER here and it updates the header, the <title> and the
 * metadata description everywhere on the page.
 */
export const EXPERIMENT_NUMBER = "08";

export const EXPERIMENT_TITLE = "Routing Algorithm Implementation";

export const INSTITUTION = "K J Somaiya School of Engineering";

export const LOGO_SRC = "/somaiya-logo.png";

export const AIM =
  "To understand and implement routing algorithms — Distance Vector Routing (Bellman-Ford) and Link State Routing (Dijkstra) — and observe how routing tables are built and used for packet forwarding.";

export const NAV_LINKS = [
  { id: "aim", label: "Aim" },
  { id: "theory", label: "Theory" },
  { id: "pre-test", label: "Pre-Test" },
  { id: "simulation", label: "Simulation" },
  { id: "post-test", label: "Post-Test" },
  { id: "conclusion", label: "Conclusion" },
] as const;
