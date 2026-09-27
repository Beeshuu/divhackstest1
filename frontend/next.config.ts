import path from "node:path";
import type { NextConfig } from "next";

/** The Express API in the repository root serves events and accounts. */
const apiOrigin = process.env.CAMPUS_API_ORIGIN ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  // The repository root also has a lockfile, so pin the workspace explicitly.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // The floating dev badge sits on top of the map controls during visual review.
  devIndicators: false,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }];
  },
};

export default nextConfig;
