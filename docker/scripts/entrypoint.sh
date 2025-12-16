#!/usr/bin/env bash
set -euo pipefail

# Ensure group-writable files by default (shared host editing).
umask 0002

# We don't try to match host UID here: backend runs as appuser inside container.
# Shared group for bind-mounted runtime data can be overridden via APP_GID (defaults to appgroup).
SHARED_GROUP="${APP_GROUP_NAME:-appgroup}"

fix_path_perms() {
  local path="$1"
  [ -e "$path" ] || return 0

  # Keep owner intact (don't chown bind mounts), only enforce group + group write.
  chgrp -R "$SHARED_GROUP" "$path" 2>/dev/null || true
  chmod -R g+rwX "$path" 2>/dev/null || true
  find "$path" -type d -exec chmod g+s {} + 2>/dev/null || true
}

fix_file_perms() {
  local path="$1"
  [ -e "$path" ] || return 0

  chgrp "$SHARED_GROUP" "$path" 2>/dev/null || true
  chmod g+rw "$path" 2>/dev/null || true
}

# Bind-mounted runtime data (host-visible)
fix_path_perms /app/storage
fix_path_perms /app/logs

# Allow backend to update manifest flags (migrations_applied, etc) without making /app writable.
fix_file_perms /app/typus-manifest.json

# Backend logger expects this directory; ensure it exists and is writable for appuser/appgroup.
mkdir -p /app/@typus-core/backend/logs 2>/dev/null || true
fix_path_perms /app/@typus-core/backend/logs

exec "$@"
