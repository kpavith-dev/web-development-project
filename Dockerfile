# Build stage
FROM node:18-alpine AS builder

WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --only=production

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci

# Build client
COPY client/ .
RUN npm run build

# Runtime stage
FROM node:18-alpine

WORKDIR /app

# Copy server
COPY server/ ./server/
COPY --from=builder /app/server/node_modules ./server/node_modules

# Copy built client
COPY --from=builder /app/client/dist ./client/dist

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 5000

WORKDIR /app/server

CMD ["node", "server.js"]
