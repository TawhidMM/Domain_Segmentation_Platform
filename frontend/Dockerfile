# -----------------------------
# 1. Build stage
# -----------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy rest of the code
COPY . .

# Build the app (Vite outputs to /dist)
RUN npm run build


# -----------------------------
# 2. Production stage (nginx)
# -----------------------------
FROM nginx:alpine

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]