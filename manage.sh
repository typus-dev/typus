#!/bin/bash
# Typus LITE Management Tool
# Version: 2.0.0
# Date: 2025-10-29
# Purpose: Manage Typus LITE with profile switching (local/dev/prod)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get project directory (script is in project root)
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Active files (gitignored, copies of profiles)
ENV_FILE="$PROJECT_DIR/.env"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"

# Profile files (committed)
ENV_LOCAL="$PROJECT_DIR/.env.local"
ENV_DEV="$PROJECT_DIR/.env.dev"
ENV_PROD="$PROJECT_DIR/.env.prod"

COMPOSE_LOCAL="$PROJECT_DIR/docker-compose.local.yml"
COMPOSE_DEV="$PROJECT_DIR/docker-compose.dev.yml"
COMPOSE_PROD="$PROJECT_DIR/docker-compose.prod.yml"

# Backup directory
BACKUP_DIR="$PROJECT_DIR/.profile-backups"

# Current profile
CURRENT_PROFILE=""

# Detect active profile
detect_active_profile() {
    # Check if active files exist
    if [ ! -f "$ENV_FILE" ] || [ ! -f "$COMPOSE_FILE" ]; then
        echo ""
        return
    fi

    # Compare docker-compose.yml with profile files to detect active profile
    if [ -f "$COMPOSE_LOCAL" ] && cmp -s "$COMPOSE_FILE" "$COMPOSE_LOCAL"; then
        echo "local"
    elif [ -f "$COMPOSE_DEV" ] && cmp -s "$COMPOSE_FILE" "$COMPOSE_DEV"; then
        echo "dev"
    elif [ -f "$COMPOSE_PROD" ] && cmp -s "$COMPOSE_FILE" "$COMPOSE_PROD"; then
        echo "prod"
    else
        echo "unknown"
    fi
}

# Backup active profile before switching
backup_active_profile() {
    if [ ! -f "$ENV_FILE" ] || [ ! -f "$COMPOSE_FILE" ]; then
        return
    fi

    # Create backup directory if needed
    mkdir -p "$BACKUP_DIR"

    # Generate timestamp
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local current_profile=$(detect_active_profile)

    # Backup files
    cp "$ENV_FILE" "$BACKUP_DIR/.env.backup_${current_profile}_${timestamp}"
    cp "$COMPOSE_FILE" "$BACKUP_DIR/docker-compose.yml.backup_${current_profile}_${timestamp}"

    echo -e "${GREEN}✓ Backed up current profile to $BACKUP_DIR${NC}"
}

# Switch to specified profile
switch_profile() {
    local mode=$1

    # Validate mode
    if [[ "$mode" != "local" && "$mode" != "dev" && "$mode" != "prod" ]]; then
        echo -e "${RED}Error: Invalid profile '$mode'${NC}"
        echo -e "${YELLOW}Valid profiles: local, dev, prod${NC}"
        exit 1
    fi

    # Set profile file paths
    local env_profile=""
    local compose_profile=""

    case $mode in
        local)
            env_profile="$ENV_LOCAL"
            compose_profile="$COMPOSE_LOCAL"
            ;;
        dev)
            env_profile="$ENV_DEV"
            compose_profile="$COMPOSE_DEV"
            ;;
        prod)
            env_profile="$ENV_PROD"
            compose_profile="$COMPOSE_PROD"
            ;;
    esac

    # Check if profile files exist
    if [ ! -f "$env_profile" ]; then
        echo -e "${RED}Error: Profile file not found: $env_profile${NC}"
        echo -e "${YELLOW}Please create this profile first${NC}"
        exit 1
    fi

    if [ ! -f "$compose_profile" ]; then
        echo -e "${RED}Error: Profile file not found: $compose_profile${NC}"
        exit 1
    fi

    # Detect current profile
    local current=$(detect_active_profile)

    if [ "$current" == "$mode" ]; then
        echo -e "${YELLOW}Already using '$mode' profile${NC}"
        return
    fi

    echo -e "${BLUE}Switching from '$current' to '$mode' profile...${NC}"
    echo ""

    # Backup current profile
    if [ "$current" != "unknown" ] && [ "$current" != "" ]; then
        backup_active_profile
    fi

    # Copy profile to active files
    echo -e "${BLUE}Activating '$mode' profile...${NC}"
    cp "$env_profile" "$ENV_FILE"
    cp "$compose_profile" "$COMPOSE_FILE"

    echo -e "${GREEN}✓ Profile switched to: $mode${NC}"
    echo ""
    echo -e "${CYAN}Active files updated:${NC}"
    echo -e "  ${GREEN}.env${NC} ← .env.$mode"
    echo -e "  ${GREEN}docker-compose.yml${NC} ← docker-compose.$mode.yml"
    echo ""
    echo -e "${YELLOW}Restart containers to apply changes:${NC}"
    echo -e "  ${CYAN}docker compose down && docker compose up -d${NC}"
}

# Show profile status
show_profile_status() {
    local current=$(detect_active_profile)

    echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║          Profile Status                ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
    echo ""

    if [ "$current" == "" ] || [ "$current" == "unknown" ]; then
        echo -e "${RED}✗ No active profile detected${NC}"
        echo -e "${YELLOW}Run: ./manage.sh switch {local|dev|prod}${NC}"
    else
        echo -e "${GREEN}✓ Active Profile: ${YELLOW}$current${NC}"
    fi

    echo ""
    echo -e "${CYAN}Available Profiles:${NC}"

    # Check local profile
    if [ -f "$ENV_LOCAL" ] && [ -f "$COMPOSE_LOCAL" ]; then
        if [ "$current" == "local" ]; then
            echo -e "  ${GREEN}● local${NC}  (localhost + embedded MySQL)"
        else
            echo -e "  ${YELLOW}○ local${NC}  (localhost + embedded MySQL)"
        fi
    else
        echo -e "  ${RED}✗ local${NC}  (not configured)"
    fi

    # Check dev profile
    if [ -f "$ENV_DEV" ] && [ -f "$COMPOSE_DEV" ]; then
        if [ "$current" == "dev" ]; then
            echo -e "  ${GREEN}● dev${NC}    (domain + external MySQL + hot reload)"
        else
            echo -e "  ${YELLOW}○ dev${NC}    (domain + external MySQL + hot reload)"
        fi
    else
        echo -e "  ${RED}✗ dev${NC}    (not configured)"
    fi

    # Check prod profile
    if [ -f "$ENV_PROD" ] && [ -f "$COMPOSE_PROD" ]; then
        if [ "$current" == "prod" ]; then
            echo -e "  ${GREEN}● prod${NC}   (domain + external MySQL + production)"
        else
            echo -e "  ${YELLOW}○ prod${NC}   (domain + external MySQL + production)"
        fi
    else
        echo -e "  ${RED}✗ prod${NC}   (not configured)"
    fi

    echo ""
    echo -e "${CYAN}Commands:${NC}"
    echo -e "  ${GREEN}./manage.sh switch local${NC}  - Switch to localhost mode"
    echo -e "  ${GREEN}./manage.sh switch dev${NC}    - Switch to development mode"
    echo -e "  ${GREEN}./manage.sh switch prod${NC}   - Switch to production mode"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}Error: .env file not found in $PROJECT_DIR${NC}"
        echo -e "${YELLOW}Please create .env file first or switch to a profile${NC}"
        exit 1
    fi

    if [ ! -f "$COMPOSE_FILE" ]; then
        echo -e "${RED}Error: docker-compose.yml not found${NC}"
        echo -e "${YELLOW}Please switch to a profile first:${NC}"
        echo -e "  ${CYAN}./manage.sh switch {local|dev|prod}${NC}"
        exit 1
    fi
}

# Load environment variables
load_env() {
    set -a
    source "$ENV_FILE"
    set +a

    # Detect current profile
    CURRENT_PROFILE=$(detect_active_profile)
}

# Run docker compose command
run_compose() {
    local cmd="$1"
    local service="$2"

    cd "$PROJECT_DIR"

    if [ -n "$service" ]; then
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" $cmd "$service"
    else
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" $cmd
    fi
}

# Display header
show_header() {
    clear
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   ${GREEN}Typus LITE Management Tool${BLUE}         ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    echo ""

    # Show project name from .env
    if [ -n "$COMPOSE_PROJECT_NAME" ]; then
        echo -e "${CYAN}Project: ${GREEN}${COMPOSE_PROJECT_NAME}${NC}"
    fi

    # Show current profile
    if [ -n "$CURRENT_PROFILE" ] && [ "$CURRENT_PROFILE" != "unknown" ]; then
        case "$CURRENT_PROFILE" in
            local)
                echo -e "${CYAN}Profile: ${YELLOW}Local${NC} (localhost + embedded MySQL)"
                ;;
            dev)
                echo -e "${CYAN}Profile: ${YELLOW}Development${NC} (domain + hot reload)"
                ;;
            prod)
                echo -e "${CYAN}Profile: ${GREEN}Production${NC} (domain + production)"
                ;;
        esac
        echo ""
    fi
}

# Main menu
show_main_menu() {
    echo -e "${YELLOW}Main Menu:${NC}"
    echo -e "  ${GREEN}1${NC}) Profile Management"
    echo -e "  ${GREEN}2${NC}) Container Operations"
    echo -e "  ${GREEN}3${NC}) Utilities"
    echo -e "  ${GREEN}0${NC}) Exit"
    echo ""
}

# Profile management menu
show_profile_menu() {
    local current=$(detect_active_profile)

    echo -e "${YELLOW}Profile Management:${NC}"
    echo ""
    echo -e "${CYAN}Current: ${GREEN}$current${NC}"
    echo ""
    echo -e "  ${GREEN}1${NC}) Switch to Local profile"
    echo -e "  ${GREEN}2${NC}) Switch to Dev profile"
    echo -e "  ${GREEN}3${NC}) Switch to Prod profile"
    echo -e "  ${GREEN}4${NC}) Show profile status"
    echo -e "  ${GREEN}0${NC}) Back to main menu"
    echo ""
}

# Container operations menu
show_container_menu() {
    echo -e "${YELLOW}Container Operations:${NC}"
    echo -e "  ${GREEN}1${NC}) Start containers"
    echo -e "  ${GREEN}2${NC}) Stop containers"
    echo -e "  ${GREEN}3${NC}) Restart containers"
    echo -e "  ${GREEN}4${NC}) View logs"
    echo -e "  ${GREEN}5${NC}) Rebuild containers"
    echo -e "  ${GREEN}6${NC}) Shell access"
    if [ "$CURRENT_PROFILE" == "dev" ]; then
        echo -e "  ${GREEN}7${NC}) Regenerate Prisma Client"
    fi
    echo -e "  ${GREEN}0${NC}) Back to main menu"
    echo ""
}

# Utilities menu
show_utils_menu() {
    echo -e "${YELLOW}Utilities:${NC}"
    echo -e "  ${GREEN}1${NC}) Container status"
    echo -e "  ${GREEN}2${NC}) Health check"
    echo -e "  ${GREEN}3${NC}) Clean volumes"
    echo -e "  ${GREEN}4${NC}) Full rebuild"
    echo -e "  ${GREEN}5${NC}) Edit .env file"
    echo -e "  ${GREEN}0${NC}) Back to main menu"
    echo ""
}

# Start containers
start_containers() {
    echo -e "${BLUE}Starting containers...${NC}"
    run_compose "up -d"
    echo ""
    echo -e "${GREEN}✓ Containers started${NC}"
    show_status
}

# Stop containers
stop_containers() {
    echo -e "${BLUE}Stopping containers...${NC}"
    run_compose "stop"
    echo ""
    echo -e "${GREEN}✓ Containers stopped${NC}"
    show_status
}

# Restart containers
restart_containers() {
    echo -e "${BLUE}Restarting containers...${NC}"
    run_compose "restart"
    echo ""
    echo -e "${GREEN}✓ Containers restarted${NC}"
    show_status
}

# View logs
view_logs() {
    local service=$1
    local service_name=${service:-"all"}

    echo -e "${BLUE}Viewing logs for ${service_name}...${NC}"
    echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
    sleep 2

    if [ -n "$service" ]; then
        run_compose "logs -f --tail=100" "$service"
    else
        run_compose "logs -f --tail=100"
    fi

    echo ""
    echo -e "${GREEN}✓ Exited log view${NC}"
}

# Rebuild containers
rebuild_containers() {
    echo -e "${BLUE}Rebuilding containers...${NC}"
    run_compose "stop"
    run_compose "up -d --build"
    echo ""
    echo -e "${GREEN}✓ Containers rebuilt${NC}"
    show_status
}

# Build images (production)
build_images() {
    echo -e "${BLUE}Building production images...${NC}"
    echo -e "${YELLOW}This may take several minutes...${NC}"
    run_compose "build"
    echo ""
    echo -e "${GREEN}✓ Images built${NC}"
}

# Show container status
show_status() {
    echo ""
    echo -e "${CYAN}Container Status:${NC}"
    run_compose "ps"
    echo ""
}

# Health check
health_check() {
    echo -e "${BLUE}Checking health endpoints...${NC}"
    echo ""

    # Check backend
    echo -e "${CYAN}Backend health:${NC}"
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        HEALTH=$(curl -s http://localhost:3001/api/health)
        echo -e "${GREEN}✓ Backend: ${HEALTH}${NC}"
    else
        echo -e "${RED}✗ Backend: not responding${NC}"
    fi

    echo ""
    show_status
}

# Clean volumes
clean_volumes() {
    echo -e "${RED}WARNING: This will remove all volumes and data!${NC}"
    echo -e "${YELLOW}Database data will be lost!${NC}"
    echo ""
    read -p "Are you sure? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        echo -e "${GREEN}Operation cancelled${NC}"
        return
    fi

    echo -e "${BLUE}Stopping containers and removing volumes...${NC}"
    run_compose "down -v"
    echo ""
    echo -e "${GREEN}✓ Volumes cleaned${NC}"
}

# Full rebuild
full_rebuild() {
    echo -e "${RED}WARNING: This will stop containers and rebuild everything!${NC}"
    echo ""
    read -p "Continue? (y/n): " confirm

    if [[ $confirm != "y" && $confirm != "Y" ]]; then
        echo -e "${GREEN}Operation cancelled${NC}"
        return
    fi

    echo -e "${BLUE}Stopping containers...${NC}"
    run_compose "down --volumes=false"

    echo -e "${BLUE}Rebuilding and starting...${NC}"
    run_compose "up -d --build"

    echo ""
    echo -e "${GREEN}✓ Full rebuild complete${NC}"
    show_status
}

# Edit .env file
edit_env() {
    local editor=${EDITOR:-nano}
    echo -e "${BLUE}Opening .env file...${NC}"
    $editor "$ENV_FILE"
    echo ""
    echo -e "${GREEN}✓ .env file updated${NC}"
    echo -e "${YELLOW}Restart containers to apply changes${NC}"
}

# Regenerate Prisma Client
regenerate_prisma() {
    echo -e "${BLUE}Regenerating Prisma Client...${NC}"
    echo ""

    docker exec ${COMPOSE_PROJECT_NAME}_lite sh -c "cd /app/@typus-core/shared && pnpm run dsl:generate-prisma-schemas" || {
        echo -e "${RED}✗ Failed to generate Prisma schemas${NC}"
        return 1
    }

    docker exec ${COMPOSE_PROJECT_NAME}_lite sh -c "cd /app/data/prisma && npx prisma generate --schema=schemas/schema.prisma" || {
        echo -e "${RED}✗ Failed to generate Prisma client${NC}"
        return 1
    }

    echo ""
    echo -e "${GREEN}✓ Prisma Client regenerated${NC}"
    echo -e "${YELLOW}Backend will auto-reload (tsx watch)${NC}"
}

# Shell access
shell_access() {
    echo -e "${BLUE}Opening shell in container...${NC}"
    echo -e "${YELLOW}Type 'exit' to leave${NC}"
    sleep 1
    docker exec -it ${COMPOSE_PROJECT_NAME}_lite /bin/bash
}

# Profile management handler
handle_profile_management() {
    while true; do
        show_header
        show_profile_menu

        read -p "Choice [0-4]: " choice

        case $choice in
            0) return ;;
            1)
                switch_profile "local"
                load_env
                ;;
            2)
                switch_profile "dev"
                load_env
                ;;
            3)
                switch_profile "prod"
                load_env
                ;;
            4)
                show_profile_status
                ;;
            *) echo -e "${RED}Invalid choice${NC}" ;;
        esac

        if [ "$choice" != "0" ]; then
            read -p "Press Enter to continue..."
        fi
    done
}

# Container operations handler
handle_container_operations() {
    while true; do
        show_header
        show_container_menu

        local max_choice=6
        if [ "$CURRENT_PROFILE" == "dev" ]; then
            max_choice=7
        fi

        read -p "Choice [0-$max_choice]: " choice

        case $choice in
            0) return ;;
            1) start_containers ;;
            2) stop_containers ;;
            3) restart_containers ;;
            4) view_logs ;;
            5) rebuild_containers ;;
            6) shell_access ;;
            7)
                if [ "$CURRENT_PROFILE" == "dev" ]; then
                    regenerate_prisma
                else
                    echo -e "${RED}Invalid choice${NC}"
                fi
                ;;
            *) echo -e "${RED}Invalid choice${NC}" ;;
        esac

        if [ "$choice" != "0" ] && [ "$choice" != "4" ] && [ "$choice" != "6" ]; then
            read -p "Press Enter to continue..."
        fi
    done
}

# Utilities handler
handle_utilities() {
    while true; do
        show_header
        show_utils_menu

        read -p "Choice [0-5]: " choice

        case $choice in
            0) return ;;
            1) show_status ;;
            2) health_check ;;
            3) clean_volumes ;;
            4) full_rebuild ;;
            5) edit_env ;;
            *) echo -e "${RED}Invalid choice${NC}" ;;
        esac

        if [ "$choice" != "0" ]; then
            read -p "Press Enter to continue..."
        fi
    done
}

# Main loop (interactive mode)
main_interactive() {
    check_prerequisites
    load_env

    while true; do
        show_header
        show_main_menu

        read -p "Choice [0-3]: " choice

        case $choice in
            0)
                echo -e "${GREEN}Goodbye!${NC}"
                exit 0
                ;;
            1) handle_profile_management ;;
            2) handle_container_operations ;;
            3) handle_utilities ;;
            *) echo -e "${RED}Invalid choice${NC}"; sleep 1 ;;
        esac
    done
}

# Command-line interface
main() {
    local cmd=$1
    local arg=$2

    case $cmd in
        switch)
            if [ -z "$arg" ]; then
                echo -e "${RED}Error: Profile name required${NC}"
                echo -e "${YELLOW}Usage: $0 switch {local|dev|prod}${NC}"
                exit 1
            fi
            switch_profile "$arg"
            ;;
        status)
            show_profile_status
            ;;
        "")
            # No arguments - run interactive mode
            main_interactive
            ;;
        *)
            echo -e "${RED}Error: Unknown command '$cmd'${NC}"
            echo ""
            echo -e "${YELLOW}Usage:${NC}"
            echo -e "  ${GREEN}$0${NC}                    - Interactive mode"
            echo -e "  ${GREEN}$0 switch <profile>${NC}  - Switch profile (local|dev|prod)"
            echo -e "  ${GREEN}$0 status${NC}            - Show profile status"
            echo ""
            exit 1
            ;;
    esac
}

# Run main with command-line arguments
main "$@"
