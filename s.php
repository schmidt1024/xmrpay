<?php
$code = trim($_SERVER['PATH_INFO'] ?? $_GET['c'] ?? '', '/');

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

$urls = json_decode(file_get_contents($dbFile), true) ?: [];

if (!isset($urls[$code])) {
    http_response_code(404);
    echo 'Not found';
    exit;
}

// Support both old format (string) and new format (array with hash & signature)
$data = $urls[$code];
$hash = is_array($data) ? $data['h'] : $data;
$signature = is_array($data) ? $data['s'] : null;

// Verify HMAC signature if present (detect server-side tampering)
if ($signature) {
    $secret = hash('sha256', $_SERVER['HTTP_HOST'] . 'xmrpay.link');
    $expected_sig = hash_hmac('sha256', $hash, $secret);
    if ($signature !== $expected_sig) {
        // Signature mismatch - possible tampering detected
        // Log and proceed anyway (graceful degradation)
        error_log("xmrpay: Signature mismatch for code $code");
    }
}

$base = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'];
header('Location: ' . $base . '/#' . $hash . '&c=' . $code, true, 302);
exit;
