#!/bin/bash

# Build script for lite-single Docker image with proper error handling
# Location: /server/sites/typus-lite/dev.typus.dev/docker/build-lite-single.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOCKERFILE="$SCRIPT_DIR/Dockerfile.lite-single"
IMAGE_NAME="typus-lite-single"
IMAGE_TAG="${1:-latest}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Typus Lite Single Container Build${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Verify Prisma client is generated
echo -e "${YELLOW}[1/5]${NC} Checking Prisma client..."
if [ ! -f "$PROJECT_ROOT/data/prisma/generated/client/index.d.ts" ]; then
    echo -e "${RED}ERROR:${NC} Prisma client not found!"
    echo "Please generate it first:"
    echo "  cd $PROJECT_ROOT"
    echo "  pnpm --filter @typus-core/shared run dsl:generate-all"
    exit 1
fi
echo -e "${GREEN}✓${NC} Prisma client found"
echo ""

# Step 2: Check for case sensitivity issues
echo -e "${YELLOW}[2/5]${NC} Checking for case sensitivity issues..."
FRONTEND_DIR="$PROJECT_ROOT/@typus-core/frontend"
if [ -d "$FRONTEND_DIR" ]; then
    # Check for dxContainer component
    CONTAINER_FILE=$(find "$FRONTEND_DIR/src/components" -iname "dxcontainer.vue" 2>/dev/null || true)
    if [ -n "$CONTAINER_FILE" ]; then
        echo -e "${GREEN}✓${NC} Found component: $CONTAINER_FILE"
    fi
fi
echo ""

# Step 3: Verify required files exist
echo -e "${YELLOW}[3/5]${NC} Verifying required files..."
REQUIRED_FILES=(
    "$PROJECT_ROOT/pnpm-workspace.yaml"
    "$PROJECT_ROOT/pnpm-lock.yaml"
    "$PROJECT_ROOT/tsconfig.json"
    "$PROJECT_ROOT/@typus-core/backend/package.json"
    "$PROJECT_ROOT/@typus-core/frontend/package.json"
    "$PROJECT_ROOT/@typus-core/shared/package.json"
    "$DOCKERFILE"
    "$SCRIPT_DIR/tsconfig.backend.docker.json"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}ERROR:${NC} Required file not found: $file"
        exit 1
    fi
done
echo -e "${GREEN}✓${NC} All required files present"
echo ""

# Step 4: Build Docker image
echo -e "${YELLOW}[4/5]${NC} Building Docker image..."
echo "Command: docker build -f $DOCKERFILE -t $IMAGE_NAME:$IMAGE_TAG $PROJECT_ROOT"
echo ""

cd "$PROJECT_ROOT"
docker build \
    --progress=plain \
    --no-cache \
    -f "$DOCKERFILE" \
    -t "$IMAGE_NAME:$IMAGE_TAG" \
    .

BUILD_STATUS=$?
echo ""

if [ $BUILD_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Docker image built successfully!"
    echo ""

    # Step 5: Show image info
    echo -e "${YELLOW}[5/5]${NC} Image information:"
    docker images "$IMAGE_NAME:$IMAGE_TAG"
    echo ""

    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Build completed successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "To run the container:"
    echo "  docker run -d --name typus-lite -p 80:80 $IMAGE_NAME:$IMAGE_TAG"
    echo ""
    echo "To inspect the built image:"
    echo "  docker run --rm -it $IMAGE_NAME:$IMAGE_TAG /bin/sh"
    echo ""
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}Build failed!${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "To debug:"
    echo "  1. Check the build logs above for specific errors"
    echo "  2. Try building individual stages:"
    echo "     docker build --target frontend-builder -f $DOCKERFILE -t test-frontend ."
    echo "     docker build --target backend-builder -f $DOCKERFILE -t test-backend ."
    echo ""
    exit 1
fi
