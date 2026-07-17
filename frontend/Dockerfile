# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files (if any) and frontend package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies for root and frontend
RUN npm ci

# Copy frontend source code
COPY frontend/ ./frontend/

# Build the app (ensuring we're in the right directory)
WORKDIR /app/frontend
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Copy built assets from the correct location
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]