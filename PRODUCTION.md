# Typus — Production Install Guide

This guide covers a **domain + HTTPS** deployment using:
- **Traefik** (TLS/Let's Encrypt) on the `traefik-net` Docker network
- **External MySQL** on the `common-mysql-shared` Docker network
- Typus **LITE single-app container** (`typus_lite`)

If you only want localhost: use `docker compose up` from `README.md` instead.

---

## What you deploy

- `typus_lite` — one container: nginx + backend + frontend (via `supervisord`)
- MySQL — external (managed DB or your own MySQL container)
- Traefik — external reverse proxy that terminates TLS

`docker-compose.prod.yml` expects these **external** networks to exist:
- `traefik-net`
- `common-mysql-shared`

---

## Preflight checklist

### 1) Server & OS
- Docker Engine + Docker Compose plugin installed (`docker compose version`)
- Ports **80** and **443** are reachable from the internet
- Enough disk for: Docker images + `storage/` + DB backups

### 2) DNS
- Create an `A`/`AAAA` record: `your-domain.com` → your server IP
- Wait until `dig your-domain.com` resolves to the correct IP

### 3) Docker networks

```bash
docker network create traefik-net 2>/dev/null || true
docker network create common-mysql-shared 2>/dev/null || true
```

### 4) Traefik (must match labels)

Your Traefik must provide:
- entrypoint named **`https`** on `:443`
- a cert resolver named **`letsEncrypt`**
- attached to the Docker network **`traefik-net`**

Minimal example (adjust email + paths):

```yaml
# traefik.compose.yml
services:
  traefik:
    image: traefik:v3.1
    command:
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --entrypoints.http.address=:80
      - --entrypoints.https.address=:443
      - --certificatesresolvers.letsEncrypt.acme.email=you@your-domain.com
      - --certificatesresolvers.letsEncrypt.acme.storage=/letsencrypt/acme.json
      - --certificatesresolvers.letsEncrypt.acme.httpchallenge=true
      - --certificatesresolvers.letsEncrypt.acme.httpchallenge.entrypoint=http
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt
    networks:
      - traefik-net

networks:
  traefik-net:
    external: true
```

Start it:

```bash
docker compose -f traefik.compose.yml up -d
```

---

## MySQL options

### Option A: Managed MySQL (recommended)

Set in Typus env:
- `DB_HOST` = DB hostname (reachable from Docker)
- `DB_PORT` = `3306`
- `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `DB_PROVIDER=mysql`

Even with a managed DB, keep `common-mysql-shared` created (or remove it from `docker-compose.prod.yml`) because the production compose attaches the app container to that network.

### Option B: MySQL on the same host (Docker)

Minimal MySQL container attached to `common-mysql-shared`:

```bash
docker run -d --name common-mysql \
  --restart unless-stopped \
  --network common-mysql-shared \
  -e MYSQL_ROOT_PASSWORD='change_me_root_password' \
  -e MYSQL_DATABASE='typus_lite_db' \
  mysql:8.0
```

Then use:
- `DB_HOST=common-mysql`
- `DB_PORT=3306`

---

## Install Typus (recommended: interactive)

```bash
git clone https://github.com/typus-dev/typus.git
cd typus
./setup/install.sh
```

What `install.sh` does:
- asks for domain + MySQL credentials
- generates secrets and creates `.env.local`, `.env.dev`, `.env.prod`
- activates production (`.env` + `docker-compose.yml` from `docker-compose.prod.yml`)
- runs `docker compose up -d --build --wait`

Verify:

```bash
curl -fsS https://your-domain.com/api/health
```

---

## Install Typus (manual)

1) Create production env file:

```bash
cp .env.example .env.prod
${EDITOR:-nano} .env.prod
```

2) Switch profile:

```bash
./manage.sh switch prod
```

3) Start:

```bash
docker compose up -d --build
```

---

## Backups

You should back up **both**:
- `storage/` (uploads, cache, backups)
- MySQL database

### Using the built-in updater (creates backups)

`setup/update.sh` creates:
- `storage/backups/site_*.tar.gz` (site, excluding uploads)
- `storage/backups/<db>_*.sql.gz` (database dump)

Note: `setup/update.sh` is designed for installs that update from **release archives** (it expects a releases directory or `TYPUS_RELEASE_DIR`). If you installed from `git clone` and don’t have release archives yet, use the manual backup commands below.

Run:

```bash
./setup/update.sh
```

### Manual backups (works everywhere)

```bash
# 1) Files (uploads/config/cache)
tar -czf storage-backup_$(date +%Y-%m-%d_%H-%M-%S).tar.gz storage

# 2) Database
MYSQL_PWD='<password>' mysqldump -h <host> -P <port> -u <user> <db> | gzip > db-backup_$(date +%Y-%m-%d_%H-%M-%S).sql.gz
```

### Restoring database from a `.sql.gz`

```bash
gunzip -c storage/backups/<db>_<timestamp>.sql.gz | MYSQL_PWD='<password>' mysql -h <host> -P <port> -u <user> <db>
```

---

## Rollback (basic)

1) Stop current containers:

```bash
docker compose down
```

2) Restore site backup (if you have one):

```bash
tar -xzf storage/backups/site_<timestamp>.tar.gz -C ..
```

3) Restore DB backup (optional, if schema/data changed).

4) Start again:

```bash
docker compose up -d --build
```

---

## Common issues

- **Traefik error / 404 / no TLS:** check DNS points to server, Traefik has `https` entrypoint and `letsEncrypt` resolver, and Typus container is on `traefik-net`.
- **Network not found:** create `traefik-net` and `common-mysql-shared` with `docker network create ...`.
- **DB connection error:** verify `DB_HOST/DB_USER/DB_PASSWORD/DB_NAME` and that MySQL is reachable from Docker.
