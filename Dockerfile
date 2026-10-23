# Этап 1: сборка фронтенда. Ставим зависимости и прогоняем `vite build`.
FROM node:22-alpine AS build
WORKDIR /app

# Сначала только манифесты — слой с node_modules кешируется, пока lock-файл не менялся.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Этап 2: лёгкий рантайм. Копируем только собранную статику, сервер и production-зависимости.
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
# NODE_ENV=production уже стоит; --omit=dev явно отсекает dev-зависимости сборки.
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY serve.mjs ./
COPY --from=build /app/dist ./dist

# Статика отдаётся на порту из PORT; фиксируем значение по умолчанию для docker run.
ENV PORT=4173
EXPOSE 4173

# node запускается как PID 1 и корректно обрабатывает SIGTERM при docker stop.
CMD ["node", "serve.mjs"]
