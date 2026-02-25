#!/usr/bin/env bash
# Daily DB Backup — Austria Imperial Green Gold
#
# Erstellt einen pg_dump der Neon-Datenbank und speichert ihn
# auf dem VPS unter /opt/backups/aigg/.
#
# Retention: 14 Tage (ältere Backups werden gelöscht)
#
# Setup: Crontab auf VPS:
#   0 3 * * * /opt/austria-imperial-website/scripts/backup-db.sh
#
# Benötigt: POSTGRES_URL in /root/.env.aigg oder als Env-Variable

set -euo pipefail

BACKUP_DIR="/opt/backups/aigg"
RETENTION_DAYS=14
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/aigg_${DATE}.sql.gz"

# Load env if exists
if [ -f /root/.env.aigg ]; then
  source /root/.env.aigg
fi

if [ -z "${POSTGRES_URL:-}" ]; then
  echo "[Backup] ERROR: POSTGRES_URL not set"
  exit 1
fi

# Create backup dir
mkdir -p "$BACKUP_DIR"

# Dump and compress
echo "[Backup] Starting pg_dump → $BACKUP_FILE"
pg_dump "$POSTGRES_URL" --no-owner --no-privileges | gzip > "$BACKUP_FILE"

# Verify file exists and has content
SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null)
if [ "$SIZE" -lt 100 ]; then
  echo "[Backup] ERROR: Backup file too small ($SIZE bytes)"
  rm -f "$BACKUP_FILE"
  exit 1
fi

echo "[Backup] Success: $BACKUP_FILE ($SIZE bytes)"

# Cleanup old backups
echo "[Backup] Cleaning up backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "aigg_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete

echo "[Backup] Done."
