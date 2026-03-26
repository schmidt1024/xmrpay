#!/usr/bin/env bash
set -euo pipefail

# Restore runtime data/ from remote backup archives created by deploy.sh
#
# Usage:
#   ./scripts/restore-data.sh --latest
#   ./scripts/restore-data.sh --file data-20260326-120000.tgz
#   ./scripts/restore-data.sh --list
#
# Config (env vars or scripts/.deploy.env):
#   DEPLOY_HOST
#   DEPLOY_TARGET
#   DEPLOY_BACKUP_DIR (optional, defaults to ../backups/xmrpay-data)

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.deploy.env"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

HOST="${DEPLOY_HOST:-}"
TARGET="${DEPLOY_TARGET:-}"
BACKUP_DIR="${DEPLOY_BACKUP_DIR:-$TARGET/../backups/xmrpay-data}"

if [[ -z "$HOST" || -z "$TARGET" ]]; then
  echo "Missing configuration." >&2
  echo "Set DEPLOY_HOST and DEPLOY_TARGET (env vars or scripts/.deploy.env)." >&2
  exit 1
fi

MODE=""
ARCHIVE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --latest)
      MODE="latest"
      shift
      ;;
    --file)
      MODE="file"
      ARCHIVE="${2:-}"
      shift 2
      ;;
    --list)
      MODE="list"
      shift
      ;;
    -h|--help)
      MODE="help"
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$MODE" || "$MODE" == "help" ]]; then
  sed -n '1,20p' "$0"
  exit 0
fi

if [[ "$MODE" == "list" ]]; then
  ssh "$HOST" "ls -1t '$BACKUP_DIR'/data-*.tgz 2>/dev/null || true"
  exit 0
fi

if [[ "$MODE" == "latest" ]]; then
  ARCHIVE="$(ssh "$HOST" "ls -1t '$BACKUP_DIR'/data-*.tgz 2>/dev/null | head -n 1")"
  if [[ -z "$ARCHIVE" ]]; then
    echo "No backup archives found in $BACKUP_DIR" >&2
    exit 1
  fi
fi

if [[ "$MODE" == "file" ]]; then
  if [[ -z "$ARCHIVE" ]]; then
    echo "--file requires an archive name" >&2
    exit 1
  fi
  ARCHIVE="$BACKUP_DIR/$ARCHIVE"
fi

echo "Restoring data from: $ARCHIVE"
ssh "$HOST" "
  set -euo pipefail
  TARGET='$TARGET'
  DATA_DIR=\"\$TARGET/data\"
  ARCHIVE='$ARCHIVE'

  if [ ! -f \"\$ARCHIVE\" ]; then
    echo 'Backup archive not found: '\"\$ARCHIVE\" >&2
    exit 1
  fi

  TS=\$(date +%Y%m%d-%H%M%S)
  SAFETY=\"\$TARGET/../backups/xmrpay-data/pre-restore-\$TS.tgz\"
  mkdir -p \"\$(dirname \"\$SAFETY\")\"

  if [ -d \"\$DATA_DIR\" ]; then
    tar -C \"\$TARGET\" -czf \"\$SAFETY\" data
    rm -rf \"\$DATA_DIR\"
  fi

  tar -C \"\$TARGET\" -xzf \"\$ARCHIVE\"
  echo \"restore_ok=\$ARCHIVE\"
  echo \"safety_backup=\$SAFETY\"
"

echo "Restore complete."
