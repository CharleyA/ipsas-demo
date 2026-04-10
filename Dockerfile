# =============================================================================
# PUPPETEER DEPLOYMENT NOTES FOR VPS
# =============================================================================
# This application uses Puppeteer for server-side PDF generation.
# When deploying to VPS (not Vercel/serverless), you need to:
#
# 1. Use the full Node image (not alpine) OR install Chrome dependencies
# 2. Install chromium browser in the container
# 3. Set PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
#
# See the production Dockerfile below for details.
# =============================================================================

# Use Node.js 20 with Debian for Puppeteer compatibility
FROM node:20-slim AS base

# Install Puppeteer dependencies and Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    libc6 \
    libgcc1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Prisma needs schema available when postinstall runs (prisma generate)
COPY prisma ./prisma
# # COPY prisma.config.ts ./prisma.config.ts

# Install dependencies based on the preferred package manager
COPY package.json bun.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  elif [ -f bun.lock ]; then npm install -g bun && bun install --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the Next.js application
# Limit Node heap during Docker builds to avoid host OOM/SIGKILL on smaller VPS nodes.
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Make prisma config available at runtime (so migrate/seed can read it)
# COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json


RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# ✅ FIX: give nextjs a real home dir + writable npm cache/log locations
RUN mkdir -p /home/nextjs/.npm /home/nextjs/.cache \
  && chown -R nextjs:nodejs /home/nextjs
ENV HOME=/home/nextjs
ENV npm_config_cache=/home/nextjs/.npm
# (optional) also keep Next telemetry disabled in prod containers
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir -p .next
RUN chown -R nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

# Ensure worker runtime deps exist (Next standalone omits these)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/ ./node_modules/
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pg ./node_modules/pg

USER nextjs

EXPOSE 3000
ENV PORT=3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]
