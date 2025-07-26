# 1. Builder stage
FROM node:18 AS builder
WORKDIR /app

# Copy package files and install all dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy prisma schema and generate client
# This leverages Docker cache. `prisma generate` only runs again if the schema changes.
COPY prisma ./prisma
RUN npx prisma generate

# Copy configuration and source code needed for the build
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src/ ./src/
RUN npm run build

# 2. Runner stage
FROM node:18-alpine AS runner
WORKDIR /app

# Copy package files and install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built application and necessary Prisma files from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma/client ./node_modules/.prisma/client
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main.js"]
