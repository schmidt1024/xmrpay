<?php
header('Content-Type: application/json');

// Server-side cache: fetch from CoinGecko at most once per 2 minutes
$cacheFile = __DIR__ . '/../data/rates_cache.json';
$cacheTTL = 120; // seconds

if (file_exists($cacheFile)) {
    $rawCached = file_get_contents($cacheFile);
    $cached = is_string($rawCached) ? json_decode($rawCached, true) : null;
    $cachedTime = is_array($cached) && isset($cached['_time']) && is_numeric($cached['_time']) ? (int)$cached['_time'] : 0;
    if (is_array($cached) && (time() - $cachedTime) < $cacheTTL) {
        unset($cached['_time']);
        header('Cache-Control: public, max-age=60');
        echo json_encode($cached);
        exit;
    }
}

$currencies = isset($_GET['c']) && is_string($_GET['c']) ? $_GET['c'] : 'eur,usd,chf,gbp,jpy,rub,brl';
$currencies = preg_replace('/[^a-z,]/', '', strtolower($currencies));
$url = 'https://api.coingecko.com/api/v3/simple/price?ids=monero&vs_currencies=' . $currencies;
$ch = curl_init($url);
if ($ch === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Failed to initialize request']);
    exit;
}
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_HTTPHEADER => ['Accept: application/json', 'User-Agent: xmrpay.link/1.0'],
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response !== false && $httpCode === 200) {
    $data = json_decode($response, true);
    if (is_array($data)) {
        $data['_time'] = time();
        file_put_contents($cacheFile, json_encode($data));
        unset($data['_time']);
        header('Cache-Control: public, max-age=60');
        echo json_encode($data);
        exit;
    }
}

// On error, serve stale cache if available
if (file_exists($cacheFile)) {
    $rawCached = file_get_contents($cacheFile);
    $cached = is_string($rawCached) ? json_decode($rawCached, true) : null;
    if (is_array($cached)) {
        unset($cached['_time']);
        header('Cache-Control: public, max-age=30');
        echo json_encode($cached);
        exit;
    }
}

http_response_code(502);
echo json_encode(['error' => 'Failed to fetch rates']);
