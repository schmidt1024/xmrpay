# xmrpay.link — Monero Invoice Generator

> Private. Self-hosted. No accounts. No tracking. No bullshit.

**[Live: xmrpay.link](https://xmrpay.link)** · **[Tor: mc6wfe...zyd.onion](http://mc6wfeaqc7oijgdcudrr5zsotmwok3jzk3tu2uezzyjisn7nzzjjizyd.onion)**

---

## What is this?

**xmrpay.link** is a client-side web app that lets anyone create a professional Monero payment request in under 30 seconds — no account registration, no KYC, no custodial services.

Enter your address, the amount, an optional description — and get a QR code, a shareable short link, and a PDF invoice. Done.

### Architecture & Transparency

xmrpay.link uses a **minimal backend** for the following specific purposes:

| Component | Where it runs | What the server sees |
|-----------|--------------|---------------------|
| QR code generation | Browser only | Nothing |
| PDF invoice | Browser only | Nothing |
| Payment (TX) verification | Browser only | Nothing |
| Fiat exchange rates | Server (CoinGecko proxy) | Your IP address |
| Short URL storage | Server | Invoice hash (address + amount + description), HMAC-signed |
| Payment proof storage | Server | TX hash + amount — **not** your XMR address |

**Self-hosting** eliminates any trust in the public instance.  
**No short links** (use the long `/#...` URL or QR code) = zero server involvement.

### Security Model

- **HMAC-signed short URLs:** Hashes are signed with a server-side secret. Clients verify the signature on load to detect tampering.
- **Address never stored:** Payment verification is cryptographic and runs client-side. The server never learns your XMR address.
- **Rate-limited APIs:** All write endpoints are rate-limited per IP.
- **Origin-restricted:** API endpoints reject cross-origin requests.

---

## Why?

| Solution | Problem |
|---|---|
| **BTCPay Server** | Requires own server, complex setup |
| **NOWPayments, Globee** | Custodial, KYC, fees, third-party dependency |
| **Cake Wallet Invoice** | Mobile-only, no sharing without app |
| **MoneroPay** | Backend daemon required, developer-only |
| **Wallet QR** | No amount, no description, no confirmation |

**The gap:** There's no simple, privacy-respecting tool for freelancers, small merchants, and creators that works without setup and still allows payment confirmation.

---

## Features

### Invoice Generation
- XMR address input with validation (standard, subaddress, integrated)
- Amount in XMR or fiat (EUR/USD/CHF/GBP/JPY/RUB/BRL via CoinGecko, auto-detected)
- Description and payment deadline (7/14/30 days or custom)
- QR code with `monero:` URI
- Shareable short URLs (`/s/abc123`) with HMAC signatures for integrity
- PDF invoice download (with QR, amount, fiat equivalent, deadline)
- i18n (EN, DE, FR, IT, ES, PT, RU) with automatic browser detection

### Payment Verification (TX Proof)
- Sender provides TX Hash + TX Key from their wallet
- Cryptographic verification in the browser (no private keys needed)
- Payment status stored with the invoice (server stores proof, but not your address)
- Invoice link shows "Paid" badge after verification
- Standard and subaddress support

### Performance & Privacy
- 100% Lighthouse score (Performance, Accessibility, Best Practices, SEO)
- Offline-capable via Service Worker
- Self-hosted fonts (no Google Fonts dependency)
- Zero external tracking, no cookies
- Dark mode, responsive design

---

## Tech Stack

```
Frontend:    HTML + Vanilla JS (no frameworks, no build step)
Crypto:      @noble/curves Ed25519 + Keccak-256 (30KB bundle)
QR:          QRCode.js (client-side)
PDF:         jsPDF (client-side, lazy-loaded)
Hosting:     Static site + minimal PHP for short URLs and RPC proxy
Backend:     Minimal PHP (URL shortener, rates proxy, proof storage)
Data:        JSON files (no database), LocalStorage (client-side)
```

---

## Project Structure

```
xmrpay.link/
├── index.html              # Single-page app
├── app.js / app.min.js     # Main logic (URI builder, QR, fiat rates, TX proof)
├── i18n.js / i18n.min.js   # Internationalization (DE, EN)
├── style.css               # Dark theme, responsive, WCAG AA
├── sw.js                   # Service Worker (offline support)
├── favicon.svg             # Monero coin logo
├── s.php                   # Short URL redirect
├── api/
│   ├── shorten.php         # Short URL creation
│   ├── rates.php           # CoinGecko proxy with server-side cache
│   ├── node.php            # Monero RPC proxy (4-node failover)
│   └── verify.php          # TX proof storage/retrieval
├── data/                   # JSON storage (auto-generated)
├── fonts/                  # Self-hosted Inter + JetBrains Mono
├── lib/
│   ├── qrcode.min.js       # QR code generator
│   ├── jspdf.min.js        # PDF generation (lazy-loaded)
│   └── xmr-crypto.bundle.js # Ed25519 + Keccak-256 (lazy-loaded)
├── README.md
└── LICENSE                 # MIT
```

---

## Invoice Lifecycle

**Optional Deadline:** When creating an invoice, you can set an expiration deadline (7/14/30 days or custom). 

**Lazy Cleanup:** When a deadline is enabled, the short URL and payment proof are automatically deleted if accessed after expiration:
- Accessing an expired short URL returns **HTTP 410 Gone** and removes the entry
- Retrieving a proof for an expired invoice returns `verified: false` and cleans up the entry
- No background jobs or cron tasks required

**No deadline?** Invoices without a deadline persist indefinitely (no auto-cleanup).

---

## Self-Hosting

```bash
git clone https://gitea.schmidt.eco/schmidt1024/xmrpay.link.git
cd xmrpay.link
# Serve with any web server that supports PHP
# No build tools, no npm, no database required
python3 -m http.server 8080  # For development (no PHP features)
```

Requirements for full functionality:
- PHP 8.x with `curl` extension
- Nginx or Apache (for `/s/` short URL rewrites)
- Writable `data/` directory

---

## Security

- **No private keys** — TX proof uses the sender's TX key, not the receiver's view key
- **Client-side crypto** — Ed25519 verification runs in the browser
- **No tracking** — zero cookies, no analytics, no external scripts
- **RPC proxy** — allowlisted methods only, rate-limited
- **Self-hostable** — run your own instance for full control

---

## Roadmap

- [ ] Embeddable `<iframe>` payment widget
- [ ] Invoice history (LocalStorage, CSV export)
- [ ] "Pay Button" generator (HTML snippet)
- [x] Auto-cleanup: Lazy-delete invoices after deadline expires

---

## License

MIT — fork it, host it, improve it.
