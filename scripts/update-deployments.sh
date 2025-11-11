#!/bin/bash
# Script to update all game deployments with specific images
# This updates the image name from gamehub-frontend-full to gamehub-frontend-{game}

set -e

GAMES=("wolf" "tetris" "mortalkombat" "dangerousdave2" "digger" "duke3d" "heroesofmightandmagic2" "lostvikings" "streetfighter2")
DEPLOYMENTS_DIR="infrastructure/kubernetes/games/deployments"

echo "Updating game deployments to use specific images..."
echo ""

for game in "${GAMES[@]}"; do
    file="${DEPLOYMENTS_DIR}/${game}-game.yaml"
    
    if [ ! -f "$file" ]; then
        echo "⚠ File not found: $file (skipping)"
        continue
    fi
    
    echo "Updating $game-game.yaml..."
    
    # Replace image name
    sed -i "s|image: gamehub-frontend.*:latest|image: gamehub-frontend-${game}:latest|g" "$file"
    
    # Replace env variable name from game-specific to GAME_NAME
    sed -i "s|- name: ${game}|- name: GAME_NAME|g" "$file"
    sed -i "s|value: \"${game}\"|value: \"${game}\"|g" "$file"
    
    echo "✓ Updated $game"
done

echo ""
echo "✓ All deployments updated successfully!"
echo ""
echo "Next steps:"
echo "1. Build images: ./scripts/build-game-images.sh --minikube"
echo "2. Apply deployments: kubectl apply -f infrastructure/kubernetes/games/deployments/"
echo "3. Verify: kubectl get pods -n gamehub"
