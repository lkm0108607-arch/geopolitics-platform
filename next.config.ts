import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/issues",
        destination: "/factors",
        permanent: false,
      },
      {
        source: "/scenarios",
        destination: "/assets",
        permanent: false,
      },
      {
        source: "/briefing",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
