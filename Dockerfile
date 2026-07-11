# Stage 1: Build Next.js frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Build final image
FROM python:3.11-slim

# Install Node.js for Next.js runtime + nginx for reverse proxy
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend
COPY backend/ /app/backend/

# Copy built frontend
COPY --from=frontend-builder /app/frontend/.next/standalone/ /app/frontend/
COPY --from=frontend-builder /app/frontend/.next/static/ /app/frontend/.next/static/
COPY --from=frontend-builder /app/frontend/public/ /app/frontend/public/

# Create data directory for SQLite
RUN mkdir -p /data

# Nginx config
RUN rm /etc/nginx/sites-enabled/default
COPY deploy/nginx.conf /etc/nginx/sites-enabled/route53

# Supervisor config
COPY deploy/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Environment
ENV PORT=8000
ENV NEXT_PUBLIC_API_URL=/api
ENV DATABASE_URL=sqlite:////data/route53.db
ENV CORS_ORIGINS=http://localhost

EXPOSE 80

CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
