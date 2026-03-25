/**
 * monitor.js — Monero Payment Monitor (v2)
 * Uses XmrCrypto (noble-curves bundle) for output scanning.
 * View key never leaves the browser.
 */
var PaymentMonitor = (function () {
  'use strict';

  var STATE = {
    IDLE: 'idle',
    CONNECTING: 'connecting',
    SCANNING: 'scanning',
    WAITING: 'waiting',
    MEMPOOL: 'mempool',
    CONFIRMED: 'confirmed',
    UNDERPAID: 'underpaid',
    ERROR: 'error'
  };

  var config = {
    pollInterval: 30000,     // 30s mempool polling
    confirmPoll: 30000,      // 30s confirmation polling
    maxConfirmations: 10,
    proxyUrl: '/api/node.php'
  };

  var state = STATE.IDLE;
  var pollTimer = null;
  var abortController = null;
  var onStateChange = null;

  // Monitoring params
  var monitorAddr = null;
  var monitorViewKey = null;
  var monitorSpendKey = null;
  var monitorViewKeyPub = null;
  var expectedAmount = null; // in piconero (bigint)
  var startHeight = 0;
  var detectedTxHash = null;
  var detectedAmount = 0n;
  var lastConfirmations = 0;

  function setState(newState, data) {
    state = newState;
    if (onStateChange) onStateChange(newState, data);
  }

  async function rpc(method, params) {
    if (abortController && abortController.signal.aborted) throw new Error('Aborted');

    var res = await fetch(config.proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: method, params: params || {} }),
      signal: abortController ? abortController.signal : undefined
    });

    if (!res.ok) throw new Error('RPC error: HTTP ' + res.status);
    return res.json();
  }

  function start(address, privateViewKey, expectedXmr, callback) {
    if (state !== STATE.IDLE) stop();

    onStateChange = callback;
    monitorAddr = address;
    monitorViewKey = privateViewKey;
    expectedAmount = xmrToPiconero(expectedXmr);
    detectedTxHash = null;
    detectedAmount = 0n;
    lastConfirmations = 0;
    abortController = new AbortController();

    // Derive public keys from address
    try {
      var keys = XmrCrypto.getKeysFromAddress(address);
      monitorSpendKey = keys.publicSpendKey;
      monitorViewKeyPub = keys.publicViewKey;


    } catch (e) {
      setState(STATE.ERROR, { message: 'Invalid address' });
      return;
    }

    // Validate view key against address (works for both standard and subaddress)
    try {
      var valid = XmrCrypto.validateViewKey(address, privateViewKey);

      if (!valid) {
        setState(STATE.ERROR, { message: I18n.t('monitor_view_key_invalid') });
        return;
      }
    } catch (e) {
      console.error('[monitor] View key validation error:', e);
      setState(STATE.ERROR, { message: I18n.t('monitor_view_key_invalid') });
      return;
    }

    setState(STATE.CONNECTING);
    connectAndPoll();
  }

  async function connectAndPoll() {
    try {
      // Get current height
      var info = await rpc('get_info');
      var result = info.result || info;
      // Scan 100 blocks back (~3.3 hours) to catch confirmed payments
      startHeight = (result.height || result.target_height || 0) - 100;

      setState(STATE.WAITING);
      poll();
      pollTimer = setInterval(poll, config.pollInterval);
    } catch (e) {
      setState(STATE.ERROR, { message: I18n.t('monitor_node_error') });
      // Retry after delay
      pollTimer = setTimeout(function () {
        if (state === STATE.ERROR) connectAndPoll();
      }, 5000);
    }
  }

  async function poll() {
    if (state === STATE.CONFIRMED) return;

    try {
      if (detectedTxHash) {
        // We already found a TX, check confirmations
        await checkConfirmations();
      } else {
        setState(STATE.SCANNING);

        // Scan recent blocks first (catches already confirmed payments)
        await scanRecentBlocks();

        // Then scan mempool for unconfirmed payments
        if (!detectedTxHash) {
          await scanMempool();
        }

        if (!detectedTxHash) {
          setState(STATE.WAITING);
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.warn('Monitor poll error:', e);
      }
    }
  }

  async function scanMempool() {
    var pool = await rpc('get_transaction_pool');
    var transactions = pool.transactions || [];

    for (var i = 0; i < transactions.length; i++) {
      var tx = transactions[i];
      var txJson = tx.tx_json ? JSON.parse(tx.tx_json) : null;
      if (!txJson) continue;

      var match = scanTransaction(txJson, tx.id_hash);
      if (match) {
        detectedTxHash = match.txHash;
        detectedAmount = match.amount;
        reportDetection(0);
        // Switch to confirmation polling
        clearInterval(pollTimer);
        pollTimer = setInterval(poll, config.confirmPoll);
        return;
      }
    }
  }

  async function scanRecentBlocks() {
    try {
      var info = await rpc('get_info');
      var result = info.result || info;
      var currentHeight = result.height || 0;

      var fromHeight = Math.max(startHeight, currentHeight - 100);
      var batchSize = 10;

      for (var batchStart = fromHeight; batchStart < currentHeight; batchStart += batchSize) {
        var batchEnd = Math.min(batchStart + batchSize, currentHeight);
        var allTxHashes = [];
        var txHeightMap = {};

        // Fetch blocks in this batch
        for (var h = batchStart; h < batchEnd; h++) {
          var blockData = await rpc('get_block', { height: h });
          var blockResult = blockData.result || blockData;
          var hashes = blockResult.tx_hashes || [];
          for (var i = 0; i < hashes.length; i++) {
            allTxHashes.push(hashes[i]);
            txHeightMap[hashes[i]] = h;
          }
        }

        if (allTxHashes.length === 0) continue;


        // Fetch transactions in small sub-batches (restricted nodes limit response size)
        var txBatchSize = 25;
        for (var tbi = 0; tbi < allTxHashes.length; tbi += txBatchSize) {
          var subBatch = allTxHashes.slice(tbi, tbi + txBatchSize);
          var txData = await rpc('gettransactions', {
            txs_hashes: subBatch,
            decode_as_json: true
          });

          var txs = txData.txs || [];
          if (txs.length === 0) {

            continue;
          }

          for (var j = 0; j < txs.length; j++) {
            var tx = txs[j];
            var txJson = tx.as_json ? JSON.parse(tx.as_json) : null;
            if (!txJson) continue;

            var match = scanTransaction(txJson, tx.tx_hash);
            if (match) {
              detectedTxHash = match.txHash;
              detectedAmount = match.amount;
              var txHeight = txHeightMap[tx.tx_hash] || 0;
              var confirmations = txHeight > 0 ? currentHeight - txHeight : 0;
              reportDetection(confirmations);
              clearInterval(pollTimer);
              if (confirmations < config.maxConfirmations) {
                pollTimer = setInterval(poll, config.confirmPoll);
              }
              return;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Block scan error:', e);
    }
  }

  function scanTransaction(txJson, txHash) {
    // Extract tx public keys from extra
    var extraHex = '';
    if (txJson.extra) {
      if (typeof txJson.extra === 'string') {
        extraHex = txJson.extra;
      } else if (Array.isArray(txJson.extra)) {
        extraHex = txJson.extra.map(function (b) {
          return ('0' + (b & 0xff).toString(16)).slice(-2);
        }).join('');
      }
    }

    var txPubKeys = XmrCrypto.parseTxExtra(extraHex);
    if (txPubKeys.length === 0) {

      return null;
    }

    // Get outputs
    var outputs = [];
    if (txJson.vout) {
      outputs = txJson.vout;
    }

    // Get encrypted amounts from RingCT
    var ecdhInfo = [];
    if (txJson.rct_signatures && txJson.rct_signatures.ecdhInfo) {
      ecdhInfo = txJson.rct_signatures.ecdhInfo;
    }



    var totalAmount = 0n;
    var found = false;

    for (var ki = 0; ki < txPubKeys.length; ki++) {
      var txPubKey = txPubKeys[ki];

      for (var oi = 0; oi < outputs.length; oi++) {
        var out = outputs[oi];
        var outputKey = null;

        if (out.target && out.target.tagged_key) {
          outputKey = out.target.tagged_key.key;
        } else if (out.target && out.target.key) {
          outputKey = out.target.key;
        }

        if (!outputKey) continue;

        var encryptedAmount = null;
        if (ecdhInfo[oi] && ecdhInfo[oi].amount) {
          encryptedAmount = ecdhInfo[oi].amount;
        }

        try {
          var result = XmrCrypto.checkOutput(
            txPubKey, oi, outputKey, encryptedAmount,
            monitorViewKey, monitorSpendKey
          );

          if (result.match) {

            totalAmount += result.amount;
            found = true;
          }
        } catch (e) {
        }
      }
    }

    if (found) {
      return { txHash: txHash, amount: totalAmount };
    }
    return null;
  }

  function reportDetection(confirmations) {
    lastConfirmations = confirmations;

    if (expectedAmount > 0n && detectedAmount < expectedAmount) {
      setState(STATE.UNDERPAID, {
        expected: piconeroToXmr(expectedAmount),
        received: piconeroToXmr(detectedAmount),
        confirmations: confirmations,
        txHash: detectedTxHash
      });
    } else if (confirmations >= config.maxConfirmations) {
      setState(STATE.CONFIRMED, {
        amount: piconeroToXmr(detectedAmount),
        confirmations: confirmations,
        txHash: detectedTxHash
      });
    } else {
      setState(STATE.MEMPOOL, {
        amount: piconeroToXmr(detectedAmount),
        confirmations: confirmations,
        txHash: detectedTxHash
      });
    }
  }

  async function checkConfirmations() {
    try {
      var txData = await rpc('gettransactions', {
        txs_hashes: [detectedTxHash],
        decode_as_json: true
      });

      var txs = txData.txs || [];
      if (txs.length === 0) return;

      var tx = txs[0];
      var confirmations = 0;

      if (tx.in_pool) {
        confirmations = 0;
      } else if (tx.block_height) {
        var info = await rpc('get_info');
        var result = info.result || info;
        var currentHeight = result.height || 0;
        confirmations = currentHeight - tx.block_height;
      }

      reportDetection(confirmations);

      if (confirmations >= config.maxConfirmations) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    } catch (e) {
      console.warn('Confirmation check error:', e);
    }
  }

  function stop() {
    if (pollTimer) {
      clearInterval(pollTimer);
      clearTimeout(pollTimer);
      pollTimer = null;
    }
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    state = STATE.IDLE;
    monitorViewKey = null;
    monitorSpendKey = null;
    detectedTxHash = null;
    detectedAmount = 0n;
    onStateChange = null;
  }

  function xmrToPiconero(xmr) {
    if (!xmr || xmr <= 0) return 0n;
    return BigInt(Math.round(xmr * 1e12));
  }

  function piconeroToXmr(piconero) {
    return Number(piconero) / 1e12;
  }

  function isValidViewKey(key) {
    return /^[0-9a-fA-F]{64}$/.test(key);
  }

  function getState() {
    return state;
  }

  return {
    start: start,
    stop: stop,
    isValidViewKey: isValidViewKey,
    getState: getState,
    STATE: STATE
  };
})();
