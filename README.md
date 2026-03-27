# xmrpay — Monero Invoice Generator

> Create Monero payment requests in seconds. No accounts. No tracking. No KYC.

**[Demo: xmrpay.link](https://xmrpay.link)** — for real payments, self-host your own instance.

---

## Self-Host in 60 Seconds

You need a VPS with a domain pointing to it. Then:

```bash
curl -sL https://xmrpay.link/install.sh | sh -s your-domain.com
```

Done. HTTPS is automatic (via Caddy + Let's Encrypt). A **Tor hidden service** (.onion) is included — the installer shows your onion address after setup.

### Requirements

| | Minimum | Recommended |
|---|---|---|
| **CPU** | 1 vCPU | 2 vCPU |
| **RAM** | 1 GB | 2 GB |
| **Disk** | 10 GB | 20 GB |
| **OS** | Any Linux with Docker | Ubuntu 22+, Debian 12+ |
| **Domain** | A-Record pointing to server IP | |
| **Cost** | ~3 EUR/month (Hetzner, Contabo, etc.) | |

### Updates

Watchtower runs alongside xmrpay and automatically pulls new images every 6 hours. No action needed.

Manual update:

```bash
cd /opt/xmrpay && docker compose pull && docker compose up -d
```

### Configuration

After install, the config is at `/opt/xmrpay/.env`:

```bash
DOMAIN=your-domain.com
XMRPAY_IMAGE=schmidt1024/xmrpay:latest
```

### Docker Images

| Registry | Pull command |
|---|---|
| Docker Hub | `docker pull schmidt1024/xmrpay:latest` |
| GitHub (GHCR) | `docker pull ghcr.io/schmidt1024/xmrpay:latest` |

### Manual Setup (without install script)

```bash
mkdir -p /opt/xmrpay && cd /opt/xmrpay

curl -fsSL https://raw.githubusercontent.com/schmidt1024/xmrpay/master/docker-compose.yml -o docker-compose.yml

cat > .env <<EOF
DOMAIN=your-domain.com
XMRPAY_IMAGE=schmidt1024/xmrpay:latest
EOF

docker compose pull && docker compose up -d

# Show your onion address
docker exec xmrpay-tor cat /var/lib/tor/hidden_service/hostname
```

### Uninstall

```bash
cd /opt/xmrpay && docker compose down -v
```

---

## Why Self-Host?

**Any server you don't control can steal your funds.** The JavaScript loaded from a third-party instance can swap the address in the QR code or exfiltrate payment data. No HMAC, no SRI hash, no URL fragment can fully prevent this — because the server controls the code your browser runs.

Self-hosting eliminates this risk. You control the server, you control the code.

The public instance at [xmrpay.link](https://xmrpay.link) exists as a demo and for testing only.

---

## Features

- **Invoice generation** — XMR address, amount (XMR or fiat), description, payment deadline
- **Wallet-native URI** — `monero:` URI with QR code, works with any Monero wallet
- **PDF invoice** — downloadable with QR, amount, fiat equivalent, deadline
- **Payment verification** — sender provides TX Hash + TX Key, cryptographic verification in browser
- **Fiat conversion** — EUR/USD/CHF/GBP/JPY/RUB/BRL via CoinGecko, auto-detected from locale
- **Short URLs** — optional, with explicit trust trade-off warning
- **i18n** — English, German, French, Italian, Spanish, Portuguese, Russian
- **Offline-capable** — Service Worker for offline use
- **Privacy** — zero cookies, no analytics, no external scripts, self-hosted fonts

### Security

- **CSP** — Content Security Policy blocks exfiltration to foreign domains
- **SRI** — Subresource Integrity on all scripts, verified on every load
- **HMAC-signed short URLs** — detect server-side tampering
- **Rate-limited APIs** — all write endpoints rate-limited per IP
- **No private keys** — TX proof uses the sender's TX key, not the receiver's view key
- **Client-side crypto** — Ed25519 + Keccak-256 verification runs in browser

---

## Tech Stack

```
Frontend:    HTML + Vanilla JS (no frameworks, no build step)
Crypto:      @noble/curves Ed25519 + Keccak-256 (30KB bundle)
QR:          QRCode.js (client-side)
PDF:         jsPDF (client-side, lazy-loaded)
Backend:     Minimal PHP (URL shortener, rates proxy, proof storage)
Data:        JSON files (no database)
Hosting:     Caddy (auto-HTTPS) + PHP-FPM in Alpine Docker
```

---

## Development

```bash
git clone https://github.com/schmidt1024/xmrpay.git
cd xmrpay

# Local Docker build
docker build -t xmrpay:dev .
docker run -p 8080:80 -e DOMAIN=localhost xmrpay:dev
```

---

## License

MIT — fork it, host it, improve it.
