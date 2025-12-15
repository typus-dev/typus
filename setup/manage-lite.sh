#!/bin/bash
# LITE Management Tool
# Version: 1.0.0
# Date: 2025-10-19
# Purpose: Manage Typus LITE deployment (1 container)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project directory (script is in project root)
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DOCKER_DIR="$PROJECT_DIR/docker"
ENV_FILE="$DOCKER_DIR/.env"
COMPOSE_FILE="$DOCKER_DIR/docker-compose.lite-single.yml"

# Container name
CONTAINER_NAME=""

# Check prerequisites
check_prerequisites() {
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}Error: .env file not found at $ENV_FILE${NC}"
        exit 1
    fi

    if [ ! -f "$COMPOSE_FILE" ]; then
        echo -e "${RED}Error: docker-compose.lite-single.yml not found${NC}"
        exit 1
    fi
}

# Load environment variables
load_env() {
    set -a
    source "$ENV_FILE" 2>/dev/null
    set +a

    # Get container name from compose
    cd "$DOCKER_DIR"
    CONTAINER_NAME=$(docker compose -f docker-compose.lite-single.yml ps -q 2>/dev/null | head -1)
}

# Run docker compose command
run_compose() {
    local cmd="$1"
    cd "$DOCKER_DIR"
    docker compose -f docker-compose.lite-single.yml $cmd
}

# Display header
show_header() {
    clear
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   ${GREEN}LITE Management Tool${BLUE}               ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    echo ""

    if [ -n "$COMPOSE_PROJECT_NAME" ]; then
        echo -e "${CYAN}Project: ${GREEN}${COMPOSE_PROJECT_NAME}${NC}"
    fi
    echo -e "${CYAN}Mode: ${GREEN}LITE (1 container)${NC}"
    echo ""
}

# Main menu
show_main_menu() {
    echo -e "${YELLOW}Select action:${NC}"
    echo -e "  ${GREEN}1${NC}) Start container"
    echo -e "  ${GREEN}2${NC}) Stop container"
    echo -e "  ${GREEN}3${NC}) Restart container"
    echo -e "  ${GREEN}4${NC}) View logs"
    echo -e "  ${GREEN}5${NC}) Container status"
    echo -e "  ${GREEN}6${NC}) Rebuild container"
    echo -e "  ${GREEN}7${NC}) Health check"
    echo -e "  ${GREEN}8${NC}) Shell access"
    echo -e "  ${GREEN}9${NC}) Database operations"
    echo -e "  ${GREEN}0${NC}) Exit"
    echo ""
}

# Start container
start_container() {
    echo -e "${BLUE}Starting LITE container...${NC}"
    run_compose "up -d"
    echo ""
    echo -e "${GREEN}✓ Container started${NC}"
    sleep 2
}

# Stop container
stop_container() {
    echo -e "${YELLOW}Stopping LITE container...${NC}"
    run_compose "down"
    echo ""
    echo -e "${GREEN}✓ Container stopped${NC}"
    sleep 2
}

# Restart container
restart_container() {
    echo -e "${YELLOW}Restarting LITE container...${NC}"
    run_compose "restart"
    echo ""
    echo -e "${GREEN}✓ Container restarted${NC}"
    sleep 2
}

# View logs
view_logs() {
    echo -e "${BLUE}Viewing logs (Ctrl+C to exit)...${NC}"
    echo ""
    run_compose "logs -f --tail=100"
}

# Show status
show_status() {
    echo -e "${BLUE}Container status:${NC}"
    echo ""
    run_compose "ps"
    echo ""
    read -p "Press Enter to continue..."
}

# Rebuild container
rebuild_container() {
    echo -e "${YELLOW}Rebuilding LITE container...${NC}"
    echo -e "${RED}This will rebuild the Docker image${NC}"
    read -p "Continue? (y/n) " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_compose "build --no-cache"
        run_compose "up -d"
        echo ""
        echo -e "${GREEN}✓ Container rebuilt and started${NC}"
    else
        echo -e "${YELLOW}Rebuild cancelled${NC}"
    fi
    sleep 2
}

# Health check
health_check() {
    echo -e "${BLUE}Running health check...${NC}"
    echo ""

    cd "$DOCKER_DIR"
    CONTAINER=$(docker compose -f docker-compose.lite-single.yml ps -q 2>/dev/null)

    if [ -z "$CONTAINER" ]; then
        echo -e "${RED}✗ Container not running${NC}"
    else
        echo -e "${GREEN}✓ Container running${NC}"
        echo ""
        echo -e "${CYAN}Health endpoint:${NC}"
        docker exec $CONTAINER curl -s http://localhost/api/health 2>/dev/null | jq '.' || echo -e "${RED}Health check failed${NC}"
    fi

    echo ""
    read -p "Press Enter to continue..."
}

# Shell access
shell_access() {
    echo -e "${BLUE}Opening shell in container...${NC}"
    echo ""

    cd "$DOCKER_DIR"
    CONTAINER=$(docker compose -f docker-compose.lite-single.yml ps -q 2>/dev/null)

    if [ -z "$CONTAINER" ]; then
        echo -e "${RED}✗ Container not running${NC}"
        sleep 2
    else
        docker exec -it $CONTAINER /bin/bash
    fi
}

# Database operations menu
database_menu() {
    while true; do
        show_header
        echo -e "${YELLOW}Database Operations:${NC}"
        echo -e "  ${GREEN}1${NC}) Run migrations"
        echo -e "  ${GREEN}2${NC}) Seed database"
        echo -e "  ${GREEN}3${NC}) Database backup"
        echo -e "  ${GREEN}4${NC}) Prisma Studio"
        echo -e "  ${GREEN}0${NC}) Back to main menu"
        echo ""
        read -p "Select option: " db_choice

        cd "$DOCKER_DIR"
        CONTAINER=$(docker compose -f docker-compose.lite-single.yml ps -q 2>/dev/null)

        case $db_choice in
            1)
                echo -e "${BLUE}Running database migrations...${NC}"
                if [ -n "$CONTAINER" ]; then
                    docker exec $CONTAINER bash -c "cd /app/@typus-core/backend && npx prisma migrate deploy"
                    echo ""
                    read -p "Press Enter to continue..."
                else
                    echo -e "${RED}Container not running${NC}"
                    sleep 2
                fi
                ;;
            2)
                echo -e "${BLUE}Seeding database...${NC}"
                if [ -n "$CONTAINER" ]; then
                    docker exec $CONTAINER bash -c "cd /app/@typus-core/backend && npx tsx ../../data/seeds/system-config.seed.ts"
                    echo ""
                    read -p "Press Enter to continue..."
                else
                    echo -e "${RED}Container not running${NC}"
                    sleep 2
                fi
                ;;
            3)
                echo -e "${BLUE}Creating database backup...${NC}"
                BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
                if [ -n "$DATABASE_URL" ]; then
                    docker exec common-mysql mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" "${DB_NAME:-klim_expert_db}" > "$PROJECT_DIR/$BACKUP_FILE"
                    echo -e "${GREEN}✓ Backup saved: $BACKUP_FILE${NC}"
                else
                    echo -e "${RED}DATABASE_URL not set${NC}"
                fi
                echo ""
                read -p "Press Enter to continue..."
                ;;
            4)
                echo -e "${BLUE}Starting Prisma Studio...${NC}"
                echo -e "${YELLOW}Access at: http://localhost:5555${NC}"
                if [ -n "$CONTAINER" ]; then
                    docker exec -it $CONTAINER bash -c "cd /app/@typus-core/backend && npx prisma studio"
                else
                    echo -e "${RED}Container not running${NC}"
                    sleep 2
                fi
                ;;
            0)
                break
                ;;
            *)
                echo -e "${RED}Invalid option${NC}"
                sleep 1
                ;;
        esac
    done
}

# Main loop
main() {
    check_prerequisites
    load_env

    while true; do
        show_header
        show_main_menu
        read -p "Select option: " choice

        case $choice in
            1)
                start_container
                ;;
            2)
                stop_container
                ;;
            3)
                restart_container
                ;;
            4)
                view_logs
                ;;
            5)
                show_status
                ;;
            6)
                rebuild_container
                ;;
            7)
                health_check
                ;;
            8)
                shell_access
                ;;
            9)
                database_menu
                ;;
            0)
                echo -e "${GREEN}Goodbye!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid option${NC}"
                sleep 1
                ;;
        esac
    done
}

# Run main
main
