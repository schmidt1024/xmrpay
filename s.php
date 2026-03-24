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

$hash = $urls[$code];
$base = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'];
header('Location: ' . $base . '/#' . $hash, true, 302);
exit;
