# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --no-audit --no-fund
COPY frontend/ ./
ARG NEXT_PUBLIC_SITE_URL=
ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_WS_URL=
ARG NEXT_PUBLIC_PLAUSIBLE_DOMAIN=
ARG NEXT_PUBLIC_PLAUSIBLE_HOST=
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL} \
    NEXT_PUBLIC_PLAUSIBLE_DOMAIN=${NEXT_PUBLIC_PLAUSIBLE_DOMAIN} \
    NEXT_PUBLIC_PLAUSIBLE_HOST=${NEXT_PUBLIC_PLAUSIBLE_HOST} NEXT_TELEMETRY_DISABLED=1
RUN npm run build:next

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3001 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app/frontend/next/.next/standalone ./
COPY --from=build --chown=node:node /app/frontend/next/.next/static ./next/.next/static
COPY --from=build --chown=node:node /app/frontend/public ./next/public
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:3001/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "next/server.js"]
