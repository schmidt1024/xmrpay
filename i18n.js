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
      qr_hint: 'Klick auf QR zum Speichern',
      footer: 'Open Source &middot; Kein Backend &middot; Kein KYC &middot; <a href="https://gitea.schmidt.eco/schmidt1024/xmrpay.link" target="_blank">Source</a>',
      label_share_link: 'Teilbarer Link',
      btn_new_request: 'Neue Zahlungsanforderung',
      toast_copied: 'Kopiert!',
      countdown_expired: 'Zahlungsfrist abgelaufen',
      countdown_remaining_days: 'Zahlungsfrist: {d} Tage, {h}:{m}:{s}',
      countdown_remaining_hours: 'Zahlungsfrist: {h}:{m}:{s}',
      rates_offline: 'Kurse nicht verfügbar — nur XMR-Betrag möglich',
      btn_monitor: 'Zahlung überwachen',
      label_view_key: 'Privater View-Key',
      placeholder_view_key: '64 Hex-Zeichen...',
      hint_view_key: 'Der View-Key verlässt nie deinen Browser',
      btn_start_monitor: 'Überwachung starten',
      btn_stop_monitor: 'Überwachung beenden',
      monitor_connecting: 'Verbinde mit Node...',
      monitor_scanning: 'Scanne Mempool...',
      monitor_waiting: 'Warte auf Zahlung...',
      monitor_mempool: 'Zahlung erkannt (unbestätigt)',
      monitor_confirmed: 'Zahlung bestätigt',
      monitor_confirmations: '{n}/10 Bestätigungen',
      monitor_underpaid: 'Unterzahlung erkannt',
      monitor_underpaid_detail: 'Erwartet: {expected} XMR — Erhalten: {received} XMR',
      monitor_node_error: 'Node nicht erreichbar — versuche nächsten...',
      monitor_loading: 'Lade Kryptografie-Modul...'
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
      qr_hint: 'Click QR to save',
      footer: 'Open Source &middot; No Backend &middot; No KYC &middot; <a href="https://gitea.schmidt.eco/schmidt1024/xmrpay.link" target="_blank">Source</a>',
      label_share_link: 'Shareable link',
      btn_new_request: 'New payment request',
      toast_copied: 'Copied!',
      countdown_expired: 'Payment deadline expired',
      countdown_remaining_days: 'Deadline: {d} days, {h}:{m}:{s}',
      countdown_remaining_hours: 'Deadline: {h}:{m}:{s}',
      rates_offline: 'Rates unavailable — XMR amount only',
      btn_monitor: 'Monitor payment',
      label_view_key: 'Private view key',
      placeholder_view_key: '64 hex characters...',
      hint_view_key: 'Your view key never leaves your browser',
      btn_start_monitor: 'Start monitoring',
      btn_stop_monitor: 'Stop monitoring',
      monitor_connecting: 'Connecting to node...',
      monitor_scanning: 'Scanning mempool...',
      monitor_waiting: 'Waiting for payment...',
      monitor_mempool: 'Payment detected (unconfirmed)',
      monitor_confirmed: 'Payment confirmed',
      monitor_confirmations: '{n}/10 confirmations',
      monitor_underpaid: 'Underpayment detected',
      monitor_underpaid_detail: 'Expected: {expected} XMR — Received: {received} XMR',
      monitor_node_error: 'Node unreachable — trying next...',
      monitor_loading: 'Loading crypto module...'
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

  return { t: t, apply: apply, getLang: getLang };
})();
