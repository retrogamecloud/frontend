#!/bin/bash
# Script to build optimized Docker images for each game
# For production use with AWS ECR

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REGISTRY="${DOCKER_REGISTRY:-}" # Set to your ECR registry URL for production
GAMES=("doom" "wolf" "tetris" "mortalkombat" "dangerousdave2" "digger" "duke3d" "heroesofmightandmagic2" "lostvikings" "streetfighter2")
IMAGE_PREFIX="gamehub-frontend"
VERSION="${IMAGE_VERSION:-latest}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}GameHub - Building Optimized Game Images${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if running in Minikube context
if [ "$1" == "--minikube" ]; then
    echo -e "${YELLOW}Setting up Minikube Docker environment...${NC}"
    eval $(minikube docker-env)
    REGISTRY=""
    echo -e "${GREEN}✓ Using Minikube Docker daemon${NC}"
    echo ""
fi

# Function to build a single game image
build_game_image() {
    local game=$1
    local image_name="${IMAGE_PREFIX}-${game}"
    local full_image_name="${REGISTRY:+$REGISTRY/}${image_name}:${VERSION}"
    
    echo -e "${YELLOW}Building image for: ${game}${NC}"
    echo -e "Image name: ${full_image_name}"
    
    # Build the image
    docker build \
        --build-arg GAME_NAME="${game}" \
        -f frontend/Dockerfile.game \
        -t "${full_image_name}" \
        --label "game=${game}" \
        --label "version=${VERSION}" \
        . || {
            echo -e "${RED}✗ Failed to build ${game}${NC}"
            return 1
        }
    
    # Get image size
    local size=$(docker images "${full_image_name}" --format "{{.Size}}")
    echo -e "${GREEN}✓ Built ${game} successfully (${size})${NC}"
    echo ""
    
    return 0
}

# Function to push image to registry
push_image() {
    local game=$1
    local image_name="${IMAGE_PREFIX}-${game}"
    local full_image_name="${REGISTRY}/${image_name}:${VERSION}"
    
    if [ -z "$REGISTRY" ]; then
        echo -e "${YELLOW}⚠ Skipping push (no registry configured)${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}Pushing ${game} to registry...${NC}"
    docker push "${full_image_name}" || {
        echo -e "${RED}✗ Failed to push ${game}${NC}"
        return 1
    }
    
    echo -e "${GREEN}✓ Pushed ${game} successfully${NC}"
    echo ""
    
    return 0
}

# Main build loop
echo -e "${YELLOW}Starting builds for ${#GAMES[@]} games...${NC}"
echo ""

FAILED_BUILDS=()
SUCCESSFUL_BUILDS=()

for game in "${GAMES[@]}"; do
    if build_game_image "$game"; then
        SUCCESSFUL_BUILDS+=("$game")
        
        # Push if registry is configured and --push flag is set
        if [ "$2" == "--push" ] && [ -n "$REGISTRY" ]; then
            if ! push_image "$game"; then
                echo -e "${RED}✗ Failed to push ${game} but build succeeded${NC}"
            fi
        fi
    else
        FAILED_BUILDS+=("$game")
    fi
done

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Build Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Successful: ${GREEN}${#SUCCESSFUL_BUILDS[@]}${NC}"
echo -e "Failed: ${RED}${#FAILED_BUILDS[@]}${NC}"

if [ ${#FAILED_BUILDS[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}Failed builds:${NC}"
    for game in "${FAILED_BUILDS[@]}"; do
        echo -e "  - ${game}"
    done
    exit 1
fi

echo ""
echo -e "${GREEN}✓ All images built successfully!${NC}"

# Display image list
echo ""
echo -e "${YELLOW}Built images:${NC}"
for game in "${SUCCESSFUL_BUILDS[@]}"; do
    local full_image_name="${REGISTRY:+$REGISTRY/}${IMAGE_PREFIX}-${game}:${VERSION}"
    echo -e "  - ${full_image_name}"
done

echo ""
echo -e "${GREEN}Done!${NC}"
