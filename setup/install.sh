#!/bin/bash

# Typus Interactive Installer
# Single container deployment (Nginx + Backend + Frontend)
# Asks only: domain, database connection
# Generates all secrets automatically
# REQUIRES: External MySQL database (PostgreSQL/SQLite use typus-cli)

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ Typus Interactive Installer     ${NC}"
echo -e "${BLUE}║   Single Container Deployment        ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check Docker Compose
if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose detected${NC}"
echo ""

# Function to generate random secret
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Function to generate profile-specific .env file
# Usage: generate_profile_env "local|dev|prod" ".env.local"
generate_profile_env() {
    local profile_name=$1
    local output_file=$2

    # Copy template
    cp .env.example "$output_file"

    # Profile-specific values
    local node_env="development"
    local app_domain="${APP_DOMAIN}"
    local project_path="${PROJECT_PATH}"

    # Adjust values based on profile
    if [ "$profile_name" = "local" ]; then
        app_domain="localhost"
        node_env="development"
    elif [ "$profile_name" = "prod" ]; then
        node_env="production"
    fi
    # All profiles use real PROJECT_PATH (replaced in all profiles for simplicity)

    # Replace CHANGE_ME_* placeholders
    sed -i "s|APP_DOMAIN=CHANGE_ME_DOMAIN|APP_DOMAIN=${app_domain}|g" "$output_file"
    sed -i "s|NODE_ENV=CHANGE_ME_NODE_ENV|NODE_ENV=${node_env}|g" "$output_file"
    sed -i "s|PROJECT_PATH=CHANGE_ME_PROJECT_PATH|PROJECT_PATH=${project_path}|g" "$output_file"
    sed -i "s|COMPOSE_PROJECT_NAME=CHANGE_ME_PROJECT_NAME|COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME}|g" "$output_file"

    # Database config (same for all profiles)
    sed -i "s|DB_HOST=CHANGE_ME_DB_HOST|DB_HOST=${DB_HOST}|g" "$output_file"
    sed -i "s|DB_PORT=CHANGE_ME_DB_PORT|DB_PORT=${DB_PORT}|g" "$output_file"
    sed -i "s|DB_NAME=CHANGE_ME_DB_NAME|DB_NAME=${DB_NAME}|g" "$output_file"
    sed -i "s|DB_USER=CHANGE_ME_DB_USER|DB_USER=${DB_USER}|g" "$output_file"
    sed -i "s|DB_PASSWORD=CHANGE_ME_DB_PASSWORD|DB_PASSWORD=${DB_PASSWORD}|g" "$output_file"
    sed -i "s|DB_PROVIDER=CHANGE_ME_DB_PROVIDER|DB_PROVIDER=${DB_PROVIDER}|g" "$output_file"

    # Security tokens (same for all profiles)
    sed -i "s|INTERNAL_API_TOKEN=CHANGE_ME_INTERNAL_TOKEN|INTERNAL_API_TOKEN=${INTERNAL_API_TOKEN}|g" "$output_file"
    sed -i "s|APP_SECRET=CHANGE_ME_APP_SECRET|APP_SECRET=${APP_SECRET}|g" "$output_file"
    sed -i "s|JWT_SECRET=CHANGE_ME_JWT_SECRET|JWT_SECRET=${JWT_SECRET}|g" "$output_file"
    sed -i "s|SESSION_SECRET=CHANGE_ME_SESSION_SECRET|SESSION_SECRET=${SESSION_SECRET}|g" "$output_file"
    sed -i "s|CONVERSATION_ENCRYPTION_SALT=CHANGE_ME_CONVERSATION_SALT|CONVERSATION_ENCRYPTION_SALT=${CONVERSATION_ENCRYPTION_SALT}|g" "$output_file"

    # Set UID/GID (same for all profiles)
    sed -i "s|HOST_UID=1000|HOST_UID=${HOST_UID}|g" "$output_file"
    sed -i "s|HOST_GID=1000|HOST_GID=${HOST_GID}|g" "$output_file"

    # Admin credentials (generated per installation)
    sed -i "s|ADMIN_EMAIL=CHANGE_ME_ADMIN_EMAIL|ADMIN_EMAIL=${ADMIN_EMAIL}|g" "$output_file"
    sed -i "s|ADMIN_PASSWORD=CHANGE_ME_ADMIN_PASSWORD|ADMIN_PASSWORD=${ADMIN_PASSWORD}|g" "$output_file"
}

# Ask for user input
echo -e "${BLUE}Please provide the following information:${NC}"
echo ""

# 1. Domain
read -p "Enter domain (e.g., example.com or localhost): " APP_DOMAIN
if [ -z "$APP_DOMAIN" ]; then
    APP_DOMAIN="localhost"
    echo -e "${YELLOW}Using default: localhost${NC}"
fi

# 2. Admin email
echo ""
echo -e "${BLUE}Admin account:${NC}"
read -p "Admin email (e.g., admin@yourdomain.com): " ADMIN_EMAIL
if [ -z "$ADMIN_EMAIL" ]; then
    ADMIN_EMAIL="admin@${APP_DOMAIN}"
    echo -e "${YELLOW}Using default: ${ADMIN_EMAIL}${NC}"
fi

# 3. Database connection
echo ""
echo -e "${BLUE}Database connection:${NC}"
read -p "Database host (default: host.docker.internal): " DB_HOST
DB_HOST=${DB_HOST:-host.docker.internal}

read -p "Database port (default: 3306): " DB_PORT
DB_PORT=${DB_PORT:-3306}

read -p "Database name (default: typus_lite_db): " DB_NAME
DB_NAME=${DB_NAME:-typus_lite_db}

read -p "Database user (default: root): " DB_USER
DB_USER=${DB_USER:-root}

read -s -p "Database password: " DB_PASSWORD
echo ""

if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ Database password is required${NC}"
    exit 1
fi

# Construct DATABASE_URL
DATABASE_URL="mysql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Set DB_PROVIDER (install.sh only supports MySQL)
DB_PROVIDER="mysql"

# Generate secrets
echo ""
echo -e "${BLUE}Generating security tokens...${NC}"
JWT_SECRET=$(generate_secret)
APP_SECRET=$(generate_secret)
SESSION_SECRET=$(generate_secret)
INTERNAL_API_TOKEN=$(generate_secret)
CONVERSATION_ENCRYPTION_SALT=$(openssl rand -hex 32)

# Generate admin password (12 chars, alphanumeric, easy to type)
ADMIN_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-12)

echo -e "${GREEN}✓ Security tokens generated${NC}"

# Detect current directory
PROJECT_PATH=$(pwd)

# Generate unique project name based on domain
# Replace dots and dashes with underscores, convert to lowercase
COMPOSE_PROJECT_NAME="$(echo ${APP_DOMAIN} | tr '.-' '_' | tr '[:upper:]' '[:lower:]')"

# Set user permissions for Docker (needed by generate_profile_env)
export HOST_UID=$(id -u)
export HOST_GID=$(id -g)

# Generate nginx-dev.conf from template with actual PROJECT_PATH
echo ""
echo -e "${BLUE}Generating nginx configuration for dev mode...${NC}"

if [ -f "docker/configs/nginx-dev.conf.example" ]; then
    sed "s|CHANGE_ME_PROJECT_PATH|${PROJECT_PATH}|g" \
        docker/configs/nginx-dev.conf.example > docker/configs/nginx-dev.conf
    echo -e "${GREEN}✓ nginx-dev.conf generated with PROJECT_PATH=${PROJECT_PATH}${NC}"
else
    echo -e "${YELLOW}⚠️  nginx-dev.conf.example not found, using existing nginx-dev.conf${NC}"
fi

# Create profile configuration files
echo ""
echo -e "${BLUE}Creating profile configuration files...${NC}"

if [ ! -f ".env.example" ]; then
    echo -e "${RED}❌ .env.example template not found${NC}"
    exit 1
fi

# Generate all 3 profiles
generate_profile_env "local" ".env.local"
echo -e "${GREEN}✓ .env.local created (localhost access)${NC}"

generate_profile_env "dev" ".env.dev"
echo -e "${GREEN}✓ .env.dev created (development with domain)${NC}"

generate_profile_env "prod" ".env.prod"
echo -e "${GREEN}✓ .env.prod created (production deployment)${NC}"

# Activate prod profile (install.sh is for production installations)
cp .env.prod .env
echo -e "${GREEN}✓ Activated prod profile (.env)${NC}"

# Copy prod compose to active (if exists)
if [ -f "docker-compose.prod.yml" ]; then
    cp docker-compose.prod.yml docker-compose.yml
    echo -e "${GREEN}✓ Activated prod compose (docker-compose.yml)${NC}"
fi

# Secure .env files (contain secrets - owner read/write only)
chmod 600 .env .env.local .env.dev .env.prod 2>/dev/null
echo -e "${GREEN}✓ Secured .env files (chmod 600)${NC}"

# Validation function
validate_env() {
    local pattern=$1
    local message=$2
    if grep -Eq "$pattern" .env; then
        echo -e "${RED}❌ $message${NC}"
        exit 1
    fi
}

# Validate active profile - all CHANGE_ME placeholders should be replaced
validate_env "^[^#]*CHANGE_ME" "Configuration incomplete - placeholder values detected in .env"

echo -e "${GREEN}✓ Profile system initialized${NC}"

run_mysql_command() {
    local sql="$1"

    if command -v mysql >/dev/null 2>&1; then
        mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" "-p${DB_PASSWORD}" "${DB_NAME}" -e "${sql}" >/dev/null 2>&1
        return $?
    fi

    if docker ps --format '{{.Names}}' | grep -q "^${DB_HOST}$"; then
        docker exec "${DB_HOST}" mysql -u "${DB_USER}" "-p${DB_PASSWORD}" "${DB_NAME}" -e "${sql}" >/dev/null 2>&1
        return $?
    fi

    echo -e "${YELLOW}⚠️  mysql client not available locally and container ${DB_HOST} not detected.${NC}"
    return 1
}

apply_domain_config() {
    local domain="$1"
    local base_url="https://${domain}"
    local google_callback="${base_url}/auth/google/callback"
    local twitter_redirect="${base_url}/api/social-media/auth/twitter/callback"

    echo -e "${BLUE}Applying domain configuration to database...${NC}"
    local sql="
UPDATE \`system.config_public\`
   SET value='${base_url}', updated_at=NOW()
 WHERE \`key\` IN ('site.url','site.base_url');

UPDATE \`system.config_public\`
   SET value='${google_callback}', updated_at=NOW()
 WHERE \`key\`='integrations.google_callback_url';

UPDATE \`system.config_public\`
   SET value='${twitter_redirect}', updated_at=NOW()
 WHERE \`key\`='integrations.twitter_redirect_uri';

UPDATE \`system.config\`
   SET value='${base_url}', updated_at=NOW()
 WHERE \`key\` IN ('site.url','site.base_url');
"

    if run_mysql_command "${sql}"; then
        echo -e "${GREEN}✓ Domain configuration updated${NC}"
    else
        echo -e "${YELLOW}⚠️  Failed to update domain configuration automatically. Please adjust values manually in Settings → Site.${NC}"
    fi
}

# Create required directories
echo ""
echo -e "${BLUE}Creating directories...${NC}"
mkdir -p storage/uploads storage/cache storage/logs data/prisma/schemas
echo -e "${GREEN}✓ Directories created${NC}"

# Create database if it doesn't exist
echo ""
echo -e "${BLUE}Setting up database...${NC}"

# Try to create database using docker exec (if MySQL is in Docker)
# Use DB_HOST as container name if it looks like a Docker container name
if docker ps --format '{{.Names}}' | grep -q "^${DB_HOST}$"; then
    echo "Detected MySQL container: ${DB_HOST}"

    if docker exec ${DB_HOST} mysql -u${DB_USER} -p${DB_PASSWORD} -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null; then
        echo -e "${GREEN}✓ Database '${DB_NAME}' ready${NC}"
    else
        echo -e "${YELLOW}⚠️  Could not auto-create database. You may need to create it manually:${NC}"
        echo "   CREATE DATABASE ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    fi
else
    echo -e "${YELLOW}⚠️  MySQL container '${DB_HOST}' not detected. Make sure database '${DB_NAME}' exists.${NC}"
fi

echo ""
echo -e "${BLUE}Building and starting LITE container...${NC}"
echo -e "${YELLOW}(This may take a few minutes on first run)${NC}"
echo ""
echo -e "${BLUE}Waiting for container to initialize...${NC}"
echo -e "${YELLOW}(Docker will wait until healthcheck passes: migrations + baseline applied)${NC}"
echo ""

# Start container and wait for healthcheck (synchronous)
docker compose up -d --build --wait

echo -e "${GREEN}✓ Container is ready (healthcheck passed)${NC}"
echo ""

# Get container name
CONTAINER_NAME=$(docker compose ps --format json 2>/dev/null | jq -r '.[0].Name' 2>/dev/null || echo "${COMPOSE_PROJECT_NAME}_lite")

# Apply domain configuration using the LITE container's mysql client
echo -e "${BLUE}Applying domain configuration to database...${NC}"

if docker exec ${CONTAINER_NAME} sh -c "mysql -h\"\${DB_HOST}\" -u\"\${DB_USER}\" -p\"\${DB_PASSWORD}\" \"\${DB_NAME}\" -e \"UPDATE \\\`system.config_public\\\` SET value='https://${APP_DOMAIN}', updated_at=NOW() WHERE \\\`key\\\` IN ('site.url','site.base_url'); UPDATE \\\`system.config_public\\\` SET value='https://${APP_DOMAIN}/auth/google/callback', updated_at=NOW() WHERE \\\`key\\\`='integrations.google_callback_url'; UPDATE \\\`system.config_public\\\` SET value='https://${APP_DOMAIN}/api/social-media/auth/twitter/callback', updated_at=NOW() WHERE \\\`key\\\`='integrations.twitter_redirect_uri'; UPDATE \\\`system.config\\\` SET value='https://${APP_DOMAIN}', updated_at=NOW() WHERE \\\`key\\\` IN ('site.url','site.base_url');\"" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Domain configuration updated to https://${APP_DOMAIN}${NC}"
else
    echo -e "${YELLOW}⚠️  Failed to update domain configuration automatically. Please adjust values manually in Settings → Site.${NC}"
fi

# Check if container is running
if docker compose ps | grep -q "Up"; then
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   ✅ Installation Successful!        ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Your Typus LITE site is now running:${NC}"
    echo ""
    echo "  🌐 Site:         https://${APP_DOMAIN}"
    echo "  🔌 API:          https://${APP_DOMAIN}/api"
    echo "  📦 Mode:         LITE (1 container)"
    echo ""
    echo -e "${GREEN}╔═════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   🔐 Admin Credentials                          ║${NC}"
    echo -e "${GREEN}╠═════════════════════════════════════════════════╣${NC}"
    printf "${GREEN}║   Email:    %-35s ║${NC}\n" "${ADMIN_EMAIL}"
    printf "${GREEN}║   Password: %-35s ║${NC}\n" "${ADMIN_PASSWORD}"
    echo -e "${GREEN}╚═════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  SAVE THIS PASSWORD! It won't be shown again.${NC}"
    echo ""
    echo -e "${BLUE}Container name:${NC} ${CONTAINER_NAME}"
    echo -e "${BLUE}Configuration:${NC} .env"
    echo ""
    echo -e "${BLUE}Useful commands:${NC}"
    echo "  View logs:       docker compose logs -f"
    echo "  Stop:            docker compose down"
    echo "  Restart:         docker compose restart"
    echo "  Check status:    docker compose ps"
    echo ""
    echo -e "${YELLOW}⚠️  Security tokens have been auto-generated.${NC}"
    echo -e "${YELLOW}   Keep your .env file secure!${NC}"
    echo ""
else
    echo ""
    echo -e "${YELLOW}⚠️  Container may not have started correctly.${NC}"
    echo "Check logs: docker compose logs -f"
    echo ""
    echo "Common issues:"
    echo "  - Database connection: verify database is running and accessible"
    echo "  - Port in use: check if port 80/443 is already in use"
    echo "  - Permissions: ensure Docker has access to create volumes"
    echo ""
fi
