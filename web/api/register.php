<?php
/**
 * Marsa — inscription vendeur (création de compte + boutique), façon Shopify.
 * Recueille identité, pays, type de boutique et offre choisie ; crée un compte
 * sécurisé, démarre l'essai (J+3), connecte le vendeur et renvoie la redirection.
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

$first  = trim((string) ($in['first_name'] ?? ''));
$last   = trim((string) ($in['last_name'] ?? ''));
$shop   = trim((string) ($in['shop'] ?? ''));
$type   = trim((string) ($in['shop_type'] ?? ''));
$email  = trim((string) ($in['email'] ?? ''));
$phone  = preg_replace('/\D+/', '', (string) ($in['phone'] ?? ''));
$pass   = (string) ($in['password'] ?? '');
$country= trim((string) ($in['country'] ?? 'MR'));
$city   = trim((string) ($in['city'] ?? ''));
$plan   = trim((string) ($in['plan'] ?? 'decouverte'));

if (!isset($config['countries'][$country])) { $country = 'MR'; }
if (!isset($config['plans'][$plan]))         { $plan = 'decouverte'; }

$fields = [];
if (mb_strlen($first) < 2) { $fields[] = 'first_name'; }
if (mb_strlen($last) < 2)  { $fields[] = 'last_name'; }
if (mb_strlen($shop) < 2)  { $fields[] = 'shop'; }
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
    'id'          => new_id(),
    'shop'        => $shop,
    'slug'        => unique_slug($shop),
    'first_name'  => $first,
    'last_name'   => $last,
    'owner'       => trim($first . ' ' . $last),
    'email'       => $email,
    'phone'       => $phone,
    'password'    => password_hash($pass, PASSWORD_DEFAULT),
    'country'     => $country,
    'city'        => $city,
    'category'    => $type,
    'shop_type'   => $type,
    'plan'        => $plan,
    'theme'       => 'souk',
    'shop_desc'   => '',
    'created_at'  => date('c', $now),
    'trial_ends'  => date('c', $now + $trialDays * 86400),
    'status'      => 'essai',
];
store_add($merchant);
notify_merchant($merchant['id'], 'Bienvenue sur Marsa ! Votre boutique « ' . $shop . ' » est prête. Ajoutez vos premiers produits et personnalisez votre thème.');
login_merchant($merchant);

echo json_encode([
    'ok'       => true,
    'redirect' => 'compte.php',
    'slug'     => $merchant['slug'],
    'domain'   => shop_domain($merchant),
]);
