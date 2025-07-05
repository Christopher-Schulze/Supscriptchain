import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [{
      source: '/:path*',
      destination: '/index.html',
    }];
  },
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
