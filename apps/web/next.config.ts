import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  transpilePackages: [
    "@sim/ai-sdk",
    "@sim/code-runtime",
    "@sim/domain",
    "@sim/problems",
    "@sim/problem-sdk",
    "@sim/semantic-events",
    "@sim/simulation-core",
  ],
};
export default nextConfig;
