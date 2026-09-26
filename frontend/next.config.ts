import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repository root also has a lockfile, so pin the workspace explicitly.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // The floating dev badge sits on top of the map controls during visual review.
  devIndicators: false,
};

export default nextConfig;
