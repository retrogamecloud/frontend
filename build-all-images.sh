#!/bin/bash

set -e

echo "🚀 Building all microservices Docker images locally..."
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Auth Service
echo -e "${BLUE}📦 Building auth-service...${NC}"
docker build -t retrogamecloud/auth-service:local \
  -f services/auth-service/Dockerfile \
  services/auth-service/
echo -e "${GREEN}✅ auth-service built${NC}\n"

# User Service
echo -e "${BLUE}📦 Building user-service...${NC}"
docker build -t retrogamecloud/user-service:local \
  -f services/user-service/Dockerfile \
  services/user-service/
echo -e "${GREEN}✅ user-service built${NC}\n"

# Score Service
echo -e "${BLUE}📦 Building score-service...${NC}"
docker build -t retrogamecloud/score-service:local \
  -f services/score-service/Dockerfile \
  services/score-service/
echo -e "${GREEN}✅ score-service built${NC}\n"

# Ranking Service
echo -e "${BLUE}📦 Building ranking-service...${NC}"
docker build -t retrogamecloud/ranking-service:local \
  -f services/ranking-service/Dockerfile \
  services/ranking-service/
echo -e "${GREEN}✅ ranking-service built${NC}\n"

# Game Catalog Service
echo -e "${BLUE}📦 Building game-catalog-service...${NC}"
docker build -t retrogamecloud/game-catalog-service:local \
  -f services/game-catalog-service/Dockerfile \
  services/game-catalog-service/
echo -e "${GREEN}✅ game-catalog-service built${NC}\n"

# Frontend
echo -e "${BLUE}📦 Building frontend...${NC}"
docker build -t retrogamecloud/frontend:local \
  -f frontend/Dockerfile.microservices \
  .
echo -e "${GREEN}✅ frontend built${NC}\n"

# CDN (nginx with games)
echo -e "${BLUE}📦 Building games-cdn...${NC}"
docker build -t retrogamecloud/games-cdn:local \
  -f - . << 'EOF'
FROM nginx:alpine

# Copy games
COPY juegos/*.jsdos /usr/share/nginx/html/juegos/

# Copy images
COPY frontend/img /usr/share/nginx/html/img/

# Copy nginx config
COPY infrastructure/nginx/cdn.conf /etc/nginx/conf.d/default.conf

# Health check endpoint
RUN echo 'OK' > /usr/share/nginx/html/health

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF
echo -e "${GREEN}✅ games-cdn built${NC}\n"

echo -e "${GREEN}🎉 All images built successfully!${NC}\n"

echo "📋 Built images:"
docker images | grep "retrogamecloud"

echo ""
echo "🚀 To test, run: docker-compose -f docker-compose-local.yml up"
