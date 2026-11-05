import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Photos are shrunk in the browser before upload, so 5 MB is plenty.
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
