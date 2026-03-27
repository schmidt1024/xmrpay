#!/bin/sh
set -e

# Start PHP-FPM in background
php-fpm &

# Run Caddy in foreground
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
