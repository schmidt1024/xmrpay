<?php
/**
 * TX Proof Storage API
 * POST: Store verified payment proof for an invoice
 * GET:  Retrieve payment status for an invoice
 */

header('Content-Type: application/json');

$dbFile = __DIR__ . '/../data/proofs.json';
$proofs = [];
if (file_exists($dbFile)) {
    $proofs = json_decode(file_get_contents($dbFile), true) ?: [];
}

// GET: Retrieve proof
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $code = $_GET['code'] ?? '';
    if (empty($code) || !preg_match('/^[a-z0-9]{4,10}$/', $code)) {
        echo json_encode(['verified' => false]);
        exit;
    }

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

// Verify the short URL code exists
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

// Store proof
$proofs[$code] = [
    'tx_hash' => strtolower($txHash),
    'amount' => $amount,
    'confirmations' => $confirmations,
    'verified_at' => time()
];

file_put_contents($dbFile, json_encode($proofs, JSON_PRETTY_PRINT));
echo json_encode(['ok' => true]);
