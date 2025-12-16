# Typus LITE v1.1.109

Complete snapshot release for LITE profile with profile switching system.


## What's Included

- Single-container architecture: nginx + backend + frontend (managed by supervisord)
- 3 deployment profiles: local, dev, prod
- Profile switching via manage.sh
- External MySQL database support (or embedded MySQL for local profile)
- All LITE modules pre-installed:
  - Backend: 17 modules (auth, cms, crm, email, newsletter, storage, system, etc.)
  - Frontend: 13 modules (auth, cms, crm, file-manager, newsletter, routes, system, etc.)
- Database queue (no Redis required)
- Installation scripts (install.sh, quickstart.sh)
- Workspace dependencies fixed for npm compatibility

## Deployment Profiles

**Local Mode** (laptop/desktop):
- Uses docker-compose.local.yml
- Embedded MySQL container (no external database needed)
- Direct port access: http://localhost:3000
- No Traefik reverse proxy required

**Dev Mode** (development server):
- Uses docker-compose.dev.yml
- Hot reload with bind mounts
- External MySQL + Traefik
- Access via domain with HTTPS

**Production Mode** (production server):
- Uses docker-compose.prod.yml
- Standalone image with embedded code
- External MySQL + Traefik
- Optimized for performance

	## Quick Start
	
	```bash
	# Option A: GitHub clone (recommended)
	git clone https://github.com/typus-dev/typus.git
	cd typus
	
	# Option B: Release archive
	# mkdir typus && tar -xzf lite-complete-1.1.109.tar.gz -C typus
	# cd typus
	
	# Zero-config localhost (recommended)
	# No external DB, no Traefik, no .env required
	docker compose up -d --build

# Open:
#   http://localhost:3000
# Login (local defaults):
#   admin@localhost / admin12345

# Reset everything (removes DB/uploads/cache):
#   docker compose down -v
```

	## Manual Installation
	
	1. Extract and configure:
	   ```bash
	   mkdir typus && tar -xzf lite-complete-1.1.109.tar.gz -C typus
	   cd typus
	   cp .env.example .env
	   # Edit .env for your database and secrets
	   ```

2. Choose and activate a profile:
   ```bash
   # For laptop/desktop (embedded MySQL):
   ./manage.sh switch local

   # For development server (external MySQL + hot reload):
   ./manage.sh switch dev

   # For production server (external MySQL):
   ./manage.sh switch prod
   ```

3. Install dependencies and start:
   ```bash
   cd @typus-core/backend && npm install --production && cd ..
   docker compose up -d
   ```

   Note: Database migrations run automatically on first container start.

## Profile Management

```bash
# Switch between profiles
./manage.sh switch local   # Localhost mode
./manage.sh switch dev     # Development mode
./manage.sh switch prod    # Production mode

# Check current profile
./manage.sh status

# Interactive menu
./manage.sh
```

Profile switching:
- Backs up current .env and docker-compose.yml
- Copies profile files to active names
- Requires container restart: `docker compose down && docker compose up -d`

## Requirements

- Docker & Docker Compose
- MySQL 8.0+ (external or use local profile with embedded MySQL)
- Node.js 18+ and npm
- 512MB+ RAM
- ~500MB disk space

## Package Type

This is a **STANDARD** snapshot:
- Requires npm install during setup
- Smaller download size
- Uses file: protocol for local modules
- Best for bandwidth-limited scenarios

## Generated: 2025-12-16T05:19:19.710Z
