<?php
require_once __DIR__ . '/_helpers.php';

/**
 * Monero Daemon RPC Proxy
 * Forwards allowed RPC requests to Monero nodes, bypassing CORS.
 * The private view key NEVER passes through this proxy.
 */

header('Content-Type: application/json');
send_security_headers();
verify_origin();

// Only POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Nodes in priority order
$NODES = [
    'http://node.xmr.rocks:18089',
    'http://node.community.rino.io:18081',
    'http://node.sethforprivacy.com:18089',
    'http://xmr-node.cakewallet.com:18081',
];

// Allowed RPC methods (whitelist)
$ALLOWED_JSON_RPC = ['get_info', 'get_block', 'get_block_header_by_height'];
$ALLOWED_HTTP = ['get_transaction_pool', 'gettransactions', 'get_transaction_pool_hashes.bin'];

// Rate limiting (simple file-based, 60 requests/minute per IP)
$RATE_DIR = __DIR__ . '/../data/rate/';
if (!is_dir($RATE_DIR)) @mkdir($RATE_DIR, 0755, true);

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateFile = $RATE_DIR . md5($ip) . '.json';
$now = time();
$rateData = [];

if (file_exists($rateFile)) {
    $rawRate = file_get_contents($rateFile);
    $decodedRate = is_string($rawRate) ? json_decode($rawRate, true) : [];
    $rateData = is_array($decodedRate) ? $decodedRate : [];
    // Clean old entries
    $rateData = array_values(array_filter($rateData, fn($t) => is_numeric($t) && (int)$t > $now - 60));
}

if (count($rateData) >= 60) {
    http_response_code(429);
    echo json_encode(['error' => 'Rate limit exceeded']);
    exit;
}

$rateData[] = $now;
file_put_contents($rateFile, json_encode($rateData));

// Parse request
$rawInput = file_get_contents('php://input');
$input = is_string($rawInput) ? json_decode($rawInput, true) : null;
if (!is_array($input) || !isset($input['method']) || !is_string($input['method'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing method']);
    exit;
}

$method = $input['method'];
$params = isset($input['params']) && is_array($input['params']) ? $input['params'] : [];

// Determine endpoint type
$isJsonRpc = in_array($method, $ALLOWED_JSON_RPC);
$isHttp = in_array($method, $ALLOWED_HTTP);

if (!$isJsonRpc && !$isHttp) {
    http_response_code(403);
    echo json_encode(['error' => 'Method not allowed: ' . $method]);
    exit;
}

// Cache last working node
$cacheFile = __DIR__ . '/../data/node_cache.json';
$cachedNode = null;
if (file_exists($cacheFile)) {
    $rawCache = file_get_contents($cacheFile);
    $cache = is_string($rawCache) ? json_decode($rawCache, true) : null;
    if (is_array($cache) && ($cache['time'] ?? 0) > $now - 300 && isset($cache['node']) && is_string($cache['node'])) {
        $cachedNode = $cache['node'];
    }
}

// Order nodes: cached first
$orderedNodes = $NODES;
if ($cachedNode && in_array($cachedNode, $NODES)) {
    $orderedNodes = array_merge([$cachedNode], array_filter($NODES, fn($n) => $n !== $cachedNode));
}

// Try nodes
$lastError = '';
foreach ($orderedNodes as $node) {
    if ($isJsonRpc) {
        $url = $node . '/json_rpc';
        $body = json_encode([
            'jsonrpc' => '2.0',
            'id' => '0',
            'method' => $method,
            'params' => (object)$params
        ]);
    } else {
        $url = $node . '/' . $method;
        $body = json_encode((object)$params);
    }

    $ch = curl_init($url);
    if ($ch === false) {
        $lastError = 'cURL init failed';
        continue;
    }
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_TIMEOUT => 15,
        CURLOPT_CONNECTTIMEOUT => 5,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response !== false && $httpCode >= 200 && $httpCode < 300) {
        // Cache this working node
        file_put_contents($cacheFile, json_encode(['node' => $node, 'time' => $now]));
        echo $response;
        exit;
    }

    $lastError = $curlError ?: "HTTP $httpCode";
}

// All nodes failed
http_response_code(502);
echo json_encode(['error' => 'All nodes unreachable', 'detail' => $lastError]);
