# Etapa de construcción
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependencias
RUN npm ci --omit=dev --no-fund --no-audit --loglevel=error && npm cache clean --force

# Etapa de producción
FROM node:20-alpine AS production

WORKDIR /app

# Copiar package.json
COPY package.json ./

# Copiar node_modules desde builder
COPY --from=builder /app/node_modules ./node_modules

# Copiar código fuente
COPY . ./

# Usuario sin privilegios de root
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 && chown -R nodejs:nodejs /app

USER nodejs

# Puerto
EXPOSE 8080

# Usar código refactorizado que tiene 100% de cobertura
CMD ["node", "server.wrapper.js"]
