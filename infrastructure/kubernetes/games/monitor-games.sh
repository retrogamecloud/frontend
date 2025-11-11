#!/bin/bash

# Script de monitoreo en tiempo real del escalado de juegos
# Muestra pods, réplicas, CPU, memoria y métricas de HPA

set -e

NAMESPACE="gamehub"

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

clear

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     🎮 GameHub - Monitor de Escalado por Juego 🎮        ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Función para mostrar tabla
show_game_status() {
    echo -e "${BLUE}┌────────────────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${BLUE}│  Juego                        │ Pods  │ CPU %  │ Mem %  │ Min/Max │ Status │${NC}"
    echo -e "${BLUE}├────────────────────────────────────────────────────────────────────────────┤${NC}"
    
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
    
    for game in "${GAMES[@]}"; do
        DEPLOYMENT="${game}-game"
        
        # Obtener número de réplicas
        REPLICAS=$(kubectl get deployment $DEPLOYMENT -n $NAMESPACE -o jsonpath='{.status.replicas}' 2>/dev/null || echo "0")
        READY=$(kubectl get deployment $DEPLOYMENT -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        
        # Obtener métricas de HPA
        HPA_INFO=$(kubectl get hpa ${DEPLOYMENT}-hpa -n $NAMESPACE -o jsonpath='{.status.currentMetrics[0].resource.current.averageUtilization},{.status.currentMetrics[1].resource.current.averageUtilization},{.spec.minReplicas},{.spec.maxReplicas}' 2>/dev/null || echo "0,0,1,10")
        
        IFS=',' read -r CPU_PERCENT MEM_PERCENT MIN_REPLICAS MAX_REPLICAS <<< "$HPA_INFO"
        
        # Color según CPU
        if [ "$CPU_PERCENT" -gt 80 ]; then
            CPU_COLOR=$RED
        elif [ "$CPU_PERCENT" -gt 60 ]; then
            CPU_COLOR=$YELLOW
        else
            CPU_COLOR=$GREEN
        fi
        
        # Color según memoria
        if [ "$MEM_PERCENT" -gt 80 ]; then
            MEM_COLOR=$RED
        elif [ "$MEM_PERCENT" -gt 60 ]; then
            MEM_COLOR=$YELLOW
        else
            MEM_COLOR=$GREEN
        fi
        
        # Status
        if [ "$READY" = "$REPLICAS" ] && [ "$REPLICAS" != "0" ]; then
            STATUS="${GREEN}Ready${NC}"
        elif [ "$REPLICAS" = "0" ]; then
            STATUS="${RED}Down${NC}"
        else
            STATUS="${YELLOW}Starting${NC}"
        fi
        
        printf "${BLUE}│${NC} %-30s ${BLUE}│${NC} %2s/%2s ${BLUE}│${NC} ${CPU_COLOR}%5s%%${NC} ${BLUE}│${NC} ${MEM_COLOR}%5s%%${NC} ${BLUE}│${NC} %3s/%-3s ${BLUE}│${NC} %s    ${BLUE}│${NC}\n" \
            "$game" "$READY" "$REPLICAS" "$CPU_PERCENT" "$MEM_PERCENT" "$MIN_REPLICAS" "$MAX_REPLICAS" "$STATUS"
    done
    
    echo -e "${BLUE}└────────────────────────────────────────────────────────────────────────────┘${NC}"
}

# Función para mostrar resumen
show_summary() {
    echo ""
    echo -e "${CYAN}📊 Resumen del Cluster:${NC}"
    
    TOTAL_PODS=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running -l tier=frontend 2>/dev/null | wc -l)
    TOTAL_DEPLOYMENTS=$(kubectl get deployments -n $NAMESPACE -l tier=frontend 2>/dev/null | tail -n +2 | wc -l)
    
    echo -e "  Total de deployments de juegos: ${GREEN}$TOTAL_DEPLOYMENTS${NC}"
    echo -e "  Total de pods corriendo:        ${GREEN}$TOTAL_PODS${NC}"
    
    # Nodos de Minikube
    NODES=$(kubectl get nodes --no-headers 2>/dev/null | wc -l)
    echo -e "  Nodos disponibles:              ${GREEN}$NODES${NC}"
}

# Función para mostrar eventos recientes
show_events() {
    echo ""
    echo -e "${CYAN}📰 Eventos recientes de escalado:${NC}"
    kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | grep -i "scaled\|HorizontalPodAutoscaler" | tail -5
}

# Loop principal
while true; do
    clear
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║     🎮 GameHub - Monitor de Escalado por Juego 🎮        ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Actualizado: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo ""
    
    show_game_status
    show_summary
    show_events
    
    echo ""
    echo -e "${BLUE}Presiona Ctrl+C para salir. Actualizando cada 5 segundos...${NC}"
    
    sleep 5
done
