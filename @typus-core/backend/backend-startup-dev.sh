#!/bin/bash
echo "🚀 Starting backend service..."

# App root is always /app in Docker
APP_ROOT="/app"

# Plugin module resolution - symlink all backend node_modules content to plugins
mkdir -p /app/plugins/node_modules
# Symlink all packages from backend node_modules
for pkg in /app/@typus-core/backend/node_modules/*; do
  name=$(basename "$pkg")
  [ ! -e "/app/plugins/node_modules/$name" ] && ln -sf "$pkg" "/app/plugins/node_modules/$name"
done
# Symlink @typus-core packages
mkdir -p /app/plugins/node_modules/@typus-core
ln -sf /app/@typus-core/shared /app/plugins/node_modules/@typus-core/shared
ln -sf /app/@typus-core/backend /app/plugins/node_modules/@typus-core/backend

PRISMA_CLIENT_DIR="${APP_ROOT}/data/prisma/generated/client"
PRISMA_OUTPUT_FILE="${PRISMA_CLIENT_DIR}/index.js"

# =============================================================================
# Generate DATABASE_URL from DB_PROVIDER and individual credentials
# This eliminates the need for CLI to generate DATABASE_URL
# =============================================================================
echo "🔧 Generating DATABASE_URL from environment variables..."

DB_PROVIDER="${DB_PROVIDER:-mysql}"

if [ "$DB_PROVIDER" = "sqlite" ]; then
  # SQLite: file-based database
  DB_FILE="${DB_NAME:-./data/database.sqlite}"

  # Convert relative path to absolute (Prisma needs absolute path for SQLite)
  if [[ "${DB_FILE}" != /* ]]; then
    DB_FILE="${APP_ROOT}/${DB_FILE}"
  fi

  export DATABASE_URL="file:${DB_FILE}"
  echo "  ✅ SQLite: ${DATABASE_URL}"

elif [ "$DB_PROVIDER" = "mysql" ]; then
  # MySQL: connection string from individual variables
  DB_HOST="${DB_HOST:-localhost}"
  DB_PORT="${DB_PORT:-3306}"
  DB_USER="${DB_USER:-root}"
  DB_PASSWORD="${DB_PASSWORD:-}"
  DB_NAME="${DB_NAME:-typus_db}"
  export DATABASE_URL="mysql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?charset=utf8mb4"
  echo "  ✅ MySQL: mysql://${DB_USER}:***@${DB_HOST}:${DB_PORT}/${DB_NAME}?charset=utf8mb4"

elif [ "$DB_PROVIDER" = "postgresql" ] || [ "$DB_PROVIDER" = "postgres" ]; then
  # PostgreSQL: connection string
  DB_HOST="${DB_HOST:-localhost}"
  DB_PORT="${DB_PORT:-5432}"
  DB_USER="${DB_USER:-postgres}"
  DB_PASSWORD="${DB_PASSWORD:-}"
  DB_NAME="${DB_NAME:-typus_db}"
  export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
  echo "  ✅ PostgreSQL: postgresql://${DB_USER}:***@${DB_HOST}:${DB_PORT}/${DB_NAME}"

else
  echo "  ⚠️  Unknown DB_PROVIDER: ${DB_PROVIDER}, defaulting to MySQL format"
  DB_HOST="${DB_HOST:-localhost}"
  DB_PORT="${DB_PORT:-3306}"
  DB_USER="${DB_USER:-root}"
  DB_PASSWORD="${DB_PASSWORD:-}"
  DB_NAME="${DB_NAME:-typus_db}"
  export DATABASE_URL="mysql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?charset=utf8mb4"
  echo "  ✅ MySQL (fallback): mysql://${DB_USER}:***@${DB_HOST}:${DB_PORT}/${DB_NAME}?charset=utf8mb4"
fi

echo ""

echo "📦 Step 1: Generating models index..."
pnpm --filter @typus-core/shared run dsl:generate-models-index || {
  echo "❌ Models index generation failed!"
  exit 1
}

echo "📦 Step 2: Generating DSL interfaces..."
pnpm --filter @typus-core/shared run dsl:generate-interfaces || {
  echo "❌ DSL interfaces generation failed!"
  exit 1
}

echo "📦 Step 3: Generating complete Prisma schema from DSL..."
cd /app
tsx @typus-core/shared/scripts/generate-prisma-schemas.ts || {
  echo "❌ Prisma schema generation failed!"
  exit 1
}
cd /app/@typus-core/backend

echo "📦 Step 4: Generating Prisma client to generated/client..."
cd /app
prisma generate --schema=/app/data/prisma/schemas/schema.prisma || {
  echo "❌ Prisma client generation failed!"
  exit 1
}

echo "⏳ Waiting for client generation to fully complete..."
sleep 2

echo "🔍 Verifying Prisma client is ready..."
if [ -d "${PRISMA_CLIENT_DIR}" ]; then
  echo "📂 Contents of ${PRISMA_CLIENT_DIR}:"
  ls -al "${PRISMA_CLIENT_DIR}" || true
else
  echo "📂 Prisma client directory ${PRISMA_CLIENT_DIR} does not exist"
fi
if [ ! -f "${PRISMA_OUTPUT_FILE}" ]; then
  echo "⚠️ Prisma client not found, waiting additional time..."
  sleep 5
  if [ -d "${PRISMA_CLIENT_DIR}" ]; then
    ls -al "${PRISMA_CLIENT_DIR}" || true
  fi
  if [ ! -f "${PRISMA_OUTPUT_FILE}" ]; then
    echo "❌ Prisma client still not ready after waiting!"
    exit 1
  fi
fi
echo "✅ Prisma client verified and ready"

echo "⏳ Waiting 2 seconds for all generation to complete..."
sleep 2

echo "🗄️ Step 5: Syncing database schema..."
# Sync database schema on EVERY startup (idempotent)
# Seed only runs once (controlled by seed_applied flag)
MANIFEST_PATH="${APP_ROOT}/typus-manifest.json"
SCHEMA_PATH="${APP_ROOT}/data/prisma/schemas/schema.prisma"

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
sleep 3

# Always apply schema changes (prisma db push is idempotent)
cd /app/@typus-core/shared
echo "🔄 Applying schema to database (prisma db push)..."
if pnpm exec prisma db push --accept-data-loss --schema="${SCHEMA_PATH}" 2>&1; then
  echo "✅ Database schema synced successfully"
  SCHEMA_SUCCESS=true
else
  echo "❌ Database schema sync failed!"
  SCHEMA_SUCCESS=false
fi
cd /app

if [ "$SCHEMA_SUCCESS" = "true" ]; then
  # Check if seed was already applied
  SEED_APPLIED="false"
  if [ -f "${MANIFEST_PATH}" ]; then
    SEED_APPLIED=$(jq -r '.seed_applied // false' "${MANIFEST_PATH}" 2>/dev/null || echo "false")
  fi

  if [ "$SEED_APPLIED" != "true" ]; then
    # Apply baseline defaults using TypeScript seed (only once)
    SEED_DIR="${APP_ROOT}/data/baseline/seed"
    SEED_SCRIPT="${SEED_DIR}/index.ts"

    if [ -f "${SEED_SCRIPT}" ]; then
      echo "🌱 Applying baseline defaults (TypeScript seed)..."
      export DATABASE_URL="${DATABASE_URL}"
      export SKIP_DEMO_DATA="${SKIP_DEMO_DATA:-false}"
      export NODE_PATH="${APP_ROOT}/@typus-core/backend/node_modules:${NODE_PATH}"

      if npx tsx "${SEED_SCRIPT}" 2>&1; then
        echo "  ✅ Baseline defaults applied"

        # Mark seed as applied
        if [ -f "${MANIFEST_PATH}" ] && command -v jq >/dev/null 2>&1; then
          jq '. + {"seed_applied": true, "seed_applied_at": "'$(date -Iseconds)'"}' "${MANIFEST_PATH}" > "${MANIFEST_PATH}.tmp" && mv "${MANIFEST_PATH}.tmp" "${MANIFEST_PATH}"
          echo "✅ Updated manifest: seed_applied = true"
        fi
      else
        echo "  ❌ Baseline seed failed!"
        exit 1
      fi
    else
      echo "  ⚠️  Seed script not found (${SEED_SCRIPT})"
      exit 1
    fi
  else
    echo "✅ Seed already applied (manifest: seed_applied = true)"
  fi
else
  echo "❌ Database schema sync failed!"
  exit 1
fi

echo "🎯 Step 6: Starting backend server..."
cd @typus-core/backend
export NODE_PATH=/app/node_modules
exec tsx watch server.ts
