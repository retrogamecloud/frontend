#!/bin/bash

# Script para generar deployments individuales por juego
# Uso: ./generate-game-deployments.sh

set -e

# Lista de juegos
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

# Directorio de salida
OUTPUT_DIR="$(dirname "$0")/deployments"
mkdir -p "$OUTPUT_DIR"

# Template
TEMPLATE_FILE="$(dirname "$0")/game-deployment-template.yaml"

if [ ! -f "$TEMPLATE_FILE" ]; then
  echo "❌ No se encontró el template: $TEMPLATE_FILE"
  exit 1
fi

echo "🎮 Generando deployments para ${#GAMES[@]} juegos..."
echo ""

# Generar deployment para cada juego
for game in "${GAMES[@]}"; do
  OUTPUT_FILE="$OUTPUT_DIR/${game}-game.yaml"
  
  # Reemplazar GAME_NAME en el template
  sed "s/GAME_NAME/${game}/g" "$TEMPLATE_FILE" > "$OUTPUT_FILE"
  
  echo "✅ Generado: ${game}-game.yaml"
done

echo ""
echo "🎯 Deployments generados en: $OUTPUT_DIR"
echo "📊 Total: ${#GAMES[@]} juegos"
echo ""
echo "Para desplegar en Minikube:"
echo "  kubectl apply -f $OUTPUT_DIR/"
