#!/bin/bash

# Script de despliegue completo para Minikube
# Deploya GameHub con escalado automático por juego

set -e

echo "🎮 =========================================="
echo "🎮  GameHub - Deploy en Minikube"
echo "🎮  Escalado automático por juego"
echo "🎮 =========================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para mensajes
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# 1. Verificar Minikube
info "Verificando Minikube..."
if ! minikube status &> /dev/null; then
    error "Minikube no está corriendo"
    echo "Inicia Minikube con: minikube start --memory=8192 --cpus=4"
    exit 1
fi
success "Minikube está corriendo"

# 2. Habilitar métricas para HPA
info "Habilitando metrics-server para HPA..."
minikube addons enable metrics-server
success "Metrics-server habilitado"

# 3. Crear namespace
info "Creando namespace gamehub..."
kubectl create namespace gamehub --dry-run=client -o yaml | kubectl apply -f -
success "Namespace creado/verificado"

# 4. Construir imágenes en Minikube
info "Configurando Docker para usar el daemon de Minikube..."
eval $(minikube docker-env)

info "Construyendo imágenes de servicios..."
cd ../../../

# Frontend
docker build -f frontend/Dockerfile.microservices -t gamehub-frontend:latest ./frontend
success "Imagen gamehub-frontend construida"

# Auth Service
docker build -f services/auth-service/Dockerfile -t gamehub-auth-service:latest ./services/auth-service
success "Imagen gamehub-auth-service construida"

# User Service
docker build -f services/user-service/Dockerfile -t gamehub-user-service:latest ./services/user-service
success "Imagen gamehub-user-service construida"

# Score Service
docker build -f services/score-service/Dockerfile -t gamehub-score-service:latest ./services/score-service
success "Imagen gamehub-score-service construida"

# Ranking Service
docker build -f services/ranking-service/Dockerfile -t gamehub-ranking-service:latest ./services/ranking-service
success "Imagen gamehub-ranking-service construida"

# Game Catalog Service
docker build -f services/game-catalog-service/Dockerfile -t gamehub-game-catalog-service:latest ./services/game-catalog-service
success "Imagen gamehub-game-catalog-service construida"

cd infrastructure/kubernetes/games

# 5. Desplegar bases de datos y servicios core
info "Desplegando PostgreSQL, MongoDB, Redis..."
kubectl apply -f ../namespace-and-secrets.yaml -n gamehub
success "Secrets configurados"

# 6. Desplegar microservicios
info "Desplegando microservicios..."
kubectl apply -f ../deployments/ -n gamehub
kubectl apply -f ../services/ -n gamehub
success "Microservicios desplegados"

# 7. Desplegar Kong
info "Desplegando Kong API Gateway..."
# Aquí iría la configuración de Kong para Kubernetes
warning "Kong debe ser configurado manualmente o vía Helm"

# 8. Desplegar juegos individuales
info "Desplegando pods por juego (10 juegos)..."
kubectl apply -f ./deployments/ -n gamehub
success "Deployments de juegos creados"

# 9. Desplegar HPA
info "HPAs ya están incluidos en los deployments"
success "Autoscaling configurado"

# 10. Desplegar Ingress
info "Desplegando Ingress para enrutamiento..."
kubectl apply -f ./games-ingress.yaml -n gamehub
success "Ingress configurado"

echo ""
echo "🎉 =========================================="
echo "🎉  Deploy completado exitosamente!"
echo "🎉 =========================================="
echo ""

# Mostrar status
info "Estado de pods:"
kubectl get pods -n gamehub

echo ""
info "Estado de HPA:"
kubectl get hpa -n gamehub

echo ""
info "Services:"
kubectl get svc -n gamehub

echo ""
success "Para acceder a la aplicación:"
echo "  1. Obtener IP de Minikube: minikube ip"
echo "  2. Añadir a /etc/hosts: <MINIKUBE_IP> gamehub.local"
echo "  3. Acceder a: http://gamehub.local"
echo ""
echo "Para ver logs de un pod:"
echo "  kubectl logs -f <pod-name> -n gamehub"
echo ""
echo "Para escalar manualmente un juego:"
echo "  kubectl scale deployment doom-game --replicas=5 -n gamehub"
echo ""
echo "Para ver métricas de HPA:"
echo "  kubectl get hpa -n gamehub -w"
