(function () {
  'use strict';

  // --- Config ---
  const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price?ids=monero&vs_currencies=eur,usd,chf';
  // Standard address (4..., 95 chars), Subaddress (8..., 95 chars), Integrated address (4..., 106 chars)
  const XMR_STANDARD_REGEX = /^[48][1-9A-HJ-NP-Za-km-z]{94}$/;
  const XMR_INTEGRATED_REGEX = /^4[1-9A-HJ-NP-Za-km-z]{105}$/;
  const CACHE_DURATION = 60000; // 1 min
  const RATE_RETRY_DELAY = 10000; // 10s retry on failure

  // --- State ---
  let fiatRates = null;
  let ratesTimestamp = 0;
  let countdownInterval = null;
  let ratesFailed = false;

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
  let cryptoLoaded = false;

  // --- Init ---
  fetchRates();
  loadFromHash() || loadSaved();
  registerSW();

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
    uriBox.textContent = '';
    shareLinkInput.value = '';
    // Reset proof
    proofPanel.classList.remove('open');
    txHashInput.value = '';
    txKeyInput.value = '';
    verifyProofBtn.disabled = true;
    proofResult.innerHTML = '';
    proofResult.className = 'proof-result';
    paymentStatus.innerHTML = '';
    paymentStatus.className = 'payment-status';
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
      const res = await fetch('/api/shorten.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash: hash })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
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
    openWalletBtn.href = uri;

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
      setTimeout(function () { loadPaymentStatus(code); }, 200);
    }

    // Auto-generate
    setTimeout(generate, 100);
    return true;
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
      const s = Math.floor((remaining % 60000) / 1000);
      if (d > 0) {
        countdownEl.textContent = I18n.t('countdown_remaining_days')
          .replace('{d}', d).replace('{h}', pad(h)).replace('{m}', pad(m)).replace('{s}', pad(s));
      } else {
        countdownEl.textContent = I18n.t('countdown_remaining_hours')
          .replace('{h}', pad(h)).replace('{m}', pad(m)).replace('{s}', pad(s));
      }
    }

    tick();
    countdownInterval = setInterval(tick, 1000);
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
        proofResult.className = 'proof-result active success';
        proofResult.textContent = I18n.t('proof_verified').replace('{amount}', xmrAmount.toFixed(6));

        // Store proof with invoice
        var shareUrl = shareLinkInput.value;
        var codeMatch = shareUrl.match(/\/s\/([a-z0-9]+)/);
        if (codeMatch) {
          await fetch('/api/verify.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: codeMatch[1],
              tx_hash: txHash,
              amount: xmrAmount,
              confirmations: tx.confirmations || 0
            })
          });
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
        if (data.verified) {
          paymentStatus.className = 'payment-status paid';
          paymentStatus.innerHTML = '<div class="paid-badge">' + I18n.t('status_paid') +
            '</div><div class="paid-detail">' + data.amount.toFixed(6) + ' XMR — TX ' +
            data.tx_hash.substring(0, 8) + '...</div>';
        }
      })
      .catch(function () {});
  }
})();
