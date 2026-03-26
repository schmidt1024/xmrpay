<?php
/**
 * Shared security helpers for xmrpay.link API
 */

// ── Security headers ──────────────────────────────────────────────────────────
function send_security_headers(): void {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
    header('Referrer-Policy: no-referrer');
    header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
}

// ── Origin verification ───────────────────────────────────────────────────────
function verify_origin(): void {
    $allowed = [
        'https://xmrpay.link',
        'http://mc6wfeaqc7oijgdcudrr5zsotmwok3jzk3tu2uezzyjisn7nzzjjizyd.onion',
    ];
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    // Allow same-origin (no Origin header from direct same-origin requests)
    if ($origin === '') return;
    if (!in_array($origin, $allowed, true)) {
        http_response_code(403);
        echo json_encode(['error' => 'Origin not allowed']);
        exit;
    }
}

// ── HMAC secret ───────────────────────────────────────────────────────────────
// Auto-generated on first run, stored outside webroot in data/secret.key
function get_hmac_secret(): string {
    $secretFile = __DIR__ . '/../data/secret.key';
    if (file_exists($secretFile)) {
        $raw = file_get_contents($secretFile);
        if (is_string($raw) && $raw !== '') {
            return trim($raw);
        }
    }
    $secret = bin2hex(random_bytes(32));
    $dir = dirname($secretFile);
    if (!is_dir($dir)) mkdir($dir, 0750, true);
    file_put_contents($secretFile, $secret, LOCK_EX);
    chmod($secretFile, 0600);
    return $secret;
}

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Returns false when limit exceeded, true otherwise
function check_rate_limit(string $action, int $limit, int $window_seconds): bool {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $rateDir = __DIR__ . '/../data/rate/';
    if (!is_dir($rateDir)) @mkdir($rateDir, 0755, true);
    $rateFile = $rateDir . $action . '_' . md5($ip) . '.json';
    $now = time();
    $times = [];
    if (file_exists($rateFile)) {
        $raw = file_get_contents($rateFile);
        $decoded = is_string($raw) ? json_decode($raw, true) : [];
        $times = is_array($decoded) ? $decoded : [];
        $times = array_values(array_filter($times, fn($t) => is_numeric($t) && (int)$t > $now - $window_seconds));
    }
    if (count($times) >= $limit) return false;
    $times[] = $now;
    file_put_contents($rateFile, json_encode($times), LOCK_EX);
    return true;
}

// ── Atomic JSON read/write ────────────────────────────────────────────────────
// Returns [file_handle, data_array] — caller must call write_json_locked() to finish
function read_json_locked(string $file): array {
    $dir = dirname($file);
    if (!is_dir($dir)) mkdir($dir, 0750, true);
    $fp = fopen($file, 'c+');
    if ($fp === false) {
        throw new RuntimeException('Unable to open file: ' . $file);
    }
    flock($fp, LOCK_EX);
    $size = filesize($file);
    $size = is_int($size) ? $size : 0;
    $raw = $size > 0 ? fread($fp, $size) : '';
    $decoded = is_string($raw) ? json_decode($raw, true) : [];
    $data = is_array($decoded) ? $decoded : [];
    return [$fp, $data];
}

function write_json_locked($fp, array $data): void {
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    flock($fp, LOCK_UN);
    fclose($fp);
}
