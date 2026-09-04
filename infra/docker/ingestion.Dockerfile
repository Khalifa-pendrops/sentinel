FROM node:20-slim AS base
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY . .

RUN corepack enable && yarn install --immutable
RUN ./node_modules/.bin/prisma generate --schema=packages/db/prisma/schema.prisma
RUN ./node_modules/.bin/tsc -b apps/ingestion

EXPOSE 8080
CMD ["node", "apps/ingestion/dist/index.js"]
