import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typedRoutes: true,
  async redirects() {
    return [
      {
        destination: "/analytics",
        permanent: false,
        source: "/report",
      },
      {
        destination: "/budget",
        permanent: false,
        source: "/plan",
      },
      {
        destination: "/transaction/new",
        permanent: false,
        source: "/transactions/new",
      },
      {
        destination: "/transaction/:transactionId/edit",
        permanent: false,
        source: "/transactions/:transactionId/edit",
      },
    ];
  },
};

export default nextConfig;
