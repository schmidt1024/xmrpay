<?php
<?php
require_once __DIR__ . '/_helpers.php';

/**
 * TX Proof Storage API
 * POST: Store verified payment proof for an invoice
 * GET:  Retrieve payment status for an invoice
 *
 * Privacy: Only TX hash, amount, and confirmations are stored.
 * Payee address is NEVER stored — verification happens client-side only.
 */

header('Content-Type: application/json');
send_security_headers();

$dbFile = __DIR__ . '/../data/proofs.json';

// GET: Retrieve proof
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!check_rate_limit('verify_get', 30, 60)) {
        http_response_code(429);
        echo json_encode(['error' => 'Rate limit exceeded']);
        exit;
    }
    $code = $_GET['code'] ?? '';
    if (empty($code) || !preg_match('/^[a-z0-9]{4,10}$/', $code)) {
        echo json_encode(['verified' => false]);
        exit;
    }
    $proofs = file_exists($dbFile) ? (json_decode(file_get_contents($dbFile), true) ?: []) : [];
    if (isset($proofs[$code])) {
        echo json_encode(array_merge(['verified' => true], $proofs[$code]));
    } else {
        echo json_encode(['verified' => false]);
    }
    exit;
}

// POST: Store proof
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

verify_origin();

if (!check_rate_limit('verify_post', 10, 3600)) {
    http_response_code(429);
    echo json_encode(['error' => 'Rate limit exceeded']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

$code = $input['code'] ?? '';
$txHash = $input['tx_hash'] ?? '';
$amount = floatval($input['amount'] ?? 0);
$confirmations = intval($input['confirmations'] ?? 0);

// Validate
if (!preg_match('/^[a-z0-9]{4,10}$/', $code)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid code']);
    exit;
}
if (!preg_match('/^[0-9a-fA-F]{64}$/', $txHash)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid tx_hash']);
    exit;
}

// Verify the short URL code exists (read-only, no lock needed here)
$urlsFile = __DIR__ . '/../data/urls.json';
if (!file_exists($urlsFile)) {
    http_response_code(404);
    echo json_encode(['error' => 'Invoice not found']);
    exit;
}
$urls = json_decode(file_get_contents($urlsFile), true) ?: [];
if (!isset($urls[$code])) {
    http_response_code(404);
    echo json_encode(['error' => 'Invoice not found']);
    exit;
}

// Store proof with atomic lock
[$fp, $proofs] = read_json_locked($dbFile);

$status = ($input['status'] ?? 'paid') === 'pending' ? 'pending' : 'paid';

// Allow overwriting a pending proof with more confirmations or a final paid status
if (isset($proofs[$code])) {
    $existing = $proofs[$code];
    $canOverwrite = ($existing['status'] ?? 'paid') === 'pending'
        && ($status === 'paid' || $confirmations > ($existing['confirmations'] ?? 0));
    if (!$canOverwrite) {
        flock($fp, LOCK_UN);
        fclose($fp);
        echo json_encode(['ok' => true]);
        exit;
    }
}

$proofs[$code] = [
    'tx_hash' => strtolower($txHash),
    'amount' => $amount,
    'confirmations' => $confirmations,
    'status' => $status,
    'verified_at' => time()
];

write_json_locked($fp, $proofs);
echo json_encode(['ok' => true]);

