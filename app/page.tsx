import { Aim } from "@/components/site/Aim";
import { Conclusion } from "@/components/site/Conclusion";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/site/Hero";
import { Navbar } from "@/components/site/Navbar";
import { PhaseBand } from "@/components/site/PhaseBand";
import { ProtocolCarousel } from "@/components/site/ProtocolCarousel";
import { ScrollStory } from "@/components/site/ScrollStory";
import { Simulations } from "@/components/site/Simulations";
import { TwoWays } from "@/components/site/TwoWays";
import { POST_TEST, PRE_TEST } from "@/data/quiz";
import { highlightSamples } from "@/lib/highlight";

export default async function Home() {
  // Shiki runs here, at build time, so it never reaches the client bundle.
  const codeHtml = await highlightSamples();

  return (
    <>
      <div id="top" />
      <Navbar />
      <main>
        <Hero />
        <Aim />
        <ScrollStory codeHtml={codeHtml} />
        <TwoWays />
        <ProtocolCarousel />

        <PhaseBand
          id="pre-test"
          eyebrow="Phase 1 · Baseline assessment"
          top="Check what you know."
          bottom="Before the lab."
          description="Ten questions on the foundations: routing against forwarding, what a routing table holds, what a metric measures, static against dynamic routing, and which real protocols belong to which algorithm family."
          buttonLabel="Take the pre-test"
          questions={PRE_TEST}
          topics={[
            "Routing versus forwarding — control plane against data plane",
            "Routing table structure: Destination, Next Hop, Cost",
            "Metrics: hop count, bandwidth-derived cost",
            "Static versus dynamic routing",
            "Which protocols are Distance Vector and which are Link State",
          ]}
        />

        <Simulations />

        <PhaseBand
          id="post-test"
          eyebrow="Phase 2 · Verification assessment"
          top="Now apply it."
          bottom="After the lab."
          description="Ten harder questions: compute a Dijkstra result on a graph given in the question, work through a single Bellman-Ford update step, reason about count-to-infinity and the fixes for it, and compare OSPF against RIP on convergence and metric."
          buttonLabel="Take the post-test"
          questions={POST_TEST}
          topics={[
            "Running Dijkstra on a graph shown in the question",
            "One Bellman-Ford update step, by hand",
            "Count-to-infinity, split horizon and poison reverse",
            "OSPF against RIP: metric, scope and update behaviour",
            "Convergence: why link state settles faster than distance vector",
          ]}
        />

        <Conclusion />
      </main>
      <Footer />
    </>
  );
}
