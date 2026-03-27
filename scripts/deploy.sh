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

# ── Inject version from git tags ──────────────────────────────────────────────
GIT_VERSION=$(git describe --tags --always 2>/dev/null || echo "dev")
# Turn v1.0.0-3-gabc1234 into 1.0.0+3
VERSION=$(echo "$GIT_VERSION" | sed -E 's/^v//; s/-([0-9]+)-g[0-9a-f]+$/+\1/')
echo "Version: $VERSION"

sed -i -E "s|VERSION = '[^']*'|VERSION = '${VERSION}'|" i18n.js
sed -i -E "s|(<span class=\"version\">v)[^<]*(</span>)|\1${VERSION}\2|" index.html

# ── Minify & update SRI hashes ────────────────────────────────────────────────
echo "Minifying JS..."
TERSER="${TERSER:-terser}"
if ! command -v "$TERSER" &>/dev/null; then
  echo "Error: terser not found. Install with: npm i -g terser" >&2
  exit 1
fi
"$TERSER" app.js  -c -m -o app.min.js
"$TERSER" i18n.js -c -m -o i18n.min.js

echo "Updating SRI hashes..."
sri_hash() { echo "sha384-$(openssl dgst -sha384 -binary "$1" | openssl base64 -A)"; }

HASH_STYLE=$(sri_hash style.css)
HASH_QRCODE=$(sri_hash lib/qrcode.min.js)
HASH_I18N=$(sri_hash i18n.min.js)
HASH_APP=$(sri_hash app.min.js)
HASH_JSPDF=$(sri_hash lib/jspdf.min.js)
HASH_CRYPTO=$(sri_hash lib/xmr-crypto.bundle.js)

# Update index.html SRI attributes
sed -i -E \
  -e "s|(style\.css[^\"]*\"\s+integrity=\")sha384-[A-Za-z0-9+/=]+|\1${HASH_STYLE}|" \
  -e "s|(qrcode\.min\.js[^\"]*\"\s+integrity=\")sha384-[A-Za-z0-9+/=]+|\1${HASH_QRCODE}|" \
  -e "s|(i18n\.min\.js[^\"]*\"\s+integrity=\")sha384-[A-Za-z0-9+/=]+|\1${HASH_I18N}|" \
  -e "s|(app\.min\.js[^\"]*\"\s+integrity=\")sha384-[A-Za-z0-9+/=]+|\1${HASH_APP}|" \
  index.html

# Update privacy.html SRI attributes
sed -i -E \
  -e "s|(style\.css[^\"]*\"\s+integrity=\")sha384-[A-Za-z0-9+/=]+|\1${HASH_STYLE}|" \
  privacy.html

# Update dynamic SRI hashes in app.js and re-minify if changed
sed -i -E \
  -e "s|(jspdf\.min\.js.*integrity\s*=\s*')sha384-[A-Za-z0-9+/=]+|\1${HASH_JSPDF}|" \
  -e "s|(xmr-crypto\.bundle\.js.*integrity\s*=\s*')sha384-[A-Za-z0-9+/=]+|\1${HASH_CRYPTO}|" \
  app.js

# Re-minify app.js (dynamic SRI hashes may have changed)
"$TERSER" app.js -c -m -o app.min.js
HASH_APP_FINAL=$(sri_hash app.min.js)
sed -i -E "s|(app\.min\.js[^\"]*\"\s+integrity=\")sha384-[A-Za-z0-9+/=]+|\1${HASH_APP_FINAL}|" index.html

echo "SRI hashes updated."

RSYNC_DRY_RUN=""
if [[ "$DRY_RUN" == "1" ]]; then
  RSYNC_DRY_RUN="--dry-run"
  echo "Running in dry-run mode (DEPLOY_DRY_RUN=1)."
fi

rsync -avz --delete --chmod=D755,F644 \
  ${RSYNC_DRY_RUN} \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'data/' \
  --exclude 'scripts/.deploy.env' \
  ./ "$HOST:$TARGET"

echo "Deploy complete (data/ preserved)."
