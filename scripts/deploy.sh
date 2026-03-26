#!/usr/bin/env bash
set -euo pipefail

# Safe deploy: never delete server-side runtime data/ files.
HOST="root@REDACTED"
TARGET="/home/REDACTED/public_html"

rsync -avz --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'data/' \
  ./ "$HOST:$TARGET"

echo "Deploy complete (data/ preserved)."
