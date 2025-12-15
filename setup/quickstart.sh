#!/bin/bash

# Typus LITE Quick Start Script
# Zero-configuration startup for LITE profile

set -e

echo "🚀 Typus LITE Quick Start"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check Docker Compose
if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose is not installed"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# Create .env if not exists
if [ ! -f ".env" ]; then
    if [ -f ".env.lite" ]; then
        cp .env.lite .env
        # Set PROJECT_PATH to current directory
        echo "" >> .env
        echo "# Auto-configured by quickstart.sh" >> .env
        echo "PROJECT_PATH=$(pwd)" >> .env
        echo -e "${GREEN}✓ Created .env from .env.lite${NC}"
    elif [ -f ".env.example" ]; then
        cp .env.example .env
        # Set PROJECT_PATH to current directory
        echo "" >> .env
        echo "# Auto-configured by quickstart.sh" >> .env
        echo "PROJECT_PATH=$(pwd)" >> .env
        echo -e "${YELLOW}⚠ Created .env from .env.example (please configure)${NC}"
    else
        echo "❌ No environment template found"
        exit 1
    fi
else
    # Check if PROJECT_PATH is set in existing .env
    if ! grep -q "PROJECT_PATH=" .env; then
        echo "" >> .env
        echo "# Auto-configured by quickstart.sh" >> .env
        echo "PROJECT_PATH=$(pwd)" >> .env
        echo -e "${GREEN}✓ Added PROJECT_PATH to existing .env${NC}"
    else
        echo -e "${GREEN}✓ Using existing .env${NC}"
    fi
fi

# Create required directories
mkdir -p storage/uploads storage/cache storage/logs data/prisma/schemas
echo -e "${GREEN}✓ Directories ready${NC}"

# Try to create Docker networks (ignore if exist)
docker network create traefik-net 2>/dev/null || true
docker network create common-mysql-shared 2>/dev/null || true
echo -e "${GREEN}✓ Docker networks ready${NC}"

# Export current user's UID/GID for Docker (portable across different hosts)
export HOST_UID=$(id -u)
export HOST_GID=$(id -g)
echo -e "${GREEN}✓ Detected user: UID=$HOST_UID, GID=$HOST_GID${NC}"

echo ""
echo -e "${BLUE}Starting Typus LITE...${NC}"
echo ""

# Start containers
docker compose up -d

# Wait for services
echo "Waiting for services to start..."
sleep 5

# Check if services are running
if docker compose ps | grep -q "running"; then
    echo ""
    echo "=================================="
    echo -e "${GREEN}✅ Typus LITE is running!${NC}"
    echo "=================================="
    echo ""
    echo "Frontend: http://localhost:3000"
    echo "Backend API: http://localhost:3001/api"
    echo ""
    echo "View logs: docker compose logs -f"
    echo "Stop: docker compose down"
    echo ""
else
    echo ""
    echo "⚠️  Some services may not have started correctly."
    echo "Check logs: docker compose logs"
    exit 1
fi