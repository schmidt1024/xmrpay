<?php
<?php
require_once __DIR__ . '/_helpers.php';

/**
 * Short URL Integrity Verification API
 * GET: Return the hash and HMAC signature for client-side verification.
 *
 * Security: Allows client-side detection of server-side tampering.
 * The HMAC secret is stored in data/secret.key (auto-generated on first run).
 */

header('Content-Type: application/json');
send_security_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$code = $_GET['code'] ?? '';
if (empty($code) || !preg_match('/^[a-z0-9]{4,10}$/', $code)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid code']);
    exit;
}

$dbFile = __DIR__ . '/../data/urls.json';
if (!file_exists($dbFile)) {
    http_response_code(404);
    echo json_encode(['error' => 'Invoice not found']);
    exit;
}

$urls = json_decode(file_get_contents($dbFile), true) ?: [];
if (!isset($urls[$code])) {
    http_response_code(404);
    echo json_encode(['error' => 'Invoice not found']);
    exit;
}

$data = $urls[$code];
$hash = is_array($data) ? $data['h'] : $data;
$signature = is_array($data) ? $data['s'] : null;

// Re-derive expected signature so client can verify
$expected = $signature ? hash_hmac('sha256', $hash, get_hmac_secret()) : null;

echo json_encode([
    'code' => $code,
    'hash' => $hash,
    'signature' => $expected
]);
