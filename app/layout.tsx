import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { EXPERIMENT_NUMBER, EXPERIMENT_TITLE, INSTITUTION } from "@/lib/config";
import "./globals.css";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${EXPERIMENT_TITLE} — VLab Experiment ${EXPERIMENT_NUMBER}`,
  description:
    "Virtual Lab for Distance Vector Routing (Bellman-Ford) and Link State Routing (Dijkstra): interactive simulations of routing table construction, convergence and packet forwarding.",
  applicationName: `vlab.routing · Experiment ${EXPERIMENT_NUMBER}`,
  authors: [{ name: INSTITUTION }],
};

export const viewport: Viewport = {
  themeColor: "#050807",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${mono.variable}`}>
      <head>
        <link
          rel="preload"
          href="/fonts/satoshi-variable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
