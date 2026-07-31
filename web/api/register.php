<?php
/**
 * Marsa — inscription d'un vendeur (création de boutique).
 * Enregistre le vendeur avec le statut « essai » et une fin d'essai à J+3.
 * Provisoire (stockage fichier) ; à remplacer par la vraie API + PostgreSQL.
 */
header('Content-Type: application/json; charset=utf-8');

$config = require __DIR__ . '/../includes/config.php';
require __DIR__ . '/../includes/store.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
    exit;
}

// Accepte JSON ou formulaire.
$in = [];
$raw = file_get_contents('php://input');
if ($raw !== '' && ($j = json_decode($raw, true)) !== null) {
    $in = is_array($j) ? $j : [];
} else {
    $in = $_POST;
}

$shop  = trim((string) ($in['shop'] ?? ''));
$owner = trim((string) ($in['owner'] ?? ''));
$phone = preg_replace('/\D+/', '', (string) ($in['phone'] ?? ''));
$cat   = trim((string) ($in['category'] ?? ''));
$city  = trim((string) ($in['city'] ?? ''));

$errors = [];
if (mb_strlen($shop) < 2)  { $errors[] = 'shop'; }
if (mb_strlen($owner) < 2) { $errors[] = 'owner'; }
if ($phone === '' || strlen($phone) < 8 || strlen($phone) > 15) { $errors[] = 'phone'; }

if ($errors) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'invalid', 'fields' => $errors]);
    exit;
}

$rows = store_load();
if (store_find_phone($rows, $phone) !== null) {
    http_response_code(409);
    echo json_encode(['ok' => false, 'error' => 'already_registered']);
    exit;
}

$trialDays = (int) ($config['trial_days'] ?? 3);
$now = time();
$merchant = [
    'id'         => bin2hex(random_bytes(6)),
    'shop'       => $shop,
    'owner'      => $owner,
    'phone'      => $phone,
    'category'   => $cat,
    'city'       => $city,
    'created_at' => date('c', $now),
    'trial_ends' => date('c', $now + $trialDays * 86400),
    'status'     => 'essai',
];
store_add($merchant);

echo json_encode([
    'ok'         => true,
    'id'         => $merchant['id'],
    'shop'       => $shop,
    'trial_ends' => $merchant['trial_ends'],
    'trial_days' => $trialDays,
]);
