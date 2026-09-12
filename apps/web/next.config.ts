import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // agent-core is a workspace package shipped as TypeScript source.
  transpilePackages: ["agent-core"],
  // /deck is a static site in public/deck/ — serve its index.html at the
  // bare path so the Cloudflare tunnel URL works without a trailing file.
  async rewrites() {
    return [{ source: "/deck", destination: "/deck/index.html" }];
  },
};

export default nextConfig;
