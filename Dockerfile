FROM php:8.3-fpm-alpine AS base

# Install PHP curl extension (needed for API proxies)
RUN apk add --no-cache caddy curl-dev \
    && docker-php-ext-install curl \
    && rm -rf /var/cache/apk/*

# PHP-FPM tuning for low-memory VPS
RUN { \
      echo '[www]'; \
      echo 'pm = ondemand'; \
      echo 'pm.max_children = 8'; \
      echo 'pm.process_idle_timeout = 60s'; \
    } > /usr/local/etc/php-fpm.d/zz-tuning.conf

# App files
COPY index.html privacy.html style.css sw.js favicon.svg s.php /srv/
COPY app.min.js /srv/app.min.js
COPY i18n.min.js /srv/i18n.min.js
COPY api/ /srv/api/
COPY lib/ /srv/lib/
COPY fonts/ /srv/fonts/

# Writable data directory
RUN mkdir -p /srv/data && chown www-data:www-data /srv/data

# Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

# Entrypoint: start PHP-FPM + Caddy
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 80 443 8080

VOLUME ["/srv/data", "/data/caddy"]

ENTRYPOINT ["docker-entrypoint.sh"]
