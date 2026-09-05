#!/bin/bash
echo "🚀 Starting backend service (LITE profile)..."

# Shared-write by default (storage/backups/uploads/logs on bind mounts).
umask 0002

# pnpm/prisma sometimes default to /root paths when HOME isn't set by supervisor.
export HOME="${HOME:-/home/appuser}"
export XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
export XDG_CACHE_HOME="${XDG_CACHE_HOME:-$HOME/.cache}"

# App root is always /app in Docker
APP_ROOT="/app"
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

# =============================================================================
# CRITICAL: Schema MUST be generated from DSL models at runtime
# Static pre-built schemas are FORBIDDEN per architecture requirements
# =============================================================================

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
npx tsx @typus-core/shared/scripts/generate-prisma-schemas.ts || {
  echo "❌ Prisma schema generation failed!"
  exit 1
}
cd /app/@typus-core/backend

echo "📦 Step 3.5: Updating Prisma schema provider for ${DB_PROVIDER}..."
SCHEMA_FILE="${APP_ROOT}/data/prisma/schemas/schema.prisma"

if [ "$DB_PROVIDER" = "sqlite" ]; then
  # Update provider to sqlite
  sed -i 's/provider = "mysql"/provider = "sqlite"/g' "${SCHEMA_FILE}"
  sed -i 's/Provider: mysql/Provider: sqlite/g' "${SCHEMA_FILE}"

  # Remove MySQL-specific native types
  sed -i 's/@db\.VarChar([0-9]*) *//g' "${SCHEMA_FILE}"
  sed -i 's/@db\.Text *//g' "${SCHEMA_FILE}"
  sed -i 's/@db\.MediumText *//g' "${SCHEMA_FILE}"
  sed -i 's/@db\.LongText *//g' "${SCHEMA_FILE}"
  sed -i 's/@db\.DateTime([0-9]*) *//g' "${SCHEMA_FILE}"
  sed -i 's/@db\.TinyInt *//g' "${SCHEMA_FILE}"
  sed -i 's/@db\.SmallInt *//g' "${SCHEMA_FILE}"
  sed -i 's/@db\.Int *//g' "${SCHEMA_FILE}"
  sed -i 's/@db\.BigInt *//g' "${SCHEMA_FILE}"
  sed -i 's/@db\.Decimal([0-9]*,[0-9]*) *//g' "${SCHEMA_FILE}"
  sed -i 's/@db\.Json *//g' "${SCHEMA_FILE}"

  # Fix UUID defaults for SQLite
  sed -i 's/@default(dbgenerated("(uuid())"))/@default(uuid())/g' "${SCHEMA_FILE}"
  sed -i 's/@default(dbgenerated("uuid()"))/@default(uuid())/g' "${SCHEMA_FILE}"

  echo "  ✅ Updated schema for SQLite"

elif [ "$DB_PROVIDER" = "postgresql" ] || [ "$DB_PROVIDER" = "postgres" ]; then
  # Update provider to postgresql
  sed -i 's/provider = "mysql"/provider = "postgresql"/g' "${SCHEMA_FILE}"
  sed -i 's/Provider: mysql/Provider: postgresql/g' "${SCHEMA_FILE}"
  echo "  ✅ Updated schema for PostgreSQL"
else
  echo "  ℹ️  Using MySQL schema (default)"
fi

echo "📦 Step 4: Generating Prisma client to generated/client..."
cd /app/data/prisma
npx prisma generate --schema=schemas/schema.prisma || {
  echo "❌ Prisma client generation failed!"
  exit 1
}
cd /app/@typus-core/backend

echo "⏳ Waiting for client generation to fully complete..."
sleep 2

echo "🔍 Verifying Prisma client is ready..."
if [ ! -f "${PRISMA_OUTPUT_FILE}" ]; then
  echo "⚠️ Prisma client not found, waiting additional time..."
  sleep 5
  if [ ! -f "${PRISMA_OUTPUT_FILE}" ]; then
    echo "❌ Prisma client still not ready after waiting!"
    exit 1
  fi
fi
echo "✅ Prisma client verified"
echo "📂 Client size: $(du -sh ${PRISMA_CLIENT_DIR} | cut -f1)"

# Run database migrations on first startup
MANIFEST_PATH="${APP_ROOT}/typus-manifest.json"
SCHEMA_PATH="${APP_ROOT}/data/prisma/schemas/schema.prisma"

# HOW THIS INSTALL APPLIES ITS SCHEMA.
#
#   push     the schema generated from the DSL models is pushed to the database on EVERY start.
#            "Declare a model, restart, get a table" -- the promise the engine is built around.
#            It can drop a column that no longer exists in a model, which is why it is not the
#            default and must not be the choice on a database with data you care about.
#   migrate  (default, and what this script has always done) only migration FILES are applied, and
#            only once, gated by migrations_applied in the manifest.
#   none     nothing is applied; you run prisma yourself.
#
# WHY THIS EXISTS: docker-compose.local.yml -- the "clone and docker compose up" profile everyone
# starts with -- is built from this prod image, so it inherited `migrate`. There is exactly one
# migration file in the tree, from October 2025, holding the core tables. So a model added after
# that date, which means EVERY plugin model and any model a reader writes while following the
# documentation, was silently never given a table: the API answered, the registry knew the model,
# and Prisma failed on a table that did not exist. Measured 2026-09-05 on a clean stand: not one
# plugin table existed, for any plugin in the tree.
DB_SCHEMA_SYNC="${DB_SCHEMA_SYNC:-migrate}"
DB_PROVIDER="${DB_PROVIDER:-mysql}"

# SQLite has no migration story here, and never had: it has always been pushed.
if [ "${DB_PROVIDER}" = "sqlite" ] && [ "${DB_SCHEMA_SYNC}" = "migrate" ]; then
  DB_SCHEMA_SYNC="push"
fi

echo "🗄️  Schema sync mode: ${DB_SCHEMA_SYNC} (DB_SCHEMA_SYNC), provider: ${DB_PROVIDER}"

if [ "${DB_SCHEMA_SYNC}" = "push" ]; then
  # Every start, not once: this is what makes a newly declared model appear as a table without
  # anyone writing a migration. prisma db push is idempotent.
  echo "🔄 Applying schema to database (prisma db push)..."
  if npx prisma db push --schema="${SCHEMA_PATH}" --accept-data-loss --skip-generate; then
    echo "✅ Schema applied"
  else
    echo "❌ prisma db push failed -- the application would run against a database that does not"
    echo "   match its own models, so it is not being started."
    exit 1
  fi
elif [ "${DB_SCHEMA_SYNC}" = "none" ]; then
  echo "⏭️  Schema sync disabled (DB_SCHEMA_SYNC=none)."
  echo "   Apply it yourself: npx prisma db push --schema=${SCHEMA_PATH}"
else
  echo "ℹ️  Schema comes from migration files only. A model added since the last migration will NOT"
  echo "   get a table; write a migration, or set DB_SCHEMA_SYNC=push on a development database."
fi

# Check if migrations already applied (from manifest)
if [ -f "${MANIFEST_PATH}" ]; then
  MIGRATIONS_APPLIED=$(cat "${MANIFEST_PATH}" | grep -o '"migrations_applied"[[:space:]]*:[[:space:]]*true' || echo "")

  if [ -z "${MIGRATIONS_APPLIED}" ]; then
    echo "🔄 First startup detected - running database migrations..."

    # Wait for database to be ready
    echo "⏳ Waiting for database connection..."
    sleep 3

    # The schema itself was already handled above, according to DB_SCHEMA_SYNC. What is left here
    # is the part that genuinely belongs to a first start: the baseline seed.
    if [ "${DB_SCHEMA_SYNC}" != "migrate" ]; then
      echo "✅ Schema already applied above (DB_SCHEMA_SYNC=${DB_SCHEMA_SYNC})"
    else
      if npx prisma migrate deploy --schema="${SCHEMA_PATH}"; then
        echo "✅ Database migrations applied successfully"
      else
        echo "❌ Database migrations failed!"
        echo "💡 To retry migrations:"
        echo "   1. Fix database connection issue"
        echo "   2. Restart backend container (migrations_applied is still false)"
        exit 1
      fi
    fi

    # Apply baseline defaults using TypeScript seed (works for all databases)
    SEED_DIR="${APP_ROOT}/data/baseline/seed"
    SEED_SCRIPT="${SEED_DIR}/index.ts"

    if [ -f "${SEED_SCRIPT}" ]; then
      echo "🌱 Applying baseline defaults (TypeScript seed)..."

      # Export DATABASE_URL for Prisma seed
      export DATABASE_URL="${DATABASE_URL}"

      # Export SKIP_DEMO_DATA flag
      export SKIP_DEMO_DATA="${SKIP_DEMO_DATA:-false}"

      # Set NODE_PATH to backend node_modules (where Prisma Client is installed)
      export NODE_PATH="${APP_ROOT}/@typus-core/backend/node_modules:${NODE_PATH}"

      # Run seed using npx tsx
      if npx tsx "${SEED_SCRIPT}" 2>&1; then
        echo "  ✅ Baseline defaults applied"
      else
        echo "  ❌ Baseline seed failed!"
        exit 1
      fi
    else
      echo "  ⚠️  Seed script not found (${SEED_SCRIPT})"
      echo "  💡 Expected: data/baseline/seed/index.ts"
      exit 1
    fi

    # Mark migrations as successfully completed (prevents re-run on restart)
    if command -v jq >/dev/null 2>&1; then
      # Use jq: delete ALL old migration keys first to avoid duplicates, then add new values
      tmp_manifest="$(mktemp /tmp/typus-manifest.XXXXXX)"
      jq 'del(.migrations_applied, .migrations_applied_at, .migrations_started_at, .migrations_completed_at) | . + {"migrations_applied": true, "migrations_completed_at": "'$(date -Iseconds)'"}' "${MANIFEST_PATH}" > "${tmp_manifest}" && mv "${tmp_manifest}" "${MANIFEST_PATH}"
      echo "✅ Updated manifest: migrations_applied = true"
    else
      # Fallback: sed (remove ALL old migration entries first if they exist)
      sed -i '/  "migrations_applied":/d; /  "migrations_applied_at":/d; /  "migrations_started_at":/d; /  "migrations_completed_at":/d' "${MANIFEST_PATH}"
      sed -i 's/}$/,\n  "migrations_applied": true,\n  "migrations_completed_at": "'$(date -Iseconds)'"\n}/' "${MANIFEST_PATH}"
      echo "✅ Updated manifest: migrations_applied = true"
    fi
  else
    echo "✅ Migrations already applied (manifest: migrations_applied = true)"
    echo "💡 To re-run migrations, set 'migrations_applied': false in typus-manifest.json"
  fi
else
  echo "⚠️  Warning: typus-manifest.json not found, skipping auto-migrations"
  echo "💡 Run migrations manually: npx prisma migrate deploy --schema=${SCHEMA_PATH}"
fi

# Copy pre-generated client to backend node_modules
# NOTE: We use cp instead of symlink because symlinks can't cross Docker volume boundaries
# (backend_modules is a named volume, data is in bind mount)
echo "📋 Copying pre-generated Prisma client to node_modules..."
cd "${APP_ROOT}/@typus-core/backend" || exit 1
rm -rf node_modules/.prisma 2>/dev/null || true
mkdir -p node_modules/@prisma 2>/dev/null || true
rm -rf node_modules/@prisma/client 2>/dev/null || true
if cp -r "${PRISMA_CLIENT_DIR}" node_modules/@prisma/client 2>/dev/null; then
  echo "✅ Prisma client copied to node_modules/@prisma/client"
else
  echo "⚠️  Prisma client copy skipped (permissions). Using generated client from: ${PRISMA_CLIENT_DIR}"
fi

echo "🎯 Starting backend server..."
cd "${APP_ROOT}/@typus-core/backend"
exec npx tsx watch server.ts
