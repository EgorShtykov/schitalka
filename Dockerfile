FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN npm run check && npm run build
RUN ./node_modules/.bin/esbuild api/migrate.ts --platform=node --bundle --format=esm --outfile=dist/migrate.js --banner:js="import { createRequire } from 'module';const require = createRequire(import.meta.url);"

FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/db/migrations ./db/migrations

USER node
EXPOSE 3000

CMD ["sh", "-c", "node dist/migrate.js && node dist/boot.js"]
