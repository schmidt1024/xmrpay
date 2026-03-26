(function () {
  'use strict';

  // --- Config ---
  const COINGECKO_API = '/api/rates.php?c=eur,usd,chf,gbp,jpy,rub,brl';
  // Standard address (4..., 95 chars), Subaddress (8..., 95 chars), Integrated address (4..., 106 chars)
  const XMR_STANDARD_REGEX = /^[48][1-9A-HJ-NP-Za-km-z]{94}$/;
  const XMR_INTEGRATED_REGEX = /^4[1-9A-HJ-NP-Za-km-z]{105}$/;
  const CACHE_DURATION = 60000; // 1 min
  const RATE_RETRY_DELAY = 10000; // 10s retry on failure
  const XMR_CONF_REQUIRED = 10; // Monero standard output lock

  // --- State ---
  let fiatRates = null;
  let ratesTimestamp = 0;
  let countdownInterval = null;
  let countdownTick = null;
  let ratesFailed = false;
  let invoiceCode = null; // short URL code for this invoice
  let confirmPollInterval = null;
  let pendingTxData = null; // { txHash, xmrAmount } for confirmation polling

  // --- DOM ---
  const $ = (s) => document.querySelector(s);
  const addrInput = $('#addr');
  const amountInput = $('#amount');
  const currencySelect = $('#currency');
  const descInput = $('#desc');
  const timerCustom = $('#timerCustom');
  const deadlineBadges = $('#deadlineBadges');
  let selectedDays = 0;
  const generateBtn = $('#generate');
  const resultSection = $('#result');
  const qrContainer = $('#qr');
  const uriBox = $('#uri');
  const openWalletBtn = $('#openWallet');
  const copyAddrBtn = $('#copyAddr');
  const countdownEl = $('#countdown');
  const fiatHint = $('#fiatHint');
  const toast = $('#toast');
  const shareLinkInput = $('#shareLink');
  const copyShareLinkBtn = $('#copyShareLink');
  const newRequestBtn = $('#newRequest');
  const homeLink = $('#homeLink');

  // TX Proof DOM
  const proofToggle = $('#proofToggle');
  const proofPanel = $('#proofPanel');
  const txHashInput = $('#txHash');
  const txKeyInput = $('#txKey');
  const verifyProofBtn = $('#verifyProof');
  const proofResult = $('#proofResult');
  const paymentStatus = $('#paymentStatus');
  const paymentSummary = $('#paymentSummary');
  const downloadPdfBtn = $('#downloadPdf');
  let cryptoLoaded = false;
  let pdfLoaded = false;
  let lastPaidData = null;

  // --- Currency Detection ---
  function detectCurrency() {
    var localeToCurrency = {
      'de': 'EUR', 'fr': 'EUR', 'it': 'EUR', 'es': 'EUR', 'pt': 'EUR', 'nl': 'EUR',
      'de-CH': 'CHF', 'fr-CH': 'CHF', 'it-CH': 'CHF',
      'de-AT': 'EUR',
      'en-GB': 'GBP',
      'en-US': 'USD', 'en': 'USD',
      'ja': 'JPY',
      'ru': 'RUB',
      'pt-BR': 'BRL'
    };
    var langs = navigator.languages || [navigator.language || 'en'];
    for (var i = 0; i < langs.length; i++) {
      var tag = langs[i];
      if (localeToCurrency[tag]) {
        currencySelect.value = localeToCurrency[tag];
        return;
      }
      var short = tag.substring(0, 2).toLowerCase();
      if (localeToCurrency[short]) {
        currencySelect.value = localeToCurrency[short];
        return;
      }
    }
  }

  // --- Init ---
  detectCurrency();
  fetchRates();
  loadFromHash() || loadSaved();
  registerSW();

  // Re-render dynamic texts on language change
  I18n.onChange(function () {
    // QR hint
    var hint = qrContainer.querySelector('.qr-hint');
    if (hint) hint.textContent = I18n.t('qr_hint');
    // Paid stamp
    var stamp = qrContainer.querySelector('.paid-stamp');
    if (stamp) stamp.textContent = I18n.t('status_paid');
    // Paid detail
    if (lastPaidData) {
      showPaidStatus(lastPaidData);
    }
    // Summary
    if (resultSection.classList.contains('visible')) {
      var xmrAmount = getXmrAmount();
      var desc = descInput.value.trim();
      buildSummary(xmrAmount, desc, selectedDays);
      updatePageTitle(xmrAmount, desc);
    }
    // Countdown text
    if (countdownTick) countdownTick();
  });

  // --- Events ---
  addrInput.addEventListener('input', validateAddress);
  amountInput.addEventListener('input', updateFiatHint);
  currencySelect.addEventListener('change', updateFiatHint);
  generateBtn.addEventListener('click', generate);
  copyAddrBtn.addEventListener('click', () => copyToClipboard(addrInput.value.trim()));
  copyShareLinkBtn.addEventListener('click', () => copyToClipboard(shareLinkInput.value));
  qrContainer.addEventListener('click', downloadQR);
  newRequestBtn.addEventListener('click', resetForm);
  homeLink.addEventListener('click', function (e) { e.preventDefault(); resetForm(); });

  // Deadline badge events
  deadlineBadges.querySelectorAll('.badge').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const days = parseInt(btn.getAttribute('data-days'));
      if (btn.classList.contains('active')) {
        btn.classList.remove('active');
        selectedDays = 0;
        timerCustom.value = '';
      } else {
        deadlineBadges.querySelectorAll('.badge').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        selectedDays = days;
        timerCustom.value = '';
      }
    });
  });
  timerCustom.addEventListener('input', function () {
    deadlineBadges.querySelectorAll('.badge').forEach(function (b) { b.classList.remove('active'); });
    selectedDays = parseInt(timerCustom.value) || 0;
  });

  // PDF
  downloadPdfBtn.addEventListener('click', generatePdf);

  // TX Proof events
  proofToggle.addEventListener('click', toggleProofPanel);
  txHashInput.addEventListener('input', validateProofInputs);
  txKeyInput.addEventListener('input', validateProofInputs);
  verifyProofBtn.addEventListener('click', verifyTxProof);

  // --- Functions ---

  function resetForm() {
    addrInput.value = '';
    amountInput.value = '';
    currencySelect.value = 'EUR';
    descInput.value = '';
    selectedDays = 0;
    timerCustom.value = '';
    deadlineBadges.querySelectorAll('.badge').forEach(function (b) { b.classList.remove('active'); });
    fiatHint.textContent = '';
    fiatHint.classList.remove('error');
    addrInput.classList.remove('valid', 'invalid');
    generateBtn.disabled = true;
    resultSection.classList.remove('visible');
    if (countdownInterval) clearInterval(countdownInterval);
    qrContainer.innerHTML = '';
    qrContainer.classList.remove('paid', 'confirming');
    uriBox.textContent = '';
    shareLinkInput.value = '';
    // Reset proof
    invoiceCode = null;
    stopConfirmationPolling();
    proofPanel.classList.remove('open');
    txHashInput.value = '';
    txKeyInput.value = '';
    verifyProofBtn.disabled = true;
    proofResult.innerHTML = '';
    proofResult.className = 'proof-result';
    paymentStatus.innerHTML = '';
    paymentStatus.className = 'payment-status';
    paymentSummary.innerHTML = '';
    document.title = 'xmrpay.link \u2014 Monero Invoice Generator';
    history.replaceState(null, '', location.pathname);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    addrInput.focus();
  }

  function isValidAddress(addr) {
    return XMR_STANDARD_REGEX.test(addr) || XMR_INTEGRATED_REGEX.test(addr);
  }

  function validateAddress() {
    const val = addrInput.value.trim();
    addrInput.classList.remove('valid', 'invalid');
    if (val.length === 0) return;
    if (isValidAddress(val)) {
      addrInput.classList.add('valid');
    } else if (val.length >= 10) {
      addrInput.classList.add('invalid');
    }
    updateGenerateBtn();
  }

  function updateGenerateBtn() {
    const addr = addrInput.value.trim();
    generateBtn.disabled = !isValidAddress(addr);
  }

  function updateFiatHint() {
    const amount = parseFloat(amountInput.value);
    const currency = currencySelect.value;

    if (!amount || amount <= 0) {
      fiatHint.textContent = '';
      fiatHint.classList.remove('error');
      return;
    }

    if (currency !== 'XMR' && !fiatRates) {
      fiatHint.textContent = ratesFailed ? I18n.t('rates_offline') : '';
      fiatHint.classList.toggle('error', ratesFailed);
      return;
    }

    fiatHint.classList.remove('error');

    if (currency === 'XMR') {
      if (fiatRates) {
        const eur = (amount * fiatRates.eur).toFixed(2);
        fiatHint.textContent = '\u2248 ' + eur + ' EUR';
      } else {
        fiatHint.textContent = '';
      }
    } else {
      const rate = fiatRates[currency.toLowerCase()];
      if (rate && rate > 0) {
        const xmr = (amount / rate).toFixed(8);
        fiatHint.textContent = '\u2248 ' + xmr + ' XMR';
      }
    }
  }

  function getXmrAmount() {
    const amount = parseFloat(amountInput.value);
    const currency = currencySelect.value;

    if (!amount || amount <= 0) return null;

    if (currency === 'XMR') return amount;

    if (fiatRates) {
      const rate = fiatRates[currency.toLowerCase()];
      if (rate && rate > 0) return amount / rate;
    }
    return null;
  }

  function buildUri(addr, xmrAmount, desc) {
    let uri = 'monero:' + addr;
    const params = [];
    if (xmrAmount) params.push('tx_amount=' + xmrAmount.toFixed(12));
    if (desc) params.push('tx_description=' + encodeURIComponent(desc));
    if (params.length) uri += '?' + params.join('&');
    return uri;
  }

  function buildHash(addr, xmrAmount, desc, timer) {
    const params = new URLSearchParams();
    params.set('a', addr);
    if (xmrAmount) params.set('x', xmrAmount.toFixed(12));
    if (desc) params.set('d', desc);
    if (timer) params.set('t', timer);
    return params.toString();
  }

  async function shortenUrl(hash) {
    try {
      // Calculate expiry timestamp if deadline is set
      let expiryTs = null;
      if (selectedDays && selectedDays > 0) {
        expiryTs = Math.floor((Date.now() + selectedDays * 86400000) / 1000);
      }
      const res = await fetch('/api/shorten.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash: hash, expiry_ts: expiryTs })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!invoiceCode) invoiceCode = data.code;
      return location.origin + '/s/' + data.code;
    } catch (e) {
      console.warn('Short URL failed:', e);
      return null;
    }
  }

  function generate() {
    const addr = addrInput.value.trim();
    if (!isValidAddress(addr)) return;

    const xmrAmount = getXmrAmount();
    const desc = descInput.value.trim();
    const timer = selectedDays;
    const uri = buildUri(addr, xmrAmount, desc);

    // Show result
    resultSection.classList.add('visible');
    uriBox.textContent = uri;
    openWalletBtn.onclick = function () { window.location.href = uri; };

    // Payment summary + page title
    buildSummary(xmrAmount, desc, timer);
    updatePageTitle(xmrAmount, desc);

    // Share link — show long URL immediately, then replace with short
    const hash = buildHash(addr, xmrAmount, desc, timer);
    shareLinkInput.value = location.origin + '/#' + hash;
    shortenUrl(hash).then(function (shortUrl) {
      if (shortUrl) shareLinkInput.value = shortUrl;
    });

    // QR
    qrContainer.innerHTML = '';
    new QRCode(qrContainer, {
      text: uri,
      width: 256,
      height: 256,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
    const hint = document.createElement('div');
    hint.className = 'qr-hint';
    hint.textContent = I18n.t('qr_hint');
    qrContainer.appendChild(hint);

    // Countdown
    startCountdown();

    // Save to LocalStorage
    saveState(addr);

    // Scroll to result
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function loadFromHash() {
    const hash = location.hash.substring(1);
    if (!hash) return false;

    const params = new URLSearchParams(hash);
    const addr = params.get('a');
    if (!addr || !isValidAddress(addr)) return false;

    addrInput.value = addr;
    validateAddress();

    const xmr = params.get('x');
    if (xmr) {
      amountInput.value = parseFloat(xmr);
      currencySelect.value = 'XMR';
    }

    const desc = params.get('d');
    if (desc) descInput.value = desc;

    const timer = params.get('t');
    if (timer && parseInt(timer) > 0) {
      selectedDays = parseInt(timer);
      // Activate matching badge or set custom
      const badge = deadlineBadges.querySelector('.badge[data-days="' + selectedDays + '"]');
      if (badge) {
        badge.classList.add('active');
      } else {
        timerCustom.value = selectedDays;
      }
    }

    // Check for short URL code and load payment status
    const code = params.get('c');
    if (code) {
      invoiceCode = code;
      // Verify short URL integrity (detect tampering)
      setTimeout(function () { 
        verifyShortUrlIntegrity(code, hash);
        loadPaymentStatus(code); 
      }, 200);
    }

    // Auto-generate
    setTimeout(generate, 100);
    return true;
  }

  // Verify that short URL has not been tampered with by checking HMAC signature
  function verifyShortUrlIntegrity(code, currentHash) {
    fetch('/api/check-short.php?code=' + encodeURIComponent(code))
      .then(function (res) { 
        if (!res.ok) throw new Error('Integrity check failed');
        return res.json(); 
      })
      .then(function (data) {
        if (!data.signature) {
          // Old format without signature - no integrity check
          return;
        }
        
        // Verify HMAC signature client-side
        verifyHmacSignature(data.hash, data.signature).then(function (valid) {
          if (!valid) {
            console.warn('xmrpay: Hash signature mismatch - possible server tampering detected');
            showToast(I18n.t('toast_integrity_warning'));
          }
        });
      })
      .catch(function (e) { 
        console.warn('xmrpay: Could not verify short URL integrity:', e);
      });
  }

  // Client-side HMAC-SHA256 verification
  async function verifyHmacSignature(hash, expectedSignature) {
    try {
      // Use hostname as part of the secret (same as server-side)
      const secret = await crypto.subtle.digest('SHA-256', 
        new TextEncoder().encode(location.hostname + 'xmrpay.link'));
      const key = await crypto.subtle.importKey('raw', secret, 
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const signature = await crypto.subtle.sign('HMAC', key, 
        new TextEncoder().encode(hash));
      
      // Convert to hex string
      const sigHex = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      return sigHex === expectedSignature;
    } catch (e) {
      console.warn('xmrpay: HMAC verification failed:', e);
      return false;
    }
  }

  function buildSummary(xmrAmount, desc, days) {
    var html = '';
    if (xmrAmount) {
      html += '<div class="summary-amount">' + xmrAmount.toFixed(8) + ' XMR</div>';
      var amount = parseFloat(amountInput.value);
      var currency = currencySelect.value;
      if (currency !== 'XMR' && amount) {
        html += '<div class="summary-fiat">\u2248 ' + amount.toFixed(2) + ' ' + currency + '</div>';
      }
    }
    if (desc) {
      html += '<div class="summary-desc">' + desc.replace(/</g, '&lt;') + '</div>';
    }
    paymentSummary.innerHTML = html;
    paymentSummary.classList.remove('paid-confirmed');
    resetFavicon();
  }

  function updatePageTitle(xmrAmount, desc) {
    var parts = [];
    if (xmrAmount) parts.push(xmrAmount.toFixed(4) + ' XMR');
    if (desc) parts.push(desc);
    if (parts.length) {
      document.title = parts.join(' — ') + ' | xmrpay.link';
    }
  }

  function startCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownEl.textContent = '';
    countdownEl.className = 'countdown';

    if (!selectedDays || selectedDays <= 0) return;

    const end = Date.now() + selectedDays * 86400000;
    countdownEl.classList.add('active');

    function tick() {
      const remaining = end - Date.now();
      if (remaining <= 0) {
        clearInterval(countdownInterval);
        countdownEl.textContent = I18n.t('countdown_expired');
        countdownEl.className = 'countdown expired';
        return;
      }
      const d = Math.floor(remaining / 86400000);
      const h = Math.floor((remaining % 86400000) / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      if (d > 0) {
        countdownEl.textContent = I18n.t('countdown_remaining_days')
          .replace('{d}', d).replace('{h}', h);
      } else {
        countdownEl.textContent = I18n.t('countdown_remaining_hours')
          .replace('{h}', pad(h)).replace('{m}', pad(m));
      }
    }

    countdownTick = tick;
    tick();
    countdownInterval = setInterval(tick, 60000); // Update every minute, not every second
  }

  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function downloadQR() {
    const canvas = qrContainer.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'xmrpay-qr.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(I18n.t('toast_copied'));
    });
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  function saveState(addr) {
    try {
      localStorage.setItem('xmrpay_addr', addr);
    } catch (e) { /* silent */ }
  }

  function loadSaved() {
    try {
      const addr = localStorage.getItem('xmrpay_addr');
      if (addr) {
        addrInput.value = addr;
        validateAddress();
      }
    } catch (e) { /* silent */ }
  }

  async function fetchRates() {
    if (fiatRates && Date.now() - ratesTimestamp < CACHE_DURATION) return;
    try {
      const res = await fetch(COINGECKO_API);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      fiatRates = data.monero;
      ratesTimestamp = Date.now();
      ratesFailed = false;
      updateFiatHint();
    } catch (e) {
      console.warn('Kurse konnten nicht geladen werden:', e);
      ratesFailed = true;
      updateFiatHint();
      setTimeout(fetchRates, RATE_RETRY_DELAY);
    }
  }

  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }

  // --- PDF Invoice ---

  function loadJsPdf() {
    return new Promise(function (resolve, reject) {
      if (window.jspdf) { resolve(); return; }
      var script = document.createElement('script');
      script.src = 'lib/jspdf.min.js';
      script.onload = function () { pdfLoaded = true; resolve(); };
      script.onerror = function () { reject(new Error('Failed to load jsPDF')); };
      document.head.appendChild(script);
    });
  }

  async function generatePdf() {
    await loadJsPdf();
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    var addr = addrInput.value.trim();
    var xmrAmount = getXmrAmount();
    var desc = descInput.value.trim();
    var amount = parseFloat(amountInput.value);
    var currency = currencySelect.value;
    var pageW = doc.internal.pageSize.getWidth();
    var margin = 20;
    var contentW = pageW - margin * 2;
    var y = margin;

    // --- Header: Orange accent bar ---
    doc.setFillColor(242, 104, 33);
    doc.rect(0, 0, pageW, 8, 'F');

    // --- Title ---
    y = 22;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(242, 104, 33);
    doc.text(I18n.t('pdf_title'), margin, y);

    // --- Date (top right) ---
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    var dateStr = new Date().toLocaleDateString(I18n.getLang() === 'de' ? 'de-CH' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    doc.text(I18n.t('pdf_date') + ': ' + dateStr, pageW - margin, y, { align: 'right' });

    // --- Divider ---
    y += 6;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);

    // --- QR Code (right side) ---
    var qrCanvas = qrContainer.querySelector('canvas');
    var qrSize = 50;
    var qrX = pageW - margin - qrSize;
    var qrY = y + 6;
    if (qrCanvas) {
      var qrData = qrCanvas.toDataURL('image/png');
      doc.addImage(qrData, 'PNG', qrX, qrY, qrSize, qrSize);
      // QR hint
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(I18n.t('pdf_scan_qr'), qrX + qrSize / 2, qrY + qrSize + 4, { align: 'center' });
    }

    // --- Invoice details (left side, next to QR) ---
    var detailX = margin;
    var detailW = qrX - margin - 10;
    y += 14;

    function addField(label, value) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(label, detailX, y);
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      var lines = doc.splitTextToSize(value, detailW);
      doc.text(lines, detailX, y);
      y += lines.length * 5 + 4;
    }

    // Amount
    if (xmrAmount) {
      var amountStr = xmrAmount.toFixed(8) + ' XMR';
      if (currency !== 'XMR' && amount) {
        amountStr += '  (~ ' + amount.toFixed(2) + ' ' + currency + ')';
      }
      addField(I18n.t('pdf_amount'), amountStr);
    }

    // Description
    if (desc) {
      addField(I18n.t('pdf_desc'), desc);
    }

    // Deadline
    if (selectedDays > 0) {
      var deadlineDate = new Date(Date.now() + selectedDays * 86400000);
      var deadlineStr = deadlineDate.toLocaleDateString(I18n.getLang() === 'de' ? 'de-CH' : 'en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      addField(I18n.t('pdf_deadline'), deadlineStr + ' (' + I18n.t('pdf_deadline_days').replace('{d}', selectedDays) + ')');
    }

    // Address (below QR if needed, full width)
    y = Math.max(y, qrY + qrSize + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(I18n.t('pdf_address'), margin, y);
    y += 5;

    // Address in monospace box
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, y - 3.5, contentW, 10, 2, 2, 'F');
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text(addr, margin + 3, y + 2.5);
    y += 14;

    // monero: URI
    var uri = uriBox.textContent;
    if (uri) {
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(margin, y - 3.5, contentW, 10, 2, 2, 'F');
      doc.setFont('courier', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 100, 100);
      var uriLines = doc.splitTextToSize(uri, contentW - 6);
      doc.text(uriLines, margin + 3, y + 2);
      y += uriLines.length * 3 + 10;
    }

    // --- Payment Status ---
    if (lastPaidData) {
      y += 4;
      var paidDateStr = '';
      if (lastPaidData.verified_at) {
        var pd = new Date(lastPaidData.verified_at * 1000);
        paidDateStr = pd.toLocaleDateString(I18n.getLang() === 'de' ? 'de-CH' : 'en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        });
      }
      var paidLine = lastPaidData.amount.toFixed(6) + ' XMR — TX ' +
        lastPaidData.tx_hash.substring(0, 8) + '...' +
        (paidDateStr ? ' — ' + paidDateStr : '');

      doc.setFillColor(76, 175, 80);
      doc.roundedRect(margin, y - 4, contentW, 16, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text(I18n.t('status_paid').toUpperCase(), margin + contentW / 2, y + 1, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(paidLine, margin + contentW / 2, y + 7, { align: 'center' });
      y += 22;
    }

    // --- Footer ---
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    var footerY = doc.internal.pageSize.getHeight() - 15;
    doc.line(margin, footerY, pageW - margin, footerY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text(I18n.t('pdf_footer'), pageW / 2, footerY + 5, { align: 'center' });

    // Share link
    var shareLink = shareLinkInput.value;
    if (shareLink) {
      doc.text(shareLink, pageW / 2, footerY + 9, { align: 'center' });
    }

    // Save
    var filename = 'xmrpay-' + (desc ? desc.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30) : 'invoice') + '.pdf';
    doc.save(filename);
  }

  // --- TX Proof Functions ---

  function toggleProofPanel() {
    const isOpen = proofPanel.classList.contains('open');
    if (isOpen) {
      proofPanel.classList.remove('open');
      return;
    }
    // Lazy-load crypto bundle
    if (!cryptoLoaded && !window.XmrCrypto) {
      loadCryptoBundle().then(function () {
        cryptoLoaded = true;
        proofPanel.classList.add('open');
        txHashInput.focus();
      });
      return;
    }
    proofPanel.classList.add('open');
    txHashInput.focus();
  }

  function loadCryptoBundle() {
    return new Promise(function (resolve, reject) {
      if (window.XmrCrypto) { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'lib/xmr-crypto.bundle.js';
      script.onload = resolve;
      script.onerror = function () { reject(new Error('Failed to load crypto module')); };
      document.head.appendChild(script);
    });
  }

  function isValidHex64(val) {
    return /^[0-9a-fA-F]{64}$/.test(val);
  }

  function validateProofInputs() {
    const hash = txHashInput.value.trim();
    const key = txKeyInput.value.trim();
    verifyProofBtn.disabled = !(isValidHex64(hash) && isValidHex64(key));
  }

  async function verifyTxProof() {
    const txHash = txHashInput.value.trim();
    const txKey = txKeyInput.value.trim();
    const addr = addrInput.value.trim();
    if (!isValidHex64(txHash) || !isValidHex64(txKey) || !isValidAddress(addr)) return;

    verifyProofBtn.disabled = true;
    proofResult.className = 'proof-result active';
    proofResult.textContent = I18n.t('proof_verifying');

    try {
      // Fetch TX from node
      var res = await fetch('/api/node.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'gettransactions', params: { txs_hashes: [txHash], decode_as_json: true } })
      });
      var data = await res.json();
      var txs = data.txs || [];
      if (txs.length === 0) {
        proofResult.className = 'proof-result active error';
        proofResult.textContent = I18n.t('proof_tx_not_found');
        verifyProofBtn.disabled = false;
        return;
      }

      var tx = txs[0];
      var txJson = JSON.parse(tx.as_json);

      // Get keys from address
      var keys = XmrCrypto.getKeysFromAddress(addr);
      var pubViewKey = keys.publicViewKey;
      var pubSpendKey = keys.publicSpendKey;

      // Key derivation: D = 8 * txKey * pubViewKey
      var r = XmrCrypto.bytesToScalar(XmrCrypto.hexToBytes(txKey));
      var A = XmrCrypto.Point.fromHex(pubViewKey);
      var D = A.multiply(r).multiply(8n);
      var derivation = D.toBytes();

      var B = XmrCrypto.Point.fromHex(pubSpendKey);

      // Check each output
      var outputs = txJson.vout || [];
      var ecdhInfo = (txJson.rct_signatures && txJson.rct_signatures.ecdhInfo) || [];
      var totalAmount = 0n;
      var found = false;

      for (var oi = 0; oi < outputs.length; oi++) {
        var out = outputs[oi];
        var outputKey = out.target && out.target.tagged_key ? out.target.tagged_key.key : (out.target && out.target.key);
        if (!outputKey) continue;

        var varint = XmrCrypto.encodeVarint(oi);
        var scalar = XmrCrypto.hashToScalar(XmrCrypto.concat(derivation, varint));
        var scBig = XmrCrypto.bytesToScalar(scalar);
        var expectedP = XmrCrypto.Point.BASE.multiply(scBig).add(B);
        var expectedHex = XmrCrypto.bytesToHex(expectedP.toBytes());

        if (expectedHex === outputKey) {
          found = true;
          // Decode amount
          if (ecdhInfo[oi] && ecdhInfo[oi].amount) {
            var amount = XmrCrypto.decodeRctAmount(ecdhInfo[oi].amount, derivation, oi);
            totalAmount += amount;
          }
        }
      }

      if (found) {
        var xmrAmount = Number(totalAmount) / 1e12;
        var confs = tx.confirmations || 0;

        if (confs >= XMR_CONF_REQUIRED) {
          proofResult.className = 'proof-result active success';
          proofResult.textContent = I18n.t('proof_verified').replace('{amount}', xmrAmount.toFixed(6));
          if (invoiceCode) {
            await fetch('/api/verify.php', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: invoiceCode, tx_hash: txHash, amount: xmrAmount, confirmations: confs, status: 'paid' })
            });
          }
          showPaidStatus({ amount: xmrAmount, tx_hash: txHash, confirmations: confs });
        } else {
          proofResult.className = 'proof-result active warning';
          proofResult.textContent = I18n.t('proof_confirmed_pending')
            .replace('{amount}', xmrAmount.toFixed(6)).replace('{n}', confs);
          if (invoiceCode) {
            await fetch('/api/verify.php', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: invoiceCode, tx_hash: txHash, amount: xmrAmount, confirmations: confs, status: 'pending' })
            });
          }
          showPendingStatus({ amount: xmrAmount, tx_hash: txHash, confirmations: confs });
          startConfirmationPolling(txHash, xmrAmount);
        }
      } else {
        proofResult.className = 'proof-result active error';
        proofResult.textContent = I18n.t('proof_no_match');
      }
    } catch (e) {
      proofResult.className = 'proof-result active error';
      proofResult.textContent = I18n.t('proof_error');
    }
    verifyProofBtn.disabled = false;
  }

  // Load payment status if viewing via short URL
  function loadPaymentStatus(code) {
    fetch('/api/verify.php?code=' + encodeURIComponent(code))
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.verified) return;
        if (data.status === 'pending') {
          showPendingStatus(data);
          // Poll verify.php for updates pushed by the sender's browser
          confirmPollInterval = setInterval(function () {
            fetch('/api/verify.php?code=' + encodeURIComponent(code))
              .then(function (r) { return r.json(); })
              .then(function (d) {
                if (!d.verified) return;
                if (d.status === 'paid') {
                  stopConfirmationPolling();
                  showPaidStatus(d);
                } else {
                  showPendingStatus(d);
                }
              })
              .catch(function () {});
          }, 60000);
        } else {
          showPaidStatus(data);
        }
      })
      .catch(function () {});
  }

  function showPaidStatus(data) {
    if (!data.verified_at) {
      data = Object.assign({}, data, { verified_at: Math.floor(Date.now() / 1000) });
    }

    paymentStatus.className = 'payment-status paid';

    // Stamp over QR + dim QR
    qrContainer.classList.add('paid');
    var existingStamp = qrContainer.querySelector('.paid-stamp');
    if (!existingStamp) {
      var stamp = document.createElement('div');
      stamp.className = 'paid-stamp';
      stamp.textContent = I18n.t('status_paid');
      qrContainer.appendChild(stamp);
    } else {
      existingStamp.textContent = I18n.t('status_paid');
    }

    // Replace QR hint with payment detail
    var hint = qrContainer.querySelector('.qr-hint');
    if (hint) {
      var dateStr = '';
      if (data.verified_at) {
        var d = new Date(data.verified_at * 1000);
        dateStr = ' — ' + d.toLocaleDateString(I18n.getLang() === 'de' ? 'de-CH' : 'en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        });
      }
      hint.textContent = 'TX ' + data.tx_hash.substring(0, 8) + '...' + dateStr;
      hint.className = 'qr-hint paid-info';
    }

    paymentStatus.innerHTML = '';
    lastPaidData = data;
    paymentSummary.classList.add('paid-confirmed');

    // Hide unnecessary buttons when paid
    openWalletBtn.style.display = 'none';
    document.getElementById('copyAddr').style.display = 'none';
    var proofSection = document.getElementById('proofSection');
    if (proofSection) proofSection.style.display = 'none';
    setPaidFavicon();
  }

  function showPendingStatus(data) {
    var confs = data.confirmations || 0;
    paymentStatus.className = 'payment-status pending';
    paymentSummary.classList.remove('paid-confirmed');
    qrContainer.classList.add('confirming');
    resetFavicon();

    var existingStamp = qrContainer.querySelector('.paid-stamp');
    if (!existingStamp) {
      var stamp = document.createElement('div');
      stamp.className = 'paid-stamp pending-stamp';
      qrContainer.appendChild(stamp);
      existingStamp = stamp;
    }
    existingStamp.textContent = confs === 0 ? I18n.t('status_pending') : (confs + '/10');

    var hint = qrContainer.querySelector('.qr-hint');
    if (hint) {
      hint.textContent = 'TX ' + data.tx_hash.substring(0, 8) + '... — ' +
        (confs === 0 ? I18n.t('status_pending') : (confs + '/10'));
      hint.className = 'qr-hint pending-info';
    }
  }

  function startConfirmationPolling(txHash, xmrAmount) {
    stopConfirmationPolling();
    pendingTxData = { txHash: txHash, xmrAmount: xmrAmount };
    confirmPollInterval = setInterval(pollConfirmations, 60000);
  }

  function stopConfirmationPolling() {
    if (confirmPollInterval) {
      clearInterval(confirmPollInterval);
      confirmPollInterval = null;
    }
    pendingTxData = null;
  }

  async function pollConfirmations() {
    if (!pendingTxData) return;
    var txHash = pendingTxData.txHash;
    var xmrAmount = pendingTxData.xmrAmount;
    try {
      var res = await fetch('/api/node.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'gettransactions', params: { txs_hashes: [txHash] } })
      });
      var data = await res.json();
      var txs = data.txs || [];
      if (txs.length === 0) return;
      var confs = txs[0].confirmations || 0;

      if (confs >= XMR_CONF_REQUIRED) {
        stopConfirmationPolling();
        proofResult.className = 'proof-result active success';
        proofResult.textContent = I18n.t('proof_verified').replace('{amount}', xmrAmount.toFixed(6));
        if (invoiceCode) {
          await fetch('/api/verify.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: invoiceCode, tx_hash: txHash, amount: xmrAmount, confirmations: confs, status: 'paid' })
          });
        }
        showPaidStatus({ amount: xmrAmount, tx_hash: txHash, confirmations: confs });
      } else {
        showPendingStatus({ amount: xmrAmount, tx_hash: txHash, confirmations: confs });
        proofResult.className = 'proof-result active warning';
        proofResult.textContent = I18n.t('proof_confirmed_pending')
          .replace('{amount}', xmrAmount.toFixed(6)).replace('{n}', confs);
      }
    } catch (e) {
      // silent — try again next interval
    }
  }

  function getBaseFaviconHref() {
    var link = document.getElementById('favicon');
    if (!link) return 'favicon.svg';
    var baseHref = link.getAttribute('data-base-href') || link.getAttribute('href') || 'favicon.svg';
    if (!link.getAttribute('data-base-href')) {
      link.setAttribute('data-base-href', baseHref);
    }
    return baseHref;
  }

  function resetFavicon() {
    var link = document.getElementById('favicon');
    if (!link) return;
    link.href = getBaseFaviconHref();
  }

  function setPaidFavicon() {
    var canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    var ctx = canvas.getContext('2d');

    // Draw current base favicon and overlay paid badge
    var img = new Image();
    img.onload = function () {
      ctx.drawImage(img, 0, 0, 32, 32);
      // Green dot (bottom-right)
      ctx.beginPath();
      ctx.arc(25, 25, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(25, 25, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#4caf50';
      ctx.fill();
      // Set favicon
      var link = document.getElementById('favicon');
      link.href = canvas.toDataURL('image/png');
    };
    img.src = getBaseFaviconHref();
  }
})();
