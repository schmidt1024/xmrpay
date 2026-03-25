<?php
header('Content-Type: application/json');
header('Cache-Control: public, max-age=60');

$url = 'https://api.coingecko.com/api/v3/simple/price?ids=monero&vs_currencies=eur,usd,chf';

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_HTTPHEADER => ['Accept: application/json', 'User-Agent: xmrpay.link/1.0'],
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response !== false && $httpCode === 200) {
    echo $response;
} else {
    http_response_code(502);
    echo json_encode(['error' => 'Failed to fetch rates']);
}
