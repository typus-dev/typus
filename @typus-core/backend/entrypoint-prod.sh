#!/bin/bash
set -e

# LITE profile: Dependencies are installed on host via setup/init-database.sh
# Container uses pre-installed dependencies (READ-ONLY)
# This ensures portability - works with any user on any server
echo "✓ Using dependencies installed on host..."

# Execute the main command passed to the container
exec "$@"
