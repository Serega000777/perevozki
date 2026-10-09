# Сборка из корня репозитория: docker build -f backend/Dockerfile .
FROM node:22-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY bot/package.json bot/
RUN --mount=type=cache,target=/root/.npm npm ci -w backend
COPY backend backend
RUN npm run db:generate -w backend && npm run build -w backend

FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
WORKDIR /app/backend
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
