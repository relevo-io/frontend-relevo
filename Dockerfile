# ---- Stage 1: Build ----
FROM node:24-alpine AS builder
WORKDIR /app

# Instalar dependencias completas
COPY package*.json ./
RUN npm ci

# Construir aplicación
COPY . .
RUN npm run build -- --configuration=production

# ---- Stage 2: Production Run ----
FROM node:24-alpine
WORKDIR /app

# Instalar solo dependencias de producción (más ligero y seguro)
COPY package*.json ./
RUN npm ci --omit=dev

# Copiar artefactos construidos del stage anterior
COPY --from=builder /app/dist ./dist

EXPOSE 4300
ENV PORT=4300

CMD ["node", "dist/mini-spa/server/server.mjs"]
