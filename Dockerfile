FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi

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

EXPOSE 3000

# Start as root to prepare the mounted volume (Railway mounts /data owned by root),
# then drop privileges to the node user before running the app.
CMD ["sh", "-c", "mkdir -p \"${UPLOAD_DIR:-/tmp/schitalka-uploads}\" && chown -R node:node /data 2>/dev/null || true; exec su -s /bin/sh node -c 'node dist/migrate.js && node dist/boot.js'"]
