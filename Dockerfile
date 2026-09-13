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
ARG VITE_API_URL=/api
ARG VITE_SOCKET_URL=
ENV VITE_API_URL=$VITE_API_URL \
    VITE_SOCKET_URL=$VITE_SOCKET_URL
RUN npm run build

# Runtime stage
FROM node:18-alpine

RUN apk add --no-cache tzdata
ENV NODE_ENV=production \
    TZ=Asia/Colombo

WORKDIR /app

# Copy server
COPY server/ ./server/
COPY --from=builder /app/server/node_modules ./server/node_modules

# Copy built client
COPY --from=builder /app/client/dist ./client/dist

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
CMD node -e "require('http').get('http://127.0.0.1:5000/api/health', (res) => { if (res.statusCode !== 200) process.exit(1); }).on('error', () => process.exit(1))"

EXPOSE 5000

WORKDIR /app/server

CMD ["node", "server.js"]
