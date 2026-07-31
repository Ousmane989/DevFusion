<?php
/**
 * Marsa — authentification vendeur.
 * Sessions sécurisées, hachage de mot de passe (password_hash), jeton CSRF.
 */
require_once __DIR__ . '/store.php';

function auth_start(): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_set_cookie_params([
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }
}

function csrf_token(): string
{
    auth_start();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(16));
    }
    return $_SESSION['csrf'];
}

function csrf_ok($token): bool
{
    auth_start();
    return !empty($_SESSION['csrf']) && is_string($token) && hash_equals($_SESSION['csrf'], $token);
}

function current_merchant(): ?array
{
    auth_start();
    if (empty($_SESSION['merchant_id'])) { return null; }
    return merchant_by_id($_SESSION['merchant_id']);
}

function require_login(): array
{
    $m = current_merchant();
    if ($m === null) {
        header('Location: connexion.php');
        exit;
    }
    return $m;
}

function login_merchant(array $m): void
{
    auth_start();
    session_regenerate_id(true);
    $_SESSION['merchant_id'] = $m['id'];
}

function logout(): void
{
    auth_start();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
}

/**
 * URL publique de la boutique. En production, avec un DNS joker et un vhost,
 * cela devient https://{slug}.marsa.mr ; ici on route par slug.
 */
function shop_url(array $m): string
{
    return 'boutique.php?s=' . rawurlencode($m['slug'] ?? '');
}

function shop_domain(array $m): string
{
    return ($m['slug'] ?? 'boutique') . '.marsa.mr';
}
