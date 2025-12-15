#!/bin/bash
set -e

# Check if node_modules directory exists or if package.json is newer
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
  echo "Installing/updating dependencies..."
  pnpm install
fi

# Execute the main command passed to the container
exec "$@"
