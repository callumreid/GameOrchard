import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "export", // Disabled for development to allow API routes
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  assetPrefix: "./",
  async headers() {
    return [
      {
        // Apply CORS headers to all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
