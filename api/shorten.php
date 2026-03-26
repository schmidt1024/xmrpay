<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$dataDir = __DIR__ . '/../data';
$dbFile = $dataDir . '/urls.json';

if (!is_dir($dataDir)) {
    mkdir($dataDir, 0750, true);
}

// Secret for HMAC (derived from hostname to protect against server-side tampering)
$secret = hash('sha256', $_SERVER['HTTP_HOST'] . 'xmrpay.link');

$input = json_decode(file_get_contents('php://input'), true);
$hash = $input['hash'] ?? '';

if (empty($hash) || strlen($hash) > 500) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid data']);
    exit;
}

// Load existing URLs
$urls = [];
if (file_exists($dbFile)) {
    $urls = json_decode(file_get_contents($dbFile), true) ?: [];
}

// Check if this hash already exists
foreach ($urls as $code => $data) {
    $stored_hash = is_array($data) ? $data['h'] : $data;
    if ($stored_hash === $hash) {
        echo json_encode(['code' => $code]);
        exit;
    }
}

// Generate short code (6 chars)
function generateCode($length = 6) {
    $chars = 'abcdefghijkmnpqrstuvwxyz23456789';
    $code = '';
    for ($i = 0; $i < $length; $i++) {
        $code .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $code;
}

// Generate HMAC signature to detect server-side tampering
$signature = hash_hmac('sha256', $hash, $secret);

$code = generateCode();
while (isset($urls[$code])) {
    $code = generateCode();
}

// Store hash with signature
$urls[$code] = [
    'h' => $hash,
    's' => $signature  // HMAC signature for integrity verification
];
file_put_contents($dbFile, json_encode($urls, JSON_UNESCAPED_UNICODE), LOCK_EX);

echo json_encode(['code' => $code]);
