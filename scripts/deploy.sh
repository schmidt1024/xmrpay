#!/usr/bin/env bash
set -euo pipefail

# Safe deploy: never delete server-side runtime data/ files.
#
# Configuration (required):
#   DEPLOY_HOST   e.g. root@example.com or deploy@example.com
#   DEPLOY_TARGET e.g. /home/user/web/xmrpay.link/public_html
#
# Optional local config file (not committed):
#   scripts/.deploy.env

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.deploy.env"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

HOST="${DEPLOY_HOST:-}"
TARGET="${DEPLOY_TARGET:-}"

if [[ -z "$HOST" || -z "$TARGET" ]]; then
  echo "Missing deploy configuration." >&2
  echo "Set DEPLOY_HOST and DEPLOY_TARGET (env vars or scripts/.deploy.env)." >&2
  exit 1
fi

rsync -avz --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'data/' \
  ./ "$HOST:$TARGET"

echo "Deploy complete (data/ preserved)."
