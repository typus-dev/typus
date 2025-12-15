#!/bin/bash
# Rebuild frontend after plugin installation
# Run inside container: docker exec <container> /app/rebuild-frontend.sh

set -e

echo "🔧 Rebuilding frontend with plugins..."

cd /app/@typus-core/frontend

# Generate menus (scans plugins/)
echo "📝 Generating menus..."
pnpm run generate:menus

# Generate routes
echo "📝 Generating routes..."
pnpm run generate:routes

# Build frontend
echo "🏗️ Building frontend..."
NODE_ENV=production pnpm run build

echo "✅ Frontend rebuilt successfully!"
echo "💡 Restart the container or wait for nginx to pick up changes"
