/**
 * Reference implementations shown in the theory section's tabbed code viewer.
 * All eight programs model the default lab network and print router A's table,
 * so their output can be checked against the simulations.
 */

export interface CodeSample {
  language: "C" | "C++" | "Python" | "Java";
  filename: string;
  code: string;
}

/* ================================================================== *
 * Link State Routing - Dijkstra
 * ================================================================== */

export const DIJKSTRA_SAMPLES: CodeSample[] = [
  {
    language: "C",
    filename: "dijkstra.c",
    code: `/* Link State Routing - Dijkstra's shortest path algorithm.
 *
 * Every router floods its own link costs, so every router ends up holding
 * the same Link State Database. This program is what ONE router then runs
 * over that database to build its own shortest-path tree and routing table.
 *
 * Build: gcc dijkstra.c -o dijkstra && ./dijkstra
 */
#include <stdio.h>

#define N   6      /* routers A..F                              */
#define INF 9999   /* "no direct link" / "not reachable yet"     */

/* cost[i][j] = cost of the direct link i-j, INF when there is none.
 * Default lab network:
 *   A-B 4, A-C 2, B-C 1, B-D 5, C-D 8, C-E 10, D-E 2, D-F 6, E-F 3 */
int cost[N][N] = {
/*          A     B     C     D     E     F   */
/* A */ {   0,    4,    2,  INF,  INF,  INF },
/* B */ {   4,    0,    1,    5,  INF,  INF },
/* C */ {   2,    1,    0,    8,   10,  INF },
/* D */ { INF,    5,    8,    0,    2,    6 },
/* E */ { INF,  INF,   10,    2,    0,    3 },
/* F */ { INF,  INF,  INF,    6,    3,    0 }
};

int dist[N];     /* dist[v]    = cheapest known cost source -> v   */
int parent[N];   /* parent[v]  = predecessor of v on that path      */
int done[N];     /* done[v]    = 1 once dist[v] can never improve   */

void dijkstra(int src)
{
    int i, round, u, v;

    /* 1. Initialise: source at 0, everything else at infinity. */
    for (i = 0; i < N; i++) {
        dist[i]   = INF;
        parent[i] = -1;
        done[i]   = 0;
    }
    dist[src] = 0;

    /* 2. Finalise one router per round, always the cheapest one left. */
    for (round = 0; round < N; round++) {
        int best = INF;
        u = -1;
        for (i = 0; i < N; i++)
            if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }

        if (u == -1) break;      /* whatever is left is unreachable */
        done[u] = 1;

        /* 3. Relax every link out of u that leads somewhere unfinished. */
        for (v = 0; v < N; v++) {
            if (done[v] || cost[u][v] >= INF) continue;
            if (dist[u] + cost[u][v] < dist[v]) {
                dist[v]   = dist[u] + cost[u][v];
                parent[v] = u;
            }
        }
    }
}

/* A router stores only ONE hop, not the whole path. The next hop is the
 * first router after the source, so walk parent[] back towards src. */
int next_hop(int src, int dest)
{
    int hop = dest;
    if (dest == src || parent[dest] == -1) return -1;
    while (parent[hop] != src) hop = parent[hop];
    return hop;
}

int main(void)
{
    int src = 0;    /* 0 = router A */
    int v;

    dijkstra(src);

    printf("Routing table for router %c (Link State / Dijkstra)\\n", 'A' + src);
    printf("%-12s %-10s %s\\n", "Destination", "Next Hop", "Cost");
    for (v = 0; v < N; v++) {
        int hop;
        if (v == src) continue;
        hop = next_hop(src, v);
        if (hop == -1)
            printf("%-12c %-10s %s\\n", 'A' + v, "-", "INF");
        else
            printf("%-12c %-10c %d\\n", 'A' + v, 'A' + hop, dist[v]);
    }
    return 0;
}

/* Expected output:
 *   B  C  3      D  C  8
 *   C  C  2      E  C  10
 *                F  C  13                                        */
`,
  },
  {
    language: "C++",
    filename: "dijkstra.cpp",
    code: `// Link State Routing - Dijkstra with a real min-priority queue.
// Build: g++ -std=c++17 dijkstra.cpp -o dijkstra && ./dijkstra

#include <iostream>
#include <vector>
#include <queue>
#include <limits>
#include <iomanip>

using namespace std;

constexpr int INF = numeric_limits<int>::max();

struct Link { int to; int cost; };

// The Link State Database, as an adjacency list.
// Default lab network: A-B 4, A-C 2, B-C 1, B-D 5, C-D 8,
//                      C-E 10, D-E 2, D-F 6, E-F 3
vector<vector<Link>> buildLsdb() {
    const int n = 6;                              // A..F
    vector<vector<Link>> g(n);
    auto link = [&](int a, int b, int c) {        // links are bidirectional
        g[a].push_back({b, c});
        g[b].push_back({a, c});
    };
    link(0, 1, 4);  link(0, 2, 2);  link(1, 2, 1);
    link(1, 3, 5);  link(2, 3, 8);  link(2, 4, 10);
    link(3, 4, 2);  link(3, 5, 6);  link(4, 5, 3);
    return g;
}

// Returns {dist, parent}. parent[v] is v's predecessor in the SPT.
pair<vector<int>, vector<int>> dijkstra(const vector<vector<Link>>& g, int src) {
    const int n = static_cast<int>(g.size());
    vector<int> dist(n, INF), parent(n, -1);
    vector<bool> done(n, false);

    // Min-heap ordered by tentative distance: {dist, node}.
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<>> pq;
    dist[src] = 0;
    pq.push({0, src});

    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();
        if (done[u]) continue;      // a stale copy left in the heap
        done[u] = true;             // dist[u] is now final

        for (const Link& e : g[u]) {
            if (done[e.to]) continue;
            if (d + e.cost < dist[e.to]) {        // relax
                dist[e.to]   = d + e.cost;
                parent[e.to] = u;
                pq.push({dist[e.to], e.to});
            }
        }
    }
    return {dist, parent};
}

int nextHop(const vector<int>& parent, int src, int dest) {
    if (dest == src || parent[dest] == -1) return -1;
    int hop = dest;
    while (parent[hop] != src) hop = parent[hop];
    return hop;
}

int main() {
    auto g = buildLsdb();
    const int src = 0;                            // router A
    auto [dist, parent] = dijkstra(g, src);

    cout << "Routing table for router " << char('A' + src) << " (Link State / Dijkstra)\\n";
    cout << left << setw(13) << "Destination" << setw(11) << "Next Hop" << "Cost\\n";
    for (int v = 0; v < static_cast<int>(g.size()); ++v) {
        if (v == src) continue;
        int hop = nextHop(parent, src, v);
        cout << left << setw(13) << char('A' + v);
        if (hop == -1) cout << setw(11) << "-" << "INF\\n";
        else           cout << setw(11) << char('A' + hop) << dist[v] << "\\n";
    }
    return 0;
}
`,
  },
  {
    language: "Python",
    filename: "dijkstra.py",
    code: `"""Link State Routing - Dijkstra's shortest path algorithm.

Every router floods its own links, so all routers hold the same Link State
Database. This is what one router runs over that database.

Run: python3 dijkstra.py
"""

import heapq

# The LSDB as an adjacency dict. Default lab network:
#   A-B 4, A-C 2, B-C 1, B-D 5, C-D 8, C-E 10, D-E 2, D-F 6, E-F 3
EDGES = [
    ("A", "B", 4), ("A", "C", 2), ("B", "C", 1),
    ("B", "D", 5), ("C", "D", 8), ("C", "E", 10),
    ("D", "E", 2), ("D", "F", 6), ("E", "F", 3),
]


def build_lsdb(edges):
    """Undirected adjacency list: lsdb[router] -> [(neighbour, cost), ...]."""
    lsdb = {}
    for a, b, cost in edges:
        lsdb.setdefault(a, []).append((b, cost))
        lsdb.setdefault(b, []).append((a, cost))
    return lsdb


def dijkstra(lsdb, source):
    """Return (dist, parent) for the shortest-path tree rooted at source."""
    dist = {node: float("inf") for node in lsdb}
    parent = {node: None for node in lsdb}
    done = set()

    dist[source] = 0
    heap = [(0, source)]                      # min-priority queue

    while heap:
        d, u = heapq.heappop(heap)
        if u in done:                         # stale heap entry
            continue
        done.add(u)                           # dist[u] is now final

        for v, cost in lsdb[u]:
            if v in done:
                continue
            if d + cost < dist[v]:            # relax the link u-v
                dist[v] = d + cost
                parent[v] = u
                heapq.heappush(heap, (dist[v], v))

    return dist, parent


def next_hop(parent, source, dest):
    """A router stores one hop, not a path: the first router after source."""
    if dest == source or parent[dest] is None:
        return None
    hop = dest
    while parent[hop] != source:
        hop = parent[hop]
    return hop


def routing_table(lsdb, source):
    dist, parent = dijkstra(lsdb, source)
    rows = []
    for dest in sorted(lsdb):
        if dest == source:
            continue
        hop = next_hop(parent, source, dest)
        rows.append((dest, hop or "-", dist[dest]))
    return rows


if __name__ == "__main__":
    lsdb = build_lsdb(EDGES)
    print("Routing table for router A (Link State / Dijkstra)")
    print(f"{'Destination':<13}{'Next Hop':<11}Cost")
    for dest, hop, cost in routing_table(lsdb, "A"):
        shown = "INF" if cost == float("inf") else int(cost)
        print(f"{dest:<13}{hop:<11}{shown}")

    # Expected:  B C 3 | C C 2 | D C 8 | E C 10 | F C 13
`,
  },
  {
    language: "Java",
    filename: "Dijkstra.java",
    code: `// Link State Routing - Dijkstra's shortest path algorithm.
// Compile & run: javac Dijkstra.java && java Dijkstra

import java.util.*;

public class Dijkstra {

    static final int N = 6;                 // routers A..F
    static final int INF = Integer.MAX_VALUE;

    /** One entry of a router's Link State Database. */
    record Link(int to, int cost) {}

    /** Default lab network: A-B 4, A-C 2, B-C 1, B-D 5, C-D 8,
     *                       C-E 10, D-E 2, D-F 6, E-F 3 */
    static List<List<Link>> buildLsdb() {
        List<List<Link>> g = new ArrayList<>();
        for (int i = 0; i < N; i++) g.add(new ArrayList<>());
        int[][] edges = {
            {0, 1, 4}, {0, 2, 2}, {1, 2, 1},
            {1, 3, 5}, {2, 3, 8}, {2, 4, 10},
            {3, 4, 2}, {3, 5, 6}, {4, 5, 3}
        };
        for (int[] e : edges) {             // links are bidirectional
            g.get(e[0]).add(new Link(e[1], e[2]));
            g.get(e[1]).add(new Link(e[0], e[2]));
        }
        return g;
    }

    static int[] dist = new int[N];
    static int[] parent = new int[N];

    static void dijkstra(List<List<Link>> g, int src) {
        Arrays.fill(dist, INF);
        Arrays.fill(parent, -1);
        boolean[] done = new boolean[N];

        dist[src] = 0;
        // Min-heap of {distance, node}; the cheapest tentative node pops first.
        PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a -> a[0]));
        pq.add(new int[]{0, src});

        while (!pq.isEmpty()) {
            int[] top = pq.poll();
            int d = top[0], u = top[1];
            if (done[u]) continue;          // stale copy in the heap
            done[u] = true;                 // dist[u] is final

            for (Link e : g.get(u)) {
                if (done[e.to()]) continue;
                if (d + e.cost() < dist[e.to()]) {      // relax
                    dist[e.to()] = d + e.cost();
                    parent[e.to()] = u;
                    pq.add(new int[]{dist[e.to()], e.to()});
                }
            }
        }
    }

    /** The first router on the path - the only hop a router actually stores. */
    static int nextHop(int src, int dest) {
        if (dest == src || parent[dest] == -1) return -1;
        int hop = dest;
        while (parent[hop] != src) hop = parent[hop];
        return hop;
    }

    public static void main(String[] args) {
        List<List<Link>> g = buildLsdb();
        int src = 0;                        // router A
        dijkstra(g, src);

        System.out.printf("Routing table for router %c (Link State / Dijkstra)%n", 'A' + src);
        System.out.printf("%-13s%-11s%s%n", "Destination", "Next Hop", "Cost");
        for (int v = 0; v < N; v++) {
            if (v == src) continue;
            int hop = nextHop(src, v);
            System.out.printf("%-13c%-11s%s%n",
                (char) ('A' + v),
                hop == -1 ? "-" : String.valueOf((char) ('A' + hop)),
                dist[v] == INF ? "INF" : dist[v]);
        }
    }
}
`,
  },
];

/* ================================================================== *
 * Distance Vector Routing - distributed Bellman-Ford
 * ================================================================== */

export const DV_SAMPLES: CodeSample[] = [
  {
    language: "C",
    filename: "distance_vector.c",
    code: `/* Distance Vector Routing - distributed Bellman-Ford.
 *
 * Each router keeps one distance vector and periodically hands it to its
 * DIRECT NEIGHBOURS ONLY. On receiving a neighbour's vector it applies
 *
 *     D(x, y) = min over neighbours v of { c(x, v) + D(v, y) }
 *
 * Build: gcc distance_vector.c -o dv && ./dv
 */
#include <stdio.h>

#define N   6    /* routers A..F                                      */
#define INF 16   /* RIP-style infinity: 16 hops means "unreachable"    */

/* Direct link costs. INF means the two routers are not neighbours.
 * Default lab network:
 *   A-B 4, A-C 2, B-C 1, B-D 5, C-D 8, C-E 10, D-E 2, D-F 6, E-F 3 */
int cost[N][N] = {
/*          A     B     C     D     E     F   */
/* A */ {   0,    4,    2,  INF,  INF,  INF },
/* B */ {   4,    0,    1,    5,  INF,  INF },
/* C */ {   2,    1,    0,    8,   10,  INF },
/* D */ { INF,    5,    8,    0,    2,    6 },
/* E */ { INF,  INF,   10,    2,    0,    3 },
/* F */ { INF,  INF,  INF,    6,    3,    0 }
};

int dv[N][N];       /* dv[x][y]      = D(x, y), x's cost to reach y   */
int nexthop[N][N];  /* nexthop[x][y] = neighbour x forwards y through */

/* Every router starts knowing only itself and its direct neighbours. */
void initialise(void)
{
    int x, y;
    for (x = 0; x < N; x++) {
        for (y = 0; y < N; y++) {
            if (x == y) {
                dv[x][y] = 0;    nexthop[x][y] = x;
            } else if (cost[x][y] < INF) {
                dv[x][y] = cost[x][y];  nexthop[x][y] = y;
            } else {
                dv[x][y] = INF;  nexthop[x][y] = -1;
            }
        }
    }
}

/* One synchronous exchange round. Returns 1 if any entry changed.
 * Every router advertises first, so all of them recompute from the same
 * snapshot - that is what "one round" means. */
int exchange_round(void)
{
    int advertised[N][N];
    int x, y, v, changed = 0;

    for (x = 0; x < N; x++)
        for (y = 0; y < N; y++)
            advertised[x][y] = dv[x][y];

    for (x = 0; x < N; x++) {
        for (y = 0; y < N; y++) {
            int best, best_hop;
            if (x == y) continue;

            best = INF;
            best_hop = -1;
            for (v = 0; v < N; v++) {                 /* v = each neighbour */
                int alt;
                if (v == x || cost[x][v] >= INF) continue;
                alt = cost[x][v] + advertised[v][y];  /* Bellman-Ford       */
                if (alt > INF) alt = INF;             /* clamp at infinity  */
                if (alt < best) { best = alt; best_hop = v; }
            }

            if (best != dv[x][y] || best_hop != nexthop[x][y]) changed = 1;
            dv[x][y]      = best;
            nexthop[x][y] = (best >= INF) ? -1 : best_hop;
        }
    }
    return changed;
}

void print_table(int x)
{
    int y;
    printf("\\nRouting table for router %c (Distance Vector)\\n", 'A' + x);
    printf("%-12s %-10s %s\\n", "Destination", "Next Hop", "Cost");
    for (y = 0; y < N; y++) {
        if (y == x) continue;
        if (dv[x][y] >= INF) printf("%-12c %-10s %s\\n", 'A' + y, "-", "INF");
        else printf("%-12c %-10c %d\\n", 'A' + y, 'A' + nexthop[x][y], dv[x][y]);
    }
}

int main(void)
{
    int round = 0;

    initialise();
    while (exchange_round()) {         /* repeat until nothing changes */
        round++;
        printf("Round %d: vectors exchanged, tables updated.\\n", round);
        if (round > 100) break;        /* safety net */
    }
    printf("Converged after %d round(s).\\n", round);

    print_table(0);                    /* router A */
    return 0;
}

/* Expected table for A:  B C 3 | C C 2 | D C 8 | E C 10 | F C 13 */
`,
  },
  {
    language: "C++",
    filename: "distance_vector.cpp",
    code: `// Distance Vector Routing - distributed Bellman-Ford, with split horizon.
// Build: g++ -std=c++17 distance_vector.cpp -o dv && ./dv

#include <iostream>
#include <vector>
#include <iomanip>

using namespace std;

constexpr int N = 6;     // routers A..F
constexpr int INF = 16;  // RIP-style infinity

// Direct link costs; INF means "not neighbours".
// Default lab network: A-B 4, A-C 2, B-C 1, B-D 5, C-D 8,
//                      C-E 10, D-E 2, D-F 6, E-F 3
vector<vector<int>> cost = {
    {  0,   4,   2, INF, INF, INF },
    {  4,   0,   1,   5, INF, INF },
    {  2,   1,   0,   8,  10, INF },
    {INF,   5,   8,   0,   2,   6 },
    {INF, INF,  10,   2,   0,   3 },
    {INF, INF, INF,   6,   3,   0 }
};

struct Cell { int cost; int nextHop; };          // one entry of a vector

vector<vector<Cell>> table_(N, vector<Cell>(N)); // table_[x][y] = D(x,y)

// Turn split horizon on to stop a router advertising a route back to the
// neighbour it learned that route from. This is what cures count-to-infinity.
bool splitHorizon = false;

void initialise() {
    for (int x = 0; x < N; ++x)
        for (int y = 0; y < N; ++y) {
            if (x == y)                  table_[x][y] = {0, x};
            else if (cost[x][y] < INF)   table_[x][y] = {cost[x][y], y};
            else                         table_[x][y] = {INF, -1};
        }
}

// What neighbour "from" puts on the wire towards "to".
vector<int> advertise(int from, int to) {
    vector<int> adv(N);
    for (int y = 0; y < N; ++y) {
        bool learnedFromTarget = (table_[from][y].nextHop == to && y != to);
        adv[y] = (splitHorizon && learnedFromTarget) ? INF : table_[from][y].cost;
    }
    return adv;
}

// One synchronous round: everyone advertises, then everyone recomputes.
bool exchangeRound() {
    vector<vector<vector<int>>> wire(N, vector<vector<int>>(N));
    for (int x = 0; x < N; ++x)
        for (int v = 0; v < N; ++v)
            if (v != x && cost[x][v] < INF) wire[v][x] = advertise(v, x);

    auto next = table_;
    bool changed = false;

    for (int x = 0; x < N; ++x) {
        for (int y = 0; y < N; ++y) {
            if (x == y) { next[x][y] = {0, x}; continue; }
            int best = INF, bestHop = -1;
            for (int v = 0; v < N; ++v) {                  // each neighbour v
                if (v == x || cost[x][v] >= INF) continue;
                int alt = min(cost[x][v] + wire[v][x][y], INF);   // Bellman-Ford
                if (alt < best) { best = alt; bestHop = v; }
            }
            next[x][y] = {best, best >= INF ? -1 : bestHop};
            if (next[x][y].cost != table_[x][y].cost ||
                next[x][y].nextHop != table_[x][y].nextHop) changed = true;
        }
    }
    table_ = next;
    return changed;
}

void printTable(int x) {
    cout << "\\nRouting table for router " << char('A' + x) << " (Distance Vector)\\n";
    cout << left << setw(13) << "Destination" << setw(11) << "Next Hop" << "Cost\\n";
    for (int y = 0; y < N; ++y) {
        if (y == x) continue;
        cout << left << setw(13) << char('A' + y);
        if (table_[x][y].cost >= INF) cout << setw(11) << "-" << "INF\\n";
        else cout << setw(11) << char('A' + table_[x][y].nextHop) << table_[x][y].cost << "\\n";
    }
}

int main() {
    initialise();
    int round = 0;
    while (exchangeRound() && round < 100) {
        ++round;
        cout << "Round " << round << ": vectors exchanged.\\n";
    }
    cout << "Converged after " << round << " round(s).\\n";
    printTable(0);          // router A
    return 0;
}
`,
  },
  {
    language: "Python",
    filename: "distance_vector.py",
    code: `"""Distance Vector Routing - distributed Bellman-Ford.

Each router keeps one distance vector and periodically sends it to its DIRECT
NEIGHBOURS ONLY, then applies

    D(x, y) = min over neighbours v of { c(x, v) + D(v, y) }

Run: python3 distance_vector.py
"""

INF = 16    # RIP-style infinity: a cost of 16 hops means "unreachable"

ROUTERS = ["A", "B", "C", "D", "E", "F"]

# Default lab network.
EDGES = {
    ("A", "B"): 4, ("A", "C"): 2, ("B", "C"): 1,
    ("B", "D"): 5, ("C", "D"): 8, ("C", "E"): 10,
    ("D", "E"): 2, ("D", "F"): 6, ("E", "F"): 3,
}


def link_cost(a, b):
    """Cost of the direct link a-b, or INF when they are not neighbours."""
    if a == b:
        return 0
    return EDGES.get((a, b), EDGES.get((b, a), INF))


def neighbours(x):
    return [y for y in ROUTERS if y != x and link_cost(x, y) < INF]


def initialise():
    """table[x][y] = (cost, next_hop). Only direct links are known at first."""
    table = {}
    for x in ROUTERS:
        table[x] = {}
        for y in ROUTERS:
            if x == y:
                table[x][y] = (0, x)
            elif link_cost(x, y) < INF:
                table[x][y] = (link_cost(x, y), y)
            else:
                table[x][y] = (INF, None)
    return table


def advertise(table, sender, receiver, split_horizon=False, poison_reverse=False):
    """What sender puts on the wire towards receiver."""
    wire = {}
    for dest, (cost, via) in table[sender].items():
        learned_from_receiver = via == receiver and dest != receiver
        if learned_from_receiver and poison_reverse:
            wire[dest] = INF          # poison reverse: say it out loud
        elif learned_from_receiver and split_horizon:
            continue                  # split horizon: stay silent
        else:
            wire[dest] = cost
    return wire


def exchange_round(table, split_horizon=False, poison_reverse=False):
    """One synchronous round. Returns (new_table, changed_entries)."""
    # Everyone advertises first, from the same snapshot.
    wire = {
        x: {v: advertise(table, v, x, split_horizon, poison_reverse)
            for v in neighbours(x)}
        for x in ROUTERS
    }

    new = {x: dict(table[x]) for x in ROUTERS}
    changed = []

    for x in ROUTERS:
        for y in ROUTERS:
            if x == y:
                new[x][y] = (0, x)
                continue
            best, best_hop = INF, None
            for v in neighbours(x):                       # Bellman-Ford
                if y not in wire[x][v]:
                    continue                              # suppressed
                alt = min(link_cost(x, v) + wire[x][v][y], INF)
                if alt < best:
                    best, best_hop = alt, v
            entry = (best, None) if best >= INF else (best, best_hop)
            if entry != table[x][y]:
                changed.append((x, y, table[x][y], entry))
            new[x][y] = entry

    return new, changed


def converge(split_horizon=False, poison_reverse=False, max_rounds=40):
    table = initialise()
    for rnd in range(1, max_rounds + 1):
        table, changed = exchange_round(table, split_horizon, poison_reverse)
        if not changed:
            print(f"Converged after {rnd} round(s).")
            return table
        print(f"Round {rnd}: {len(changed)} entr(y/ies) updated.")
    return table


def print_table(table, x):
    print(f"\\nRouting table for router {x} (Distance Vector)")
    print(f"{'Destination':<13}{'Next Hop':<11}Cost")
    for y in ROUTERS:
        if y == x:
            continue
        cost, via = table[x][y]
        print(f"{y:<13}{(via or '-'):<11}{'INF' if cost >= INF else cost}")


if __name__ == "__main__":
    final = converge()
    print_table(final, "A")
    # Expected:  B C 3 | C C 2 | D C 8 | E C 10 | F C 13
`,
  },
  {
    language: "Java",
    filename: "DistanceVector.java",
    code: `// Distance Vector Routing - distributed Bellman-Ford.
// Compile & run: javac DistanceVector.java && java DistanceVector

import java.util.*;

public class DistanceVector {

    static final int N = 6;    // routers A..F
    static final int INF = 16; // RIP-style infinity

    /* Direct link costs; INF means "not neighbours".
     * Default lab network: A-B 4, A-C 2, B-C 1, B-D 5, C-D 8,
     *                      C-E 10, D-E 2, D-F 6, E-F 3 */
    static final int[][] cost = {
        {  0,   4,   2, INF, INF, INF },
        {  4,   0,   1,   5, INF, INF },
        {  2,   1,   0,   8,  10, INF },
        {INF,   5,   8,   0,   2,   6 },
        {INF, INF,  10,   2,   0,   3 },
        {INF, INF, INF,   6,   3,   0 }
    };

    static int[][] dv = new int[N][N];       // dv[x][y] = D(x, y)
    static int[][] nextHop = new int[N][N];  // neighbour x forwards y through

    /** Turn on to stop advertising a route back to where it was learned. */
    static boolean splitHorizon = false;

    static void initialise() {
        for (int x = 0; x < N; x++) {
            for (int y = 0; y < N; y++) {
                if (x == y)                 { dv[x][y] = 0;          nextHop[x][y] = x;  }
                else if (cost[x][y] < INF)  { dv[x][y] = cost[x][y]; nextHop[x][y] = y;  }
                else                        { dv[x][y] = INF;        nextHop[x][y] = -1; }
            }
        }
    }

    /** What router "from" puts on the wire towards neighbour "to". */
    static int[] advertise(int from, int to) {
        int[] wire = new int[N];
        for (int y = 0; y < N; y++) {
            boolean learnedFromTarget = nextHop[from][y] == to && y != to;
            wire[y] = (splitHorizon && learnedFromTarget) ? INF : dv[from][y];
        }
        return wire;
    }

    /** One synchronous round: all advertise, then all recompute. */
    static boolean exchangeRound() {
        int[][][] wire = new int[N][N][];
        for (int x = 0; x < N; x++)
            for (int v = 0; v < N; v++)
                if (v != x && cost[x][v] < INF) wire[x][v] = advertise(v, x);

        int[][] newDv = new int[N][N];
        int[][] newHop = new int[N][N];
        boolean changed = false;

        for (int x = 0; x < N; x++) {
            for (int y = 0; y < N; y++) {
                if (x == y) { newDv[x][y] = 0; newHop[x][y] = x; continue; }

                int best = INF, bestHop = -1;
                for (int v = 0; v < N; v++) {                // each neighbour v
                    if (v == x || cost[x][v] >= INF) continue;
                    int alt = Math.min(cost[x][v] + wire[x][v][y], INF);  // Bellman-Ford
                    if (alt < best) { best = alt; bestHop = v; }
                }
                newDv[x][y] = best;
                newHop[x][y] = best >= INF ? -1 : bestHop;
                if (newDv[x][y] != dv[x][y] || newHop[x][y] != nextHop[x][y]) changed = true;
            }
        }
        dv = newDv;
        nextHop = newHop;
        return changed;
    }

    static void printTable(int x) {
        System.out.printf("%nRouting table for router %c (Distance Vector)%n", 'A' + x);
        System.out.printf("%-13s%-11s%s%n", "Destination", "Next Hop", "Cost");
        for (int y = 0; y < N; y++) {
            if (y == x) continue;
            System.out.printf("%-13c%-11s%s%n",
                (char) ('A' + y),
                nextHop[x][y] == -1 ? "-" : String.valueOf((char) ('A' + nextHop[x][y])),
                dv[x][y] >= INF ? "INF" : dv[x][y]);
        }
    }

    public static void main(String[] args) {
        initialise();
        int round = 0;
        while (exchangeRound() && round < 100) {
            round++;
            System.out.println("Round " + round + ": vectors exchanged.");
        }
        System.out.println("Converged after " + round + " round(s).");
        printTable(0);     // router A
    }
}
`,
  },
];
