# LITE-SINGLE Docker Configuration

**Created:** 2025-10-18
**Profile:** LITE-SINGLE (All-in-One Container)

---

## Overview

LITE-SINGLE profile combines backend + frontend + nginx into a single Docker container:
- **nginx** (port 80) - Reverse proxy & static file serving
- **backend** (port 3001) - tsx runtime (NO compilation!)
- **frontend** (built static files) - Vue.js SPA

**Key difference from standard LITE:**
- Standard LITE: 2 containers (backend + frontend)
- LITE-SINGLE: 1 container (all services via supervisord)

---

## Files

```
docker/
├── Dockerfile.lite-single          # Main Dockerfile
├── supervisord.conf                # Process manager (nginx + backend)
├── nginx/
│   └── nginx-lite-single.conf     # Nginx reverse proxy config
├── docker-compose.lite-single.yml  # Docker Compose file
└── USAGE.md                        # This file
```

---

## How to Use

### 1. Build the Container

```bash
# Navigate to your project directory
cd /path/to/typus-lite

# Build from docker/ directory
docker compose -f docker/docker-compose.lite-single.yml build
```

### 2. Start the Container

```bash
# Start in detached mode
docker compose -f docker/docker-compose.lite-single.yml up -d

# Or start with logs
docker compose -f docker/docker-compose.lite-single.yml up
```

### 3. Check Status

```bash
# View container
docker compose -f docker/docker-compose.lite-single.yml ps

# View logs
docker compose -f docker/docker-compose.lite-single.yml logs -f

# Check health
curl http://localhost/health
```

### 4. Stop the Container

```bash
docker compose -f docker/docker-compose.lite-single.yml down
```

---

## Architecture

```
┌─────────────────────────────────────┐
│  Container: typus_lite_single       │
│                                     │
│  supervisord (process manager)      │
│  ├─ nginx (port 80)                │
│  │  ├─ Serve static files          │
│  │  ├─ Proxy /api → :3001          │
│  │  └─ Proxy /storage → :3001      │
│  └─ backend (port 3001)            │
│     └─ tsx server.ts (NO compile!) │
└─────────────────────────────────────┘
          ↓
┌─────────────────────┐
│ MySQL (External)    │
│ common-mysql-shared │
└─────────────────────┘
```

---

## Key Technical Decisions

### 1. tsx Runtime (NO TypeScript Compilation)

**Why:**
- Project philosophy: "tsx acceptable for <1000 users"
- Simpler deployment (no build step)
- Consistent with production approach
- See: `/work-log/investigations/2025-10-18_production-build-tsx-vs-compile.md`

**How it works:**
```dockerfile
# Install tsx globally
RUN npm install -g tsx

# Copy SOURCE .ts files (NOT compiled)
COPY @typus-core/backend @typus-core/backend

# Run with tsx
CMD ["tsx", "server.ts"]
```

### 2. Multi-Stage Build (Frontend Only)

**Stage 1:** Build frontend (pnpm run build)
**Stage 2:** Runtime (nginx + tsx backend)

Backend is NOT compiled - runs with tsx in runtime stage.

### 3. Supervisord Process Manager

**Why supervisord:**
- Standard solution for multi-process containers
- Simple configuration
- Auto-restart on failure
- Log aggregation

**Processes:**
- nginx (priority 10) - starts first
- backend (priority 20) - starts after nginx

---

## Environment Variables

```bash
# Database
DATABASE_URL=mysql://user:password@host:3306/database
DB_PROVIDER=mysql

# Domain
APP_DOMAIN=your-domain.com

# LITE Profile (database-based queues)
QUEUE_DRIVER=database
SESSION_STORAGE_DRIVER=database
CACHE_DRIVER=database
REDIS_ENABLED=false
DISPATCHER_ENABLED=false

# Node
NODE_ENV=production
PORT=3001
```

---

## Troubleshooting

### Check Individual Services

```bash
# Enter container
docker exec -it lite_typus_dev_lite_single bash

# Check supervisord status
supervisorctl status

# Restart services
supervisorctl restart nginx
supervisorctl restart backend

# View logs
supervisorctl tail backend
supervisorctl tail nginx
```

### Test Backend Directly

```bash
# From inside container
curl http://localhost:3001/api/health

# From host (through nginx)
curl http://localhost/health
```

### Common Issues

**1. Frontend not loading:**
- Check if frontend was built: `ls /app/@typus-core/frontend/dist`
- Check nginx config: `nginx -t`

**2. Backend not starting:**
- Check tsx is installed: `which tsx`
- Check backend logs: `supervisorctl tail backend`
- Verify tsconfig.json exists: `ls /app/tsconfig.json`

**3. Database connection:**
- Check DATABASE_URL environment variable
- Verify MySQL container is running
- Check network: `common-mysql-shared`

---

## Comparison: LITE vs LITE-SINGLE

| Feature | LITE (2 containers) | LITE-SINGLE (1 container) |
|---------|-------------------|------------------------|
| Backend | Separate container | Inside single container |
| Frontend | Separate container | Inside single container |
| Nginx | In frontend container | Inside single container |
| Process manager | Docker Compose | Supervisord |
| Networking | Inter-container | Localhost |
| Complexity | Lower | Higher |
| Resource usage | Higher | Lower |
| Scaling | Can scale separately | Scale all together |

---

## When to Use LITE-SINGLE

**✅ Recommended for:**
- Development/staging environments
- Small production (<100 users)
- Resource-constrained servers
- Simple deployment needs

**❌ Not recommended for:**
- Production >100 users
- Need to scale backend independently
- Zero-downtime deployments
- High availability requirements

---

## Limitations

1. **No independent scaling** - backend and frontend scale together
2. **Single point of failure** - if container fails, all services down
3. **No html-cache-generator** - removed for simplicity
4. **Violates Docker best practices** - "one process per container"

---

## Migration

### From LITE (2 containers) to LITE-SINGLE (1 container)

```bash
# 1. Stop existing containers
docker compose down

# 2. Start LITE-SINGLE
docker compose -f docker/docker-compose.lite-single.yml up -d

# 3. Verify
docker compose -f docker/docker-compose.lite-single.yml ps
docker compose -f docker/docker-compose.lite-single.yml logs -f
```

### From LITE-SINGLE back to LITE

```bash
# 1. Stop LITE-SINGLE
docker compose -f docker/docker-compose.lite-single.yml down

# 2. Start standard LITE
docker compose up -d
```

---

**Last Updated:** 2025-10-18
**Status:** Experimental
