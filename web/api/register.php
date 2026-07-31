<?php
/**
 * Marsa — inscription vendeur (création de compte + boutique).
 * Crée un compte sécurisé (mot de passe haché), un slug unique de boutique,
 * démarre l'essai (J+3), connecte le vendeur et renvoie l'URL de redirection.
 */
header('Content-Type: application/json; charset=utf-8');

$config = require __DIR__ . '/../includes/config.php';
require __DIR__ . '/../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
    exit;
}

$raw = file_get_contents('php://input');
$in  = ($raw !== '' && ($j = json_decode($raw, true)) !== null && is_array($j)) ? $j : $_POST;

if (!csrf_ok($in['csrf'] ?? '')) {
    http_response_code(419);
    echo json_encode(['ok' => false, 'error' => 'csrf']);
    exit;
}

$shop  = trim((string) ($in['shop'] ?? ''));
$owner = trim((string) ($in['owner'] ?? ''));
$email = trim((string) ($in['email'] ?? ''));
$phone = preg_replace('/\D+/', '', (string) ($in['phone'] ?? ''));
$pass  = (string) ($in['password'] ?? '');
$cat   = trim((string) ($in['category'] ?? ''));
$city  = trim((string) ($in['city'] ?? ''));

$fields = [];
if (mb_strlen($shop) < 2)  { $fields[] = 'shop'; }
if (mb_strlen($owner) < 2) { $fields[] = 'owner'; }
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) { $fields[] = 'email'; }
if ($phone === '' || strlen($phone) < 8 || strlen($phone) > 15) { $fields[] = 'phone'; }
if (strlen($pass) < 6) { $fields[] = 'password'; }

if ($fields) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'invalid', 'fields' => $fields]);
    exit;
}

$rows = store_load();
if (store_find_phone($rows, $phone) !== null) {
    http_response_code(409);
    echo json_encode(['ok' => false, 'error' => 'already_registered']);
    exit;
}
if ($email !== '' && merchant_by_login($email) !== null) {
    http_response_code(409);
    echo json_encode(['ok' => false, 'error' => 'email_taken']);
    exit;
}

$trialDays = (int) ($config['trial_days'] ?? 3);
$now = time();
$merchant = [
    'id'         => new_id(),
    'shop'       => $shop,
    'slug'       => unique_slug($shop),
    'owner'      => $owner,
    'email'      => $email,
    'phone'      => $phone,
    'password'   => password_hash($pass, PASSWORD_DEFAULT),
    'category'   => $cat,
    'city'       => $city,
    'created_at' => date('c', $now),
    'trial_ends' => date('c', $now + $trialDays * 86400),
    'status'     => 'essai',
];
store_add($merchant);
notify_merchant($merchant['id'], 'Bienvenue sur Marsa ! Votre boutique « ' . $shop . ' » est prête. Ajoutez vos premiers produits.');
login_merchant($merchant);

echo json_encode([
    'ok'       => true,
    'redirect' => 'compte.php',
    'slug'     => $merchant['slug'],
    'domain'   => shop_domain($merchant),
]);
