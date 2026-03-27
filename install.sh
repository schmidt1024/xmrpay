#!/bin/sh
set -e

# xmrpay.link — Self-hosting installer
# Usage: curl -sL https://xmrpay.link/install.sh | sh -s your-domain.com

DOMAIN="${1:-}"
INSTALL_DIR="/opt/xmrpay"
IMAGE="schmidt1024/xmrpay:latest"
COMPOSE_URL="https://raw.githubusercontent.com/schmidt1024/xmrpay/master/docker-compose.yml"

# ── Helpers ───────────────────────────────────────────────────────────────────

info()  { printf '\033[1;34m→\033[0m %s\n' "$1"; }
ok()    { printf '\033[1;32m✓\033[0m %s\n' "$1"; }
fail()  { printf '\033[1;31m✗\033[0m %s\n' "$1" >&2; exit 1; }

# ── Preflight ─────────────────────────────────────────────────────────────────

[ "$(id -u)" -eq 0 ] || fail "Run as root: curl -sL https://xmrpay.link/install.sh | sudo sh -s $DOMAIN"
[ -n "$DOMAIN" ]      || fail "Usage: curl -sL https://xmrpay.link/install.sh | sh -s YOUR-DOMAIN.COM"

# ── Install Docker if missing ─────────────────────────────────────────────────

if ! command -v docker >/dev/null 2>&1; then
  info "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
  ok "Docker installed"
else
  ok "Docker found"
fi

# ── Set up xmrpay ────────────────────────────────────────────────────────────

info "Setting up xmrpay in $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

curl -fsSL "$COMPOSE_URL" -o docker-compose.yml

cat > .env <<EOF
DOMAIN=$DOMAIN
XMRPAY_IMAGE=$IMAGE
EOF

# ── Start ─────────────────────────────────────────────────────────────────────

info "Starting xmrpay..."
docker compose pull
docker compose up -d

ok "xmrpay is running!"
echo ""
echo "  https://$DOMAIN"
echo ""
echo "  Watchtower checks for updates every 6 hours."
echo "  Data stored in Docker volume: xmrpay-data"
echo "  Config: $INSTALL_DIR/.env"
echo ""
