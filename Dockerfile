# Karat — image de production
FROM node:20-bookworm-slim

WORKDIR /app

# Dépendances de build pour better-sqlite3 (au cas où aucun binaire pré-compilé).
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# La base SQLite vit dans /app/data — montez un volume dessus pour la persistance.
VOLUME ["/app/data"]

CMD ["node", "server.js"]
