import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The live rerun reads the kept copy of one publication from disk.
  outputFileTracingIncludes: {
    "/api/rerun": ["./data/ghent/**/*"],
  },
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default nextConfig;
