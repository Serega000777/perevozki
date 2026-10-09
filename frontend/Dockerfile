# Сборка из корня репозитория: docker build -f frontend/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY bot/package.json bot/
RUN --mount=type=cache,target=/root/.npm npm ci -w frontend
COPY frontend frontend
ARG API_URL=/api
ENV API_URL=$API_URL
RUN npm run build -w frontend

FROM nginx:alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
