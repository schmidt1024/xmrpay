# xmrpay.link — Monero Invoice Generator

> Private. Self-hosted. No accounts. No backend. No bullshit.

**[Live: xmrpay.link](https://xmrpay.link)** · **[Tor: mc6wfe...zyd.onion](http://mc6wfeaqc7oijgdcudrr5zsotmwok3jzk3tu2uezzyjisn7nzzjjizyd.onion)**

---

## What is this?

**xmrpay.link** is a client-side web app that lets anyone create a professional Monero payment request in under 30 seconds — no node, no registration, no KYC, no third parties.

Enter your address, the amount, an optional description — and get a QR code, a shareable short link, and a PDF invoice. Done.

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
- Amount in XMR or fiat (EUR/CHF/USD conversion via CoinGecko)
- Description and payment deadline (7/14/30 days or custom)
- QR code with `monero:` URI
- Shareable short URLs (`/s/abc123`)
- PDF invoice download (with QR, amount, fiat equivalent, deadline)
- i18n (English, German) with automatic browser detection

### Payment Verification (TX Proof)
- Sender provides TX Hash + TX Key from their wallet
- Cryptographic verification in the browser (no private keys needed)
- Payment status stored permanently with the invoice
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
- [ ] Additional languages (FR, ES, ...)
- [ ] Invoice history (LocalStorage, CSV export)
- [ ] "Pay Button" generator (HTML snippet)

---

## License

MIT — fork it, host it, improve it.
