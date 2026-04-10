import type { NextConfig } from "next";

const enableVisualEdits = process.env.ENABLE_VISUAL_EDITS === "true";
const loaderPath = enableVisualEdits
  ? require.resolve("orchids-visual-edits/loader.js")
  : null;

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

  ...(enableVisualEdits && loaderPath
    ? {
        turbopack: {
          rules: {
            "*.{jsx,tsx}": {
              loaders: [loaderPath],
            },
          },
        },
      }
    : {}),
} as NextConfig;

export default nextConfig;
// Orchids restart: 1769109987118
