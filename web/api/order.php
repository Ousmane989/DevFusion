<?php
/**
 * Marsa — passage de commande (paiement à la livraison).
 * Crée la commande, notifie le vendeur dans son espace et par e-mail.
 * Endpoint public (acheteur anonyme).
 */
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../includes/store.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
    exit;
}

$raw = file_get_contents('php://input');
$in  = ($raw !== '' && ($j = json_decode($raw, true)) !== null && is_array($j)) ? $j : $_POST;

$slug   = (string) ($in['slug'] ?? '');
$pid    = (string) ($in['product_id'] ?? '');
$name   = trim((string) ($in['customer_name'] ?? ''));
$phone  = preg_replace('/\D+/', '', (string) ($in['customer_phone'] ?? ''));
$addr   = trim((string) ($in['address'] ?? ''));
$qty    = max(1, (int) ($in['qty'] ?? 1));

$merchant = $slug !== '' ? merchant_by_slug($slug) : null;
$product  = $pid !== '' ? product_by_id($pid) : null;

if ($merchant === null || $product === null || ($product['merchant_id'] ?? '') !== $merchant['id']) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'error' => 'not_found']);
    exit;
}
if (mb_strlen($name) < 2 || strlen($phone) < 8 || mb_strlen($addr) < 2) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'invalid']);
    exit;
}

$title = $product['title'] ?? $product['name'] ?? 'Produit';
$stock = (int) ($product['stock'] ?? 0);
if ($stock <= 0) {
    http_response_code(409);
    echo json_encode(['ok' => false, 'error' => 'out_of_stock']);
    exit;
}
if ($qty > $stock) { $qty = $stock; }

$total = (int) $product['price'] * $qty;
$order = [
    'id'             => new_id(),
    'merchant_id'    => $merchant['id'],
    'product_id'     => $product['id'],
    'product_name'   => $title,
    'qty'            => $qty,
    'total'          => $total,
    'customer_name'  => $name,
    'customer_phone' => $phone,
    'address'        => $addr,
    'payment'        => 'cod',
    'status'         => 'nouvelle',
    'created_at'     => date('c'),
];
store_insert('orders', $order);
product_decrement_stock($product['id'], $qty);

// Notification dans l'espace vendeur
notify_merchant(
    $merchant['id'],
    'Nouvelle commande : ' . $qty . '× ' . $title . ' — ' . number_format($total, 0, ',', ' ') . ' MRU (paiement à la livraison) de ' . $name . ' (' . $phone . ').'
);

// E-mail au vendeur (nécessite un serveur mail configuré ; journalisé en local)
if (!empty($merchant['email'])) {
    $subject = 'Marsa — Nouvelle commande sur ' . $merchant['shop'];
    $body = "Bonjour {$merchant['owner']},\n\n"
          . "Nouvelle commande sur votre boutique \"{$merchant['shop']}\" :\n"
          . "- Produit : {$qty}× {$title}\n"
          . "- Montant : " . number_format($total, 0, ',', ' ') . " MRU (paiement à la livraison)\n"
          . "- Client : {$name} ({$phone})\n"
          . "- Adresse : {$addr}\n\n"
          . "Connectez-vous à votre espace : compte.php\n\n— Marsa";
    $headers = 'From: Marsa <no-reply@marsa.mr>' . "\r\n" . 'Content-Type: text/plain; charset=UTF-8';
    @mail($merchant['email'], $subject, $body, $headers);
    @file_put_contents(
        store_dir() . '/mail.log',
        date('c') . "  TO {$merchant['email']}  " . str_replace("\n", ' | ', $subject) . "\n",
        FILE_APPEND | LOCK_EX
    );
}

echo json_encode(['ok' => true, 'total' => $total]);
