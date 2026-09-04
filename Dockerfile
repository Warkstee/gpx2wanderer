# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root package files and install dependencies (cached unless package.json changes)
COPY package*.json ./
RUN npm ci

# Copy UI package files and install dependencies (cached unless package.json changes)
COPY src/ui/package*.json ./src/ui/
WORKDIR /app/src/ui
RUN npm ci

# Copy source code (changes here don't invalidate npm ci cache)
WORKDIR /app
COPY . .

# Build backend TypeScript
RUN npm run build:backend

# Build UI
WORKDIR /app/src/ui
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --production

# Copy built backend
COPY --from=builder /app/dist ./dist

# Copy built UI
COPY --from=builder /app/src/ui/build ./src/ui/build

# Expose port
EXPOSE 6721

# Start API server (which also serves the UI)
CMD ["node", "dist/server/index.js"]
