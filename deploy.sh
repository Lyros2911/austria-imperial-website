#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/austria-imperial-website"
IMAGE="austria-imperial:latest"
CONTAINER="austria-imperial"
NETWORK="n8n_default"
CERTRESOLVER="mytlschallenge"
DOMAIN="austriaimperial.com"
DOMAIN_AT="austriaimperial.at"
WWW="www.austriaimperial.com"
WWW_AT="www.austriaimperial.at"

cd "$APP_DIR"

# Load env vars
if [ -f /root/.env.aigg ]; then
  set -a
  source /root/.env.aigg
  set +a
fi

echo "==> Build Docker image: $IMAGE"
docker build -t "$IMAGE" .

echo "==> Stop & remove old containers (if any)"
docker rm -f "$CONTAINER" 2>/dev/null || true
docker rm -f austria-imperial-web 2>/dev/null || true

echo "==> Run container behind Traefik"
docker run -d \
  --name "$CONTAINER" \
  --restart unless-stopped \
  --network "$NETWORK" \
  -e POSTGRES_URL="${POSTGRES_URL}" \
  -e AIRTABLE_TOKEN="${AIRTABLE_TOKEN}" \
  -e STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY}" \
  -e STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-}" \
  -e NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-}" \
  -e RESEND_API_KEY="${RESEND_API_KEY}" \
  -e AUTH_SECRET="${AUTH_SECRET:-}" \
  -e N8N_ORDER_WEBHOOK_URL="${N8N_ORDER_WEBHOOK_URL:-}" \
  -e CRON_SECRET="${CRON_SECRET:-}" \
  -e BASE_URL="${BASE_URL:-https://austriaimperial.com}" \
  -e KIENDLER_EMAIL="${KIENDLER_EMAIL:-}" \
  -e HERNACH_EMAIL="${HERNACH_EMAIL:-}" \
  -e AIRTABLE_PAT="${AIRTABLE_PAT:-}" \
  -e AIRTABLE_BASE_ID="${AIRTABLE_BASE_ID:-}" \
  \
  -l traefik.enable=true \
  \
  -l "traefik.http.routers.aigg.rule=Host(\`$DOMAIN\`)" \
  -l "traefik.http.routers.aigg.entrypoints=websecure" \
  -l "traefik.http.routers.aigg.tls=true" \
  -l "traefik.http.routers.aigg.tls.certresolver=$CERTRESOLVER" \
  -l "traefik.http.services.aigg.loadbalancer.server.port=3000" \
  \
  -l "traefik.http.routers.aigg-www.rule=Host(\`$WWW\`)" \
  -l "traefik.http.routers.aigg-www.entrypoints=websecure" \
  -l "traefik.http.routers.aigg-www.tls=true" \
  -l "traefik.http.routers.aigg-www.tls.certresolver=$CERTRESOLVER" \
  -l "traefik.http.routers.aigg-www.middlewares=aigg-www-redirect" \
  -l "traefik.http.middlewares.aigg-www-redirect.redirectregex.regex=^https://www\\.austriaimperial\\.com/(.*)" \
  -l "traefik.http.middlewares.aigg-www-redirect.redirectregex.replacement=https://austriaimperial.com/\${1}" \
  -l "traefik.http.middlewares.aigg-www-redirect.redirectregex.permanent=true" \
  \
  -l "traefik.http.routers.aigg-at.rule=Host(\`$DOMAIN_AT\`)" \
  -l "traefik.http.routers.aigg-at.entrypoints=websecure" \
  -l "traefik.http.routers.aigg-at.tls=true" \
  -l "traefik.http.routers.aigg-at.tls.certresolver=$CERTRESOLVER" \
  -l "traefik.http.routers.aigg-at.middlewares=aigg-at-redirect" \
  -l "traefik.http.middlewares.aigg-at-redirect.redirectregex.regex=^https://(?:www\\.)?austriaimperial\\.at/(.*)" \
  -l "traefik.http.middlewares.aigg-at-redirect.redirectregex.replacement=https://austriaimperial.com/\${1}" \
  -l "traefik.http.middlewares.aigg-at-redirect.redirectregex.permanent=true" \
  \
  -l "traefik.http.routers.aigg-www-at.rule=Host(\`$WWW_AT\`)" \
  -l "traefik.http.routers.aigg-www-at.entrypoints=websecure" \
  -l "traefik.http.routers.aigg-www-at.tls=true" \
  -l "traefik.http.routers.aigg-www-at.tls.certresolver=$CERTRESOLVER" \
  -l "traefik.http.routers.aigg-www-at.middlewares=aigg-at-redirect" \
  \
  "$IMAGE"

echo "==> Done."
echo "Test: curl -I https://$DOMAIN"
