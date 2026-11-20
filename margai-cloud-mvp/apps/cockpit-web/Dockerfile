# Multi-stage Dockerfile for MargAI Cockpit Web on Google Cloud Run
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY packages/contracts ./packages/contracts
COPY apps/cockpit-web ./apps/cockpit-web

RUN npm install
RUN npm run build -w packages/contracts
RUN npm run build -w apps/cockpit-web

# Production Nginx Web Server
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/cockpit-web/dist /usr/share/nginx/html

# Custom Nginx configuration for SPA routing & Cloud Run PORT
RUN echo 'server {' > /etc/nginx/conf.d/default.conf && \
    echo '  listen 8080;' >> /etc/nginx/conf.d/default.conf && \
    echo '  location / {' >> /etc/nginx/conf.d/default.conf && \
    echo '    root /usr/share/nginx/html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    index index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    try_files $uri $uri/ /index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '  }' >> /etc/nginx/conf.d/default.conf && \
    echo '}' >> /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
