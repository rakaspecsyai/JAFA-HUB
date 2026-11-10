# syntax=docker/dockerfile:1
FROM postgres:17-bookworm AS database
COPY --chmod=755 deploy/postgres-init.sh /docker-entrypoint-initdb.d/10-jafa.sh

FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS build
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --include=dev
COPY . .
ENV NODE_ENV=production JAFA_LOCAL_DATABASE=false JAFA_CONTENT_PREVIEW=false \
    DATABASE_URL=postgresql://unused@127.0.0.1:1/build_check
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production JAFA_LOCAL_DATABASE=false JAFA_CONTENT_PREVIEW=false \
    MEDIA_DIRECTORY=/var/lib/jafa/media
# Prisma dan tsx tetap diperlukan oleh perintah migrasi dan administrasi yang sudah ada.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/src ./src
COPY --from=build --chown=node:node /app/scripts ./scripts
COPY --from=build --chown=node:node /app/data ./data
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json /app/prisma.config.ts /app/tsconfig.json /app/next.config.ts ./
RUN mkdir -p /var/lib/jafa/media && chown node:node /var/lib/jafa/media
USER node
EXPOSE 3000
ENTRYPOINT ["node", "scripts/production.mjs"]
CMD ["start"]
