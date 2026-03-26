#!/usr/bin/env bash
set -euo pipefail

# Safe deploy: never delete server-side runtime data/ files.
#
# Configuration (required):
#   DEPLOY_HOST   e.g. root@example.com or deploy@example.com
#   DEPLOY_TARGET e.g. /home/user/web/xmrpay.link/public_html
#
# Optional hardening:
#   DEPLOY_BACKUP_ENABLE=1        # 1=backup data before deploy, 0=disable
#   DEPLOY_BACKUP_KEEP=14         # number of backup archives to keep
#   DEPLOY_BACKUP_DIR=...         # remote backup folder
#   DEPLOY_DRY_RUN=0              # 1=rsync dry-run
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
BACKUP_ENABLE="${DEPLOY_BACKUP_ENABLE:-1}"
BACKUP_KEEP="${DEPLOY_BACKUP_KEEP:-14}"
BACKUP_DIR="${DEPLOY_BACKUP_DIR:-$TARGET/../backups/xmrpay-data}"
DRY_RUN="${DEPLOY_DRY_RUN:-0}"

if [[ -z "$HOST" || -z "$TARGET" ]]; then
  echo "Missing deploy configuration." >&2
  echo "Set DEPLOY_HOST and DEPLOY_TARGET (env vars or scripts/.deploy.env)." >&2
  exit 1
fi

if [[ "$BACKUP_ENABLE" == "1" ]]; then
  echo "Creating remote pre-deploy data backup..."
  ssh "$HOST" "
    set -euo pipefail
    TARGET='$TARGET'
    DATA_DIR=\"\$TARGET/data\"
    BACKUP_DIR='$BACKUP_DIR'
    KEEP='$BACKUP_KEEP'

    mkdir -p \"\$BACKUP_DIR\"
    if [ -d \"\$DATA_DIR\" ]; then
      TS=\$(date +%Y%m%d-%H%M%S)
      ARCHIVE=\"\$BACKUP_DIR/data-\$TS.tgz\"
      tar -C \"\$TARGET\" -czf \"\$ARCHIVE\" data
      echo \"backup_created=\$ARCHIVE\"

      COUNT=0
      for FILE in \$(ls -1t \"\$BACKUP_DIR\"/data-*.tgz 2>/dev/null || true); do
        COUNT=\$((COUNT + 1))
        if [ \"\$COUNT\" -gt \"\$KEEP\" ]; then
          rm -f \"\$FILE\"
        fi
      done
    else
      echo \"backup_skipped=no_data_dir\"
    fi
  "
else
  echo "Skipping pre-deploy backup (DEPLOY_BACKUP_ENABLE=0)."
fi

RSYNC_DRY_RUN=""
if [[ "$DRY_RUN" == "1" ]]; then
  RSYNC_DRY_RUN="--dry-run"
  echo "Running in dry-run mode (DEPLOY_DRY_RUN=1)."
fi

rsync -avz --delete \
  ${RSYNC_DRY_RUN} \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'data/' \
  ./ "$HOST:$TARGET"

echo "Deploy complete (data/ preserved)."
