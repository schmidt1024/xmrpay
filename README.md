# xmrpay.link — Serverless XMR Invoice Builder

> Privat. Selbst gehostet. Keine Accounts. Kein Backend. Kein Bullshit.

---

## Idee

**xmrpay.link** ist eine rein clientseitige Web-App, die es jedem ermöglicht,
in unter 30 Sekunden eine professionelle Monero-Zahlungsanforderung zu erstellen —
ohne eigenen Node, ohne Registration, ohne KYC, ohne Drittanbieter.

Du gibst deine Adresse ein, den Betrag, eine optionale Beschreibung —
und bekommst einen QR-Code, einen kopierbaren `monero:`-Link und eine
optionale PDF-Rechnung. Fertig.

---

## Das Problem (Warum es das noch nicht gibt)

| Lösung | Problem |
|---|---|
| **BTCPay Server** | Eigener Server nötig, komplexes Setup |
| **NOWPayments, Globee** | Custodial, KYC, Fees, Drittanbieter-Abhängigkeit |
| **Cake Wallet Invoice** | Mobil-only, kein Teilen ohne App |
| **MoneroPay** | Backend-Daemon nötig, nur für Entwickler |
| **Wallet-QR direkt** | Kein Betrag, keine Beschreibung, keine Bestätigung |

**Die Lücke:** Es gibt kein einfaches, datenschutzkonformes Tool für Freelancer,
kleine Händler und Creator, das ohne Setup funktioniert und trotzdem
Zahlungsbestätigung ermöglicht.

---

## Technologie-Stack

```
Frontend:   HTML + Vanilla JS (oder leichtes Vue 3)
Crypto:     monero-javascript (WASM, läuft im Browser)
Node:       Frei wählbarer öffentlicher Remote Node (z.B. xmr.sh, node.community)
QR:         QRCode.js (clientseitig)
PDF:        jsPDF (clientseitig)
Hosting:    Statische Site — GitHub Pages, Netlify, Vercel, Self-hosted
Backend:    KEINES
Daten:      LocalStorage (optional, nur lokal, nie übertragen)
```

**Kein PHP-Backend. Kein Node.js-Server. Kein Datenbank-Setup.**
Die App ist eine einzige HTML-Datei, die von überall gehostet werden kann.

---

## Feature-Roadmap

### v1 — Der Kern (Static QR Generator)

- [ ] XMR-Adresse eingeben (mit Validierung)
- [ ] Betrag in XMR eingeben (optional: EUR/CHF/USD-Umrechnung via CoinGecko API)
- [ ] Beschreibung / Verwendungszweck
- [ ] Optionaler Countdown-Timer (Zahlungsfrist)
- [ ] `monero:`-URI generieren (Standard: [SLIP-0021](https://github.com/satoshilabs/slips/blob/master/slip-0021.md))
- [ ] QR-Code anzeigen und als PNG downloaden
- [ ] Link kopieren (für Messenger, E-Mail etc.)
- [ ] Responsive Design, Dark Mode

### v2 — View-Key Zahlungsbestätigung (Browser-basiert)

- [ ] View-Only-Key eingeben (privater Spend-Key bleibt lokal)
- [ ] Browser pollt Remote Node via Monero RPC (kein eigener Node nötig)
- [ ] Live-Anzeige: "Warte auf Zahlung..." → "✅ Zahlung eingegangen (X Bestätigungen)"
- [ ] Warnhinweis bei Unterzahlung
- [ ] Subaddress-Unterstützung (für mehrere parallele Rechnungen)

### v3 — Professionelle Features

- [ ] PDF-Rechnung generieren (Logo, Betrag in Fiat, XMR-Betrag, QR, Fälligkeitsdatum)
- [ ] Einbettbarer `<iframe>`-Widget für beliebige Websites
- [ ] Mehrsprachigkeit (DE, EN, FR, ES)
- [ ] Rechnungshistorie (LocalStorage, exportierbar als CSV)
- [ ] „Pay Button" Generator (HTML-Snippet zum Einbetten)

---

## Warum das zur Monero-Philosophie passt

- **Zero Trust:** App läuft im Browser, kein Server sieht Daten
- **Open Source:** MIT-Lizenz, forkbar, selbst hostbar
- **Keine Accounts:** Nichts zu registrieren, nichts zu verlieren
- **Kein KYC:** Weder Sender noch Empfänger müssen sich ausweisen
- **Kein Custody:** Coins gehen direkt in die eigene Wallet
- **Offline-fähig (v1):** QR-Generator funktioniert ohne Internetverbindung

---

## Abgrenzung zu bestehenden Tools

**Kein Konkurrenz zu BTCPay:** BTCPay ist für Shops mit hohem Volumen.
xmrpay.link ist für Einzelpersonen, Freelancer, Aktivisten — alle, die
schnell und ohne Overhead eine Zahlung anfragen wollen.

**Kein Konkurrenz zu Wallets:** Wallets bleiben die primäre Lösung
für den täglichen Gebrauch. xmrpay.link ergänzt mit Teil- und Präsentationslogik
(PDF, Link, Timer), die Wallets nicht bieten.

---

## Sicherheitshinweise (für Nutzer)

- Der **Spend-Key verlässt nie den Browser** — nur View-Key wird für Monitoring verwendet
- Remote Node sieht nur: "Wurde an diese Adresse gezahlt?" — keine Wallet-Zuordnung
- Für maximale Privatsphäre: eigenen Node via Tor verbinden (konfigurierbar)
- LocalStorage-Daten bleiben lokal — nichts wird übertragen

---

## Mögliche Domain-Namen

| Domain | Begründung |
|---|---|
| `xmrpay.link` | ⭐ Kurz, klar, `monero:` URI passt dazu, TLD `.link` passt perfekt |
| `xmr.invoice` | Elegant, aber `.invoice` TLD existiert nicht |
| `payxmr.dev` | Developer-affin, gut für GitHub-Kontext |
| `xmrbill.com` | Einprägsam, beschreibend |
| `monero.page` | Sauber, aber evtl. zu generisch |
| `xmrlink.io` | Klar, crypto-affine TLD |

**Empfehlung: `xmrpay.link`** — weil der Name sofort sagt was die App tut,
`.link` auf den Share-Gedanken einzahlt, und der Name kurz genug ist
um ihn mündlich weiterzugeben.

---

## Projektstruktur (geplant)

```
xmrpay.link/
├── index.html          # Single-Page-App Entry Point
├── app.js              # Haupt-Logik (URI-Builder, QR, Fiat-Kurs)
├── monitor.js          # View-Key Monitoring (v2)
├── invoice.js          # PDF-Generierung (v3)
├── style.css
├── lib/
│   ├── qrcode.min.js
│   ├── monero.js       # monero-javascript WASM build
│   └── jspdf.min.js
├── README.md
└── LICENSE             # MIT
```

---

## Beitragen / Entwickeln

```bash
git clone https://github.com/DEIN-USERNAME/xmrpay.link
cd xmrpay.link
# Keine Build-Tools nötig für v1 — einfach index.html im Browser öffnen
# Für v2+: kleines Dev-Server-Setup empfohlen (z.B. `npx serve .`)
```

Pull Requests willkommen. Issues auf GitHub. Kein Discord, kein Slack —
das Repo ist die Kommunikation.

---

## Lizenz

MIT — fork it, host it, improve it.

---

*Gebaut mit ❤️ für die Monero-Community. Inspiriert von [monero.eco](https://monero.eco).*
