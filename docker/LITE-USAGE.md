# LITE Profile Usage Guide

**Created:** 2025-10-18
**Profile:** LITE (All-in-One Container)

---

## Overview

LITE profile consolidates the entire Typus application into a single Docker container:
- **Nginx** (port 80) - Reverse proxy & static file serving
- **Backend** (port 3001) - Express.js API
- **Frontend** (built static files) - Vue.js SPA
- **HTML Cache Generator** (port 3002) - Puppeteer service

**External Dependencies:**
- MySQL (via `common-mysql-shared` network)
- Traefik (for HTTPS routing)

---

## Quick Start

### 1. Build the Container

```bash
# Navigate to your project directory
cd /path/to/typus

# Build the image
docker compose -f docker-compose.lite.yml build
```

### 2. Start the Container

```bash
# Start in detached mode
docker compose -f docker-compose.lite.yml up -d

# Or start with logs
docker compose -f docker-compose.lite.yml up
```

### 3. Check Status

```bash
# View running containers
docker compose -f docker-compose.lite.yml ps

# View logs
docker compose -f docker-compose.lite.yml logs -f

# Check health
docker compose -f docker-compose.lite.yml exec typus_lite curl http://localhost/health
```

### 4. Stop the Container

```bash
docker compose -f docker-compose.lite.yml down
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│  LITE Container (Port 80)        │
│  ┌────────────────────────────────────┐ │
│  │ Supervisord (Process Manager)     │ │
│  └────────────────────────────────────┘ │
│                                         │
│  ┌────────────────────────────────────┐ │
│  │ Nginx (Port 80)                   │ │
│  │ - Serve /app/@typus-core/frontend/dist │
│  │ - Proxy /api/* → localhost:3001  │ │
│  │ - Proxy /api/html-cache-generator/* → localhost:3002 │
│  └────────────────────────────────────┘ │
│                ↓                         │
│  ┌────────────────────────────────────┐ │
│  │ Backend (Port 3001)               │ │
│  │ - Express.js API                  │ │
│  │ - Database queue worker           │ │
│  │ - WebSocket support               │ │
│  └────────────────────────────────────┘ │
│                                         │
│  ┌────────────────────────────────────┐ │
│  │ HTML Cache Generator (Port 3002)  │ │
│  │ - Puppeteer service               │ │
│  │ - Static HTML caching             │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
          ↓
┌─────────────────────┐
│ MySQL (External)    │
│ common-mysql-shared │
└─────────────────────┘
```

---

## File Structure

```
/path/to/typus/
├── docker/
│   ├── Dockerfile.lite         # Main Dockerfile
│   ├── supervisord.conf               # Process manager config
│   ├── nginx/
│   │   └── nginx-lite.conf    # Nginx configuration
│   └── LITE-USAGE.md          # This file
├── docker-compose.lite.yml            # Docker Compose file
├── .dockerignore                      # Docker build exclusions
└── @typus-core/
    ├── backend/
    ├── frontend/
    ├── html-cache-generator/          # HTML cache generator
    └── shared/
```

---

## Configuration

### Environment Variables

The container uses `.env.lite` file. Key variables:

```bash
# Database
DATABASE_URL=mysql://user:password@host:3306/database
DB_PROVIDER=mysql

# Domain
APP_DOMAIN=your-domain.com

# Queue System (LITE profile)
QUEUE_DRIVER=database
SESSION_STORAGE_DRIVER=database
CACHE_DRIVER=database
REDIS_ENABLED=false
DISPATCHER_ENABLED=false

# Node Environment
NODE_ENV=production

# Ports (internal)
PORT=3001
CACHE_GENERATOR_PORT=3002
```

### Nginx Configuration

Location: `docker/nginx/nginx-lite.conf`

Key features:
- Static file serving from `/app/@typus-core/frontend/dist`
- API proxy to `localhost:3001`
- Cache generator proxy to `localhost:3002`
- HTML cache from `/app/storage/cache/html`
- WebSocket support for `/ws`
- Health check endpoint `/health`

### Supervisord Configuration

Location: `docker/supervisord.conf`

Manages three processes:
1. **nginx** - Priority 10 (starts first)
2. **backend** - Priority 20
3. **html-cache-generator** - Priority 30

All processes configured for:
- Auto-start on container boot
- Auto-restart on failure
- Logs to stdout/stderr (captured by Docker)

---

## Troubleshooting

### Check Individual Services

```bash
# Enter container
docker compose -f docker-compose.lite.yml exec typus_lite bash

# Check supervisord status
supervisorctl status

# Restart individual service
supervisorctl restart backend
supervisorctl restart nginx
supervisorctl restart html-cache-generator

# View service logs
supervisorctl tail backend
supervisorctl tail nginx
supervisorctl tail html-cache-generator
```

### Check Nginx

```bash
# Test nginx configuration
docker compose -f docker-compose.lite.yml exec typus_lite nginx -t

# Reload nginx
docker compose -f docker-compose.lite.yml exec typus_lite nginx -s reload
```

### Check Backend

```bash
# Test backend API
curl http://localhost:3001/api/health

# From host (through nginx)
curl http://localhost/api/health
```

### View Logs

```bash
# All services
docker compose -f docker-compose.lite.yml logs -f

# Specific container
docker logs -f lite_typus_dev_lite_single

# Last 100 lines
docker compose -f docker-compose.lite.yml logs --tail=100
```

---

## Resource Usage

### Expected Resources
- **Memory:** 1.5-2GB total
  - Nginx: ~50-100MB
  - Backend: ~200-400MB
  - Cache Generator: ~500-800MB (Puppeteer)
  - Supervisor: ~10-20MB

- **CPU:** 1-2 cores recommended
  - Idle: 5-10% utilization
  - Under load: varies

- **Disk:** ~1GB for image

### Setting Resource Limits

Edit `docker-compose.lite.yml`:

```yaml
services:
  typus_lite:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          memory: 1G
```

---

## Upgrading

### Rebuild After Code Changes

```bash
# Rebuild and restart
docker compose -f docker-compose.lite.yml up -d --build

# Force rebuild (no cache)
docker compose -f docker-compose.lite.yml build --no-cache
docker compose -f docker-compose.lite.yml up -d
```

---

## Advantages vs Multi-Container

✅ **Pros:**
- Single deployment unit
- Simpler management
- Lower memory overhead
- Faster cold starts
- No inter-container networking complexity

❌ **Cons:**
- Cannot scale services independently
- All services fail together
- More complex debugging
- Violates "one process per container" principle

---

## When to Use LITE

**✅ Recommended for:**
- Development environments
- Small production sites (<1000 users)
- Resource-constrained servers
- Simple deployment requirements
- Testing and staging

**❌ Not recommended for:**
- High-traffic production (>1000 users)
- Sites requiring independent service scaling
- Environments needing zero-downtime deployments
- Complex microservices architectures

---

## Migration Path

### From LITE (2 containers) to LITE (1 container)

```bash
# 1. Stop existing containers
docker compose down

# 2. Backup data
cp -r storage storage.backup

# 3. Start LITE
docker compose -f docker-compose.lite.yml up -d

# 4. Verify
docker compose -f docker-compose.lite.yml ps
docker compose -f docker-compose.lite.yml logs -f
```

### From LITE to FULL (8 containers)

Update environment variables and use FULL profile docker-compose.yml

---

## Support

For issues or questions:
- Check logs: `docker compose -f docker-compose.lite.yml logs`
- Review nginx config: `docker/nginx/nginx-lite.conf`
- Review supervisord config: `docker/supervisord.conf`
- See architectural analysis: `work-log/investigations/2025-10-18_single-container-architecture-feasibility.md`

---

**Last Updated:** 2025-10-18
