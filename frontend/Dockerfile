# Stage 1: Build - Use Node 22 (LTS) which Vite requires
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./
COPY frontend/vite.config.js ./
COPY package*.json ./

# Install dependencies - clean install
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Copy source code
COPY frontend/ ./

# Build the app
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Install wget for healthcheck
RUN apk add --no-cache wget

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration if it exists, otherwise use default
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
