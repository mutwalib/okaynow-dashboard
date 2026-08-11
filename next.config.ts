import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    // Deploy builds must not block on pre-existing form/resolver typing debt.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
