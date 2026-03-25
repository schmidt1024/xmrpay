var I18n = (function () {
  'use strict';

  var languages = {
    de: { name: 'Deutsch', flag: 'DE' },
    en: { name: 'English', flag: 'EN' }
  };

  var translations = {
    de: {
      subtitle: 'Monero-Zahlungsanforderung in Sekunden',
      label_addr: 'XMR-Adresse',
      placeholder_addr: '4...',
      label_amount: 'Betrag',
      label_desc: 'Beschreibung (optional)',
      placeholder_desc: 'z.B. Rechnung #42, Freelance-Arbeit...',
      label_timer: 'Zahlungsfrist (optional)',
      days: 'Tage',
      placeholder_timer_custom: 'Tage',
      btn_generate: 'Zahlungsanforderung erstellen',
      btn_open_wallet: 'In Wallet öffnen',
      btn_copy_addr: 'Adresse kopieren',
      btn_download_pdf: 'PDF Rechnung',
      pdf_title: 'Zahlungsanforderung',
      pdf_address: 'XMR-Adresse',
      pdf_amount: 'Betrag',
      pdf_desc: 'Beschreibung',
      pdf_deadline: 'Zahlungsfrist',
      pdf_deadline_days: '{d} Tage',
      pdf_date: 'Datum',
      pdf_scan_qr: 'QR-Code scannen zum Bezahlen',
      pdf_footer: 'Erstellt mit xmrpay.link — Keine Registrierung, kein KYC',
      qr_hint: 'Klick auf QR zum Speichern',
      footer: 'Open Source &middot; Kein Backend &middot; Kein KYC &middot; <a href="https://gitea.schmidt.eco/schmidt1024/xmrpay.link" target="_blank">Source</a>',
      aria_currency: 'Währung',
      label_uri_details: 'Monero-URI anzeigen',
      label_share_link: 'Teilbarer Link',
      btn_new_request: 'Neue Zahlungsanforderung',
      toast_copied: 'Kopiert!',
      countdown_expired: 'Zahlungsfrist abgelaufen',
      countdown_remaining_days: 'Zahlungsfrist: {d} Tage, {h} Std.',
      countdown_remaining_hours: 'Zahlungsfrist: {h}:{m} Std.',
      rates_offline: 'Kurse nicht verfügbar — nur XMR-Betrag möglich',
      btn_prove_payment: 'Zahlung nachweisen',
      label_tx_hash: 'Transaction ID (TX Hash)',
      placeholder_tx_hash: '64 Hex-Zeichen...',
      label_tx_key: 'Transaction Key (TX Key)',
      placeholder_tx_key: '64 Hex-Zeichen...',
      btn_verify_proof: 'Zahlung verifizieren',
      proof_verifying: 'Verifiziere...',
      proof_verified: 'Zahlung bestätigt: {amount} XMR',
      proof_no_match: 'Kein passender Output gefunden — TX Key oder Adresse stimmt nicht',
      proof_tx_not_found: 'Transaktion nicht gefunden',
      proof_error: 'Fehler bei der Verifizierung',
      status_paid: 'Bezahlt'
    },
    en: {
      subtitle: 'Monero payment request in seconds',
      label_addr: 'XMR Address',
      placeholder_addr: '4...',
      label_amount: 'Amount',
      label_desc: 'Description (optional)',
      placeholder_desc: 'e.g. Invoice #42, freelance work...',
      label_timer: 'Payment deadline (optional)',
      days: 'days',
      placeholder_timer_custom: 'Days',
      btn_generate: 'Create payment request',
      btn_open_wallet: 'Open in wallet',
      btn_copy_addr: 'Copy address',
      btn_download_pdf: 'PDF Invoice',
      pdf_title: 'Payment Request',
      pdf_address: 'XMR Address',
      pdf_amount: 'Amount',
      pdf_desc: 'Description',
      pdf_deadline: 'Payment deadline',
      pdf_deadline_days: '{d} days',
      pdf_date: 'Date',
      pdf_scan_qr: 'Scan QR code to pay',
      pdf_footer: 'Created with xmrpay.link — No registration, no KYC',
      qr_hint: 'Click QR to save',
      footer: 'Open Source &middot; No Backend &middot; No KYC &middot; <a href="https://gitea.schmidt.eco/schmidt1024/xmrpay.link" target="_blank">Source</a>',
      aria_currency: 'Currency',
      label_uri_details: 'Show Monero URI',
      label_share_link: 'Shareable link',
      btn_new_request: 'New payment request',
      toast_copied: 'Copied!',
      countdown_expired: 'Payment deadline expired',
      countdown_remaining_days: 'Deadline: {d} days, {h} hrs',
      countdown_remaining_hours: 'Deadline: {h}:{m} hrs',
      rates_offline: 'Rates unavailable — XMR amount only',
      btn_prove_payment: 'Prove payment',
      label_tx_hash: 'Transaction ID (TX Hash)',
      placeholder_tx_hash: '64 hex characters...',
      label_tx_key: 'Transaction Key (TX Key)',
      placeholder_tx_key: '64 hex characters...',
      btn_verify_proof: 'Verify payment',
      proof_verifying: 'Verifying...',
      proof_verified: 'Payment confirmed: {amount} XMR',
      proof_no_match: 'No matching output found — TX key or address mismatch',
      proof_tx_not_found: 'Transaction not found',
      proof_error: 'Verification error',
      status_paid: 'Paid'
    }
  };

  var currentLang = 'de';

  function detectLang() {
    var saved = null;
    try { saved = localStorage.getItem('xmrpay_lang'); } catch (e) {}
    if (saved && translations[saved]) return saved;

    var navLangs = navigator.languages || [navigator.language || 'de'];
    for (var i = 0; i < navLangs.length; i++) {
      var code = navLangs[i].substring(0, 2).toLowerCase();
      if (translations[code]) return code;
    }
    return 'de';
  }

  function applyDOM(t) {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t[el.getAttribute('data-i18n')] || '';
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.placeholder = t[el.getAttribute('data-i18n-placeholder')] || '';
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      el.innerHTML = t[el.getAttribute('data-i18n-html')] || '';
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', t[el.getAttribute('data-i18n-aria')] || '');
    });
  }

  function apply(lang) {
    currentLang = lang;
    var t = translations[lang];
    document.documentElement.lang = lang;
    try { localStorage.setItem('xmrpay_lang', lang); } catch (e) {}

    applyDOM(t);

    // Update toggle label
    var cur = document.getElementById('langCurrent');
    if (cur) cur.textContent = languages[lang].flag;

    // Update dropdown active state
    document.querySelectorAll('.lang-option').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });

    // Notify listeners
    for (var i = 0; i < onChangeCallbacks.length; i++) {
      onChangeCallbacks[i](lang);
    }
  }

  var onChangeCallbacks = [];
  function onChange(fn) {
    onChangeCallbacks.push(fn);
  }

  function buildDropdown() {
    var dropdown = document.getElementById('langDropdown');
    if (!dropdown) return;

    dropdown.innerHTML = '';
    var keys = Object.keys(languages);
    for (var i = 0; i < keys.length; i++) {
      var code = keys[i];
      var btn = document.createElement('button');
      btn.className = 'lang-option';
      btn.setAttribute('data-lang', code);
      btn.textContent = languages[code].name;
      if (code === currentLang) btn.classList.add('active');
      btn.addEventListener('click', (function (c) {
        return function () {
          apply(c);
          closePicker();
        };
      })(code));
      dropdown.appendChild(btn);
    }
  }

  function closePicker() {
    var picker = document.getElementById('langPicker');
    if (picker) picker.classList.remove('open');
  }

  function initPicker() {
    var picker = document.getElementById('langPicker');
    var toggle = document.getElementById('langToggle');
    if (!picker || !toggle) return;

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      picker.classList.toggle('open');
    });

    document.addEventListener('click', function (e) {
      if (!picker.contains(e.target)) closePicker();
    });
  }

  function t(key) {
    return (translations[currentLang] && translations[currentLang][key]) || key;
  }

  function getLang() {
    return currentLang;
  }

  // Init
  currentLang = detectLang();
  document.addEventListener('DOMContentLoaded', function () {
    buildDropdown();
    initPicker();
    apply(currentLang);
  });

  return { t: t, apply: apply, getLang: getLang, onChange: onChange };
})();
