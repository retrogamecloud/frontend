# Frontend para GameHub - Modo Microservicios
FROM node:20-alpine

WORKDIR /app

# Copiar package.json
COPY package.json ./

# Instalar dependencias
RUN npm install --production

# Copiar código fuente
COPY . ./

# Usuario no-root
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 && chown -R nodejs:nodejs /app

USER nodejs

# Puerto
EXPOSE 8080

# Comando
CMD ["node", "server.js"]
