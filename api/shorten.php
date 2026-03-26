<?php
require_once __DIR__ . '/_helpers.php';

header('Content-Type: application/json');
send_security_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

verify_origin();

if (!check_rate_limit('shorten', 20, 3600)) {
    http_response_code(429);
    echo json_encode(['error' => 'Rate limit exceeded']);
    exit;
}

$dbFile = __DIR__ . '/../data/urls.json';

$input = json_decode(file_get_contents('php://input'), true);
$hash = $input['hash'] ?? '';

if (empty($hash) || strlen($hash) > 500 || !preg_match('/^[a-zA-Z0-9%+_=&.-]{1,500}$/', $hash)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid data']);
    exit;
}

$secret = get_hmac_secret();

[$fp, $urls] = read_json_locked($dbFile);

// Check if this hash already exists
foreach ($urls as $code => $data) {
    $stored_hash = is_array($data) ? $data['h'] : $data;
    if ($stored_hash === $hash) {
        flock($fp, LOCK_UN);
        fclose($fp);
        echo json_encode(['code' => $code]);
        exit;
    }
}

// Generate short code (6 chars)
function generateCode(int $length = 6): string {
    $chars = 'abcdefghijkmnpqrstuvwxyz23456789';
    $code = '';
    for ($i = 0; $i < $length; $i++) {
        $code .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $code;
}

$code = generateCode();
while (isset($urls[$code])) {
    $code = generateCode();
}

$signature = hash_hmac('sha256', $hash, $secret);
$urls[$code] = ['h' => $hash, 's' => $signature];

write_json_locked($fp, $urls);

echo json_encode(['code' => $code]);
