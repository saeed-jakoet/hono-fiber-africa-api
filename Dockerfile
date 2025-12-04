# Dockerfile for Hono Fiber Africa API (Bun runtime)

FROM oven/bun:1 as base
WORKDIR /app

# Install dependencies
FROM base AS install
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile --production

# Copy source and build
FROM base AS release
COPY --from=install /app/node_modules ./node_modules
COPY . .

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Run the app
CMD ["bun", "run", "src/index.ts"]
