<?php
$pathInfo = isset($_SERVER['PATH_INFO']) && is_string($_SERVER['PATH_INFO']) ? $_SERVER['PATH_INFO'] : null;
$queryCode = isset($_GET['c']) && is_string($_GET['c']) ? $_GET['c'] : '';
$code = trim($pathInfo ?? $queryCode, '/');

if (empty($code) || !preg_match('/^[a-z0-9]{4,10}$/', $code)) {
    http_response_code(404);
    echo 'Not found';
    exit;
}

$dbFile = __DIR__ . '/data/urls.json';
if (!file_exists($dbFile)) {
    http_response_code(404);
    echo 'Not found';
    exit;
}

$rawUrls = file_get_contents($dbFile);
$decodedUrls = is_string($rawUrls) ? json_decode($rawUrls, true) : [];
$urls = is_array($decodedUrls) ? $decodedUrls : [];

if (!isset($urls[$code])) {
    http_response_code(404);
    echo 'Not found';
    exit;
}

// Support both old format (string) and new format (array with hash & signature)
$data = $urls[$code];
$hash = is_array($data) ? ($data['h'] ?? '') : $data;
$hash = is_string($hash) ? $hash : '';
$signature = is_array($data) ? ($data['s'] ?? null) : null;

// Verify HMAC signature if present (detect server-side tampering)
if (is_string($signature) && $signature !== '') {
    require_once __DIR__ . '/api/_helpers.php';
    $expected_sig = hash_hmac('sha256', $hash, get_hmac_secret());
    if (!hash_equals($expected_sig, $signature)) {
        // Signature mismatch — possible tampering, log and proceed (graceful degradation)
        error_log("xmrpay: Signature mismatch for code $code");
    }
}

$host = isset($_SERVER['HTTP_HOST']) && is_string($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'xmrpay.link';
$base = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $host;
header('Location: ' . $base . '/#' . $hash . '&c=' . $code, true, 302);
exit;
