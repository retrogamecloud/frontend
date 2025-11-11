#!/bin/bash

# Script para simular carga en juegos específicos
# Útil para probar el autoscaling de HPA

set -e

NAMESPACE="gamehub"
DURATION=${2:-60}  # Duración en segundos (default: 60)

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

usage() {
    echo "Uso: $0 <juego> [duración_en_segundos]"
    echo ""
    echo "Juegos disponibles:"
    echo "  doom, wolf, dangerousdave2, digger, dukenukem3d,"
    echo "  heroesofmightandmagic2, lostvikings, mortalkombat,"
    echo "  streetfighter2, tetris, all"
    echo ""
    echo "Ejemplos:"
    echo "  $0 doom 120          # Generar carga en DOOM por 2 minutos"
    echo "  $0 all 300           # Generar carga en todos los juegos por 5 minutos"
    exit 1
}

if [ -z "$1" ]; then
    usage
fi

GAME=$1

# Función para generar carga en un juego
generate_load() {
    local game=$1
    local pod_name="${game}-game"
    
    echo -e "${BLUE}🔥 Generando carga en ${game}...${NC}"
    
    # Obtener el primer pod del deployment
    POD=$(kubectl get pods -n $NAMESPACE -l app=${pod_name} -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    
    if [ -z "$POD" ]; then
        echo -e "${RED}❌ No se encontró pod para ${game}${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Pod encontrado: ${POD}${NC}"
    
    # Ejecutar comando de stress en el pod
    echo -e "${YELLOW}⏳ Generando carga de CPU por ${DURATION} segundos...${NC}"
    
    kubectl exec -n $NAMESPACE $POD -- sh -c "
        # Instalar stress-ng si no existe
        if ! command -v stress-ng &> /dev/null; then
            apk add --no-cache stress-ng 2>/dev/null || apt-get update && apt-get install -y stress-ng 2>/dev/null || true
        fi
        
        # Generar carga de CPU y memoria
        stress-ng --cpu 2 --vm 1 --vm-bytes 256M --timeout ${DURATION}s &
        
        # Simular requests HTTP
        for i in \$(seq 1 100); do
            wget -q -O /dev/null http://localhost:8081/health 2>/dev/null || true
            sleep 0.5
        done
    " &
    
    echo -e "${GREEN}✅ Carga generada en ${game}${NC}"
}

# Función para monitorear el escalado
monitor_scaling() {
    local game=$1
    local deployment="${game}-game"
    
    echo ""
    echo -e "${CYAN}📊 Monitoreando escalado de ${game}...${NC}"
    echo -e "${CYAN}Presiona Ctrl+C para detener el monitoreo${NC}"
    echo ""
    
    for i in $(seq 1 20); do
        REPLICAS=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.status.replicas}' 2>/dev/null || echo "0")
        READY=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        
        HPA_CPU=$(kubectl get hpa ${deployment}-hpa -n $NAMESPACE -o jsonpath='{.status.currentMetrics[0].resource.current.averageUtilization}' 2>/dev/null || echo "0")
        HPA_MEM=$(kubectl get hpa ${deployment}-hpa -n $NAMESPACE -o jsonpath='{.status.currentMetrics[1].resource.current.averageUtilization}' 2>/dev/null || echo "0")
        
        echo -e "[$(date '+%H:%M:%S')] Pods: ${GREEN}${READY}/${REPLICAS}${NC} | CPU: ${YELLOW}${HPA_CPU}%${NC} | Mem: ${YELLOW}${HPA_MEM}%${NC}"
        
        sleep 5
    done
}

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     🎮 GameHub - Generador de Carga para Pruebas 🎮      ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$GAME" = "all" ]; then
    # Generar carga en todos los juegos
    GAMES=(
        "doom"
        "wolf"
        "dangerousdave2"
        "digger"
        "dukenukem3d"
        "heroesofmightandmagic2"
        "lostvikings"
        "mortalkombat"
        "streetfighter2"
        "tetris"
    )
    
    echo -e "${YELLOW}⚡ Generando carga en TODOS los juegos por ${DURATION} segundos${NC}"
    echo ""
    
    for game in "${GAMES[@]}"; do
        generate_load $game &
        sleep 2
    done
    
    echo ""
    echo -e "${GREEN}✅ Carga generada en todos los juegos${NC}"
    echo -e "${CYAN}Usa ./monitor-games.sh para ver el escalado en tiempo real${NC}"
    
else
    # Generar carga en un juego específico
    generate_load $GAME
    monitor_scaling $GAME
fi

echo ""
echo -e "${GREEN}🎉 Generación de carga completada${NC}"
echo ""
echo "Para ver el estado actual de los HPAs:"
echo "  kubectl get hpa -n gamehub"
echo ""
echo "Para ver los pods escalados:"
echo "  kubectl get pods -n gamehub -l tier=frontend"
