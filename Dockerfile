# Mijoté — serveur du foyer (API + appli), une seule image.
# docker build -t mijote . && docker run -p 8080:8080 -v ./data:/data --env-file .env mijote

ARG NODE_IMAGE=node:22-bookworm-slim

# ——— Construction : appli (BASE_PATH=/) + serveur (un seul fichier) ———
FROM ${NODE_IMAGE} AS build
# De quoi compiler better-sqlite3 si aucun binaire précompilé n'existe pour cette architecture.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build:web:server && npm run build:server
# better-sqlite3 (module natif) est le seul paquet installé à part ; le reste est dans main.js.
RUN mkdir /out && cd /out && npm init -y >/dev/null \
  && npm install --no-audit --no-fund --omit=dev better-sqlite3@$(node -p "require('/src/node_modules/better-sqlite3/package.json').version") \
  && cp /src/apps/server/dist/main.js /out/ && cp -r /src/apps/web/dist-server /out/web \
  && printf '{"type":"module"}\n' > /out/package.json

# ——— Exécution ———
FROM ${NODE_IMAGE}
ENV NODE_ENV=production PORT=8080 DATA_DIR=/data WEB_DIR=/app/web TZ=Europe/Paris
WORKDIR /app
COPY --from=build /out /app
COPY docker/entrypoint.sh /usr/local/bin/mijote-entrypoint
RUN chmod +x /usr/local/bin/mijote-entrypoint && mkdir -p /data && chown node:node /data
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
ENTRYPOINT ["mijote-entrypoint"]
CMD ["node", "main.js"]
