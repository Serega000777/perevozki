# Сборка из корня репозитория: docker build -f bot/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY bot/package.json bot/
RUN --mount=type=cache,target=/root/.npm npm ci -w bot
COPY bot bot
RUN npm run build -w bot

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
WORKDIR /app/bot
CMD ["node", "dist/index.js"]
