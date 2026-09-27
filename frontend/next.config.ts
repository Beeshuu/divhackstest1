import path from "node:path";
import type { NextConfig } from "next";

/** The Express API in /backend serves events and accounts. */
const apiOrigin = process.env.CAMPUS_API_ORIGIN ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  // Pin the app root so a repo-level lockfile cannot confuse Turbopack.
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
