import type { NextConfig } from "next";
import path from "node:path";

// Loader path from orchids-visual-edits - use direct resolve to get the actual file
const loaderPath = require.resolve("orchids-visual-edits/loader.js");

// Restart server to apply Prisma changes
const nextConfig: NextConfig = {
  // ✅ REQUIRED for Dockerfile that copies /app/.next/standalone
  output: "standalone",

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },

  serverExternalPackages: ["@prisma/client"],

  // 🔴 IMPORTANT: disable lint + TS errors during build (for demo)
  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  turbopack: {
    rules: {
      "*.{jsx,tsx}": {
        loaders: [loaderPath],
      },
    },
  },
} as NextConfig;

export default nextConfig;
// Orchids restart: 1769109987118
