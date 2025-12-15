#!/bin/bash

# This script cleans the project's pnpm dependencies and potentially related caches.
# It deletes node_modules, pnpm-lock.yaml, and then reinstalls dependencies using pnpm.
# Useful for resolving dependency graph issues or stale cache problems.

# Exit immediately if a command exits with a non-zero status.
set -e

echo "🛑 IMPORTANT: Please ensure you have MANUALLY stopped the Vite dev server (or any other running process using these files) before proceeding."
# Optional: Add a pause to give the user time to confirm
# read -p "Press Enter to continue after stopping the server..."

echo "🧹 Deleting node_modules directory..."
# Use `rm -rf` which forcefully (-f) and recursively (-r) removes the directory.
rm -rf node_modules
echo "✅ node_modules deleted."

echo "🧹 Deleting pnpm-lock.yaml file..."
# Use `rm -f` to forcefully remove the file and ignore errors if it doesn't exist.
rm -f pnpm-lock.yaml
echo "✅ pnpm-lock.yaml deleted."

# Note: The Vite cache (usually node_modules/.vite) is inherently removed
# when deleting the entire node_modules directory. Explicit deletion isn't needed here.
# If you suspect pnpm's global cache is an issue (less common for project-specific problems),
# you might consider `pnpm store prune` separately, but usually the steps above are sufficient.

echo "🚀 Running pnpm install to fetch and link dependencies..."
# pnpm install will read package.json and recreate node_modules and pnpm-lock.yaml
pnpm install
echo "✅ Dependencies reinstalled successfully using pnpm."

echo "🎉 Clean install process finished!"