<?php
/**
 * Marsa — couche de données simple (collections JSON).
 * Provisoire : à remplacer par PostgreSQL lors du développement de la
 * plateforme. Collections : merchants, products, orders, notifications.
 */

function store_dir(): string
{
    $dir = __DIR__ . '/../storage';
    if (!is_dir($dir)) { @mkdir($dir, 0775, true); }
    return $dir;
}

/** @return array<int,array<string,mixed>> */
function store_read(string $name): array
{
    $f = store_dir() . '/' . $name . '.json';
    if (!is_file($f)) { return []; }
    $j = json_decode((string) file_get_contents($f), true);
    return is_array($j) ? $j : [];
}

function store_write(string $name, array $rows): void
{
    file_put_contents(
        store_dir() . '/' . $name . '.json',
        json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
        LOCK_EX
    );
}

function store_insert(string $name, array $row): array
{
    $rows = store_read($name);
    $rows[] = $row;
    store_write($name, $rows);
    return $row;
}

function new_id(): string
{
    return bin2hex(random_bytes(6));
}

/* ---------- Vendeurs (merchants) — compat avec l'existant ---------- */

function store_load(): array { return store_read('merchants'); }
function store_save(array $rows): void { store_write('merchants', $rows); }

function store_find_phone(array $rows, string $phone): ?array
{
    foreach ($rows as $r) {
        if (($r['phone'] ?? '') === $phone) { return $r; }
    }
    return null;
}

function store_add(array $merchant): void { store_insert('merchants', $merchant); }

function store_set_status(string $id, string $status): array
{
    $rows = store_read('merchants');
    foreach ($rows as &$r) {
        if (($r['id'] ?? '') === $id) { $r['status'] = $status; }
    }
    unset($r);
    store_write('merchants', $rows);
    return $rows;
}

function merchant_by_id(string $id): ?array
{
    foreach (store_read('merchants') as $m) {
        if (($m['id'] ?? '') === $id) { return $m; }
    }
    return null;
}

function merchant_by_slug(string $slug): ?array
{
    foreach (store_read('merchants') as $m) {
        if (($m['slug'] ?? '') === $slug) { return $m; }
    }
    return null;
}

/** Recherche par e-mail (insensible à la casse) ou par numéro de téléphone. */
function merchant_by_login(string $login): ?array
{
    $login = trim($login);
    $digits = preg_replace('/\D+/', '', $login);
    foreach (store_read('merchants') as $m) {
        if ($login !== '' && strcasecmp($m['email'] ?? '', $login) === 0) { return $m; }
        if ($digits !== '' && ($m['phone'] ?? '') === $digits) { return $m; }
    }
    return null;
}

function merchant_update(string $id, callable $fn): void
{
    $rows = store_read('merchants');
    foreach ($rows as &$r) {
        if (($r['id'] ?? '') === $id) { $r = $fn($r); }
    }
    unset($r);
    store_write('merchants', $rows);
}

/* ---------- Slug ---------- */

function slugify_str(string $s): string
{
    $s = mb_strtolower(trim($s), 'UTF-8');
    if (function_exists('iconv')) {
        $t = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);
        if ($t !== false) { $s = $t; }
    }
    $s = preg_replace('/[^a-z0-9]+/', '-', $s);
    $s = trim((string) $s, '-');
    $s = substr($s, 0, 30);
    return $s !== '' ? $s : 'boutique';
}

function unique_slug(string $base): string
{
    $base = slugify_str($base);
    $slug = $base;
    $i = 2;
    while (merchant_by_slug($slug) !== null) {
        $slug = $base . '-' . $i;
        $i++;
    }
    return $slug;
}

/* ---------- Produits / commandes / notifications ---------- */

function products_of(string $merchantId): array
{
    return array_values(array_filter(store_read('products'), fn($p) => ($p['merchant_id'] ?? '') === $merchantId));
}

function product_by_id(string $id): ?array
{
    foreach (store_read('products') as $p) {
        if (($p['id'] ?? '') === $id) { return $p; }
    }
    return null;
}

function orders_of(string $merchantId): array
{
    $rows = array_values(array_filter(store_read('orders'), fn($o) => ($o['merchant_id'] ?? '') === $merchantId));
    usort($rows, fn($a, $b) => strcmp($b['created_at'] ?? '', $a['created_at'] ?? ''));
    return $rows;
}

function notifications_of(string $merchantId): array
{
    $rows = array_values(array_filter(store_read('notifications'), fn($n) => ($n['merchant_id'] ?? '') === $merchantId));
    usort($rows, fn($a, $b) => strcmp($b['created_at'] ?? '', $a['created_at'] ?? ''));
    return $rows;
}

function notify_merchant(string $merchantId, string $text): void
{
    store_insert('notifications', [
        'id'          => new_id(),
        'merchant_id' => $merchantId,
        'text'        => $text,
        'read'        => false,
        'created_at'  => date('c'),
    ]);
}

function notifications_mark_read(string $merchantId): void
{
    $rows = store_read('notifications');
    foreach ($rows as &$n) {
        if (($n['merchant_id'] ?? '') === $merchantId) { $n['read'] = true; }
    }
    unset($n);
    store_write('notifications', $rows);
}

function product_update(string $id, string $merchantId, array $fields): void
{
    $rows = store_read('products');
    foreach ($rows as &$p) {
        if (($p['id'] ?? '') === $id && ($p['merchant_id'] ?? '') === $merchantId) {
            $p = array_merge($p, $fields);
        }
    }
    unset($p);
    store_write('products', $rows);
}

function product_delete(string $id, string $merchantId): void
{
    $rows = array_values(array_filter(
        store_read('products'),
        fn($p) => !(($p['id'] ?? '') === $id && ($p['merchant_id'] ?? '') === $merchantId)
    ));
    store_write('products', $rows);
}

/** Diminue le stock d'un produit (jamais sous 0). */
function product_decrement_stock(string $id, int $qty): void
{
    $rows = store_read('products');
    foreach ($rows as &$p) {
        if (($p['id'] ?? '') === $id) {
            $p['stock'] = max(0, (int) ($p['stock'] ?? 0) - $qty);
        }
    }
    unset($p);
    store_write('products', $rows);
}

/* ---------- Offres / IA ---------- */

function plan_price(array $config, string $plan): int
{
    return (int) ($config['plans'][$plan]['price'] ?? 0);
}

function merchant_can_ai(array $config, array $m): bool
{
    $plan = $m['plan'] ?? 'decouverte';
    return plan_price($config, $plan) >= (int) ($config['ai_min_price'] ?? 600);
}

/**
 * Tendances du marché : agrège les commandes de TOUTES les boutiques pour
 * dégager les catégories et produits les plus demandés. Signal réel (données
 * marketplace) présenté comme aide « IA ». Peut être branché sur un vrai LLM.
 */
function market_trends(int $limit = 5): array
{
    $orders = store_read('orders');
    $products = store_read('products');
    $prodCat = [];
    foreach ($products as $p) { $prodCat[$p['id']] = $p['category'] ?? 'Autre'; }

    $byProduct = [];
    $byCategory = [];
    foreach ($orders as $o) {
        $name = $o['product_name'] ?? '—';
        $qty = (int) ($o['qty'] ?? 1);
        $byProduct[$name] = ($byProduct[$name] ?? 0) + $qty;
        $cat = $prodCat[$o['product_id'] ?? ''] ?? 'Autre';
        $byCategory[$cat] = ($byCategory[$cat] ?? 0) + $qty;
    }
    arsort($byProduct);
    arsort($byCategory);
    return [
        'products'   => array_slice($byProduct, 0, $limit, true),
        'categories' => array_slice($byCategory, 0, $limit, true),
    ];
}

/** État de l'essai d'un vendeur : [classe, libellé, jours_restants]. */
function trial_info(array $m): array
{
    $left = (int) ceil((strtotime($m['trial_ends'] ?? 'now') - time()) / 86400);
    if (($m['status'] ?? '') === 'autorise') { return ['ok', 'Boutique active', $left]; }
    if (($m['status'] ?? '') === 'suspendu') { return ['bad', 'Boutique suspendue', $left]; }
    if ($left > 0) { return ['warn', 'Essai — ' . $left . ' j restant' . ($left > 1 ? 's' : ''), $left]; }
    return ['bad', 'Essai expiré', 0];
}
