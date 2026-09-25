import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the project root so Turbopack does not walk up looking for a lockfile.
  turbopack: { root: path.resolve(".") },
};

export default nextConfig;
