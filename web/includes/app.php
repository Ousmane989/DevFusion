<?php
/**
 * Marsa — socle applicatif : sessions sécurisées, CSRF, états de compte,
 * gardes d'accès, codes de vérification, e-mail, statistiques (côté serveur),
 * navigation (retour + fil d'Ariane). Tout contrôle critique est ici, serveur.
 */
require_once __DIR__ . '/db.php';
$GLOBALS['CONFIG'] = require __DIR__ . '/config.php';

function cfg(): array { return $GLOBALS['CONFIG']; }

/* ---------------- Session & CSRF ---------------- */
function app_start(): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax']);
        session_start();
    }
}
function csrf_token(): string
{
    app_start();
    if (empty($_SESSION['csrf'])) { $_SESSION['csrf'] = bin2hex(random_bytes(16)); }
    return $_SESSION['csrf'];
}
function csrf_ok($t): bool
{
    app_start();
    return !empty($_SESSION['csrf']) && is_string($t) && hash_equals($_SESSION['csrf'], $t);
}

/* ---------------- Utilisateurs & sessions ---------------- */
function current_user(): ?array
{
    app_start();
    if (empty($_SESSION['uid'])) { return null; }
    $u = q1('SELECT * FROM utilisateurs WHERE id = ?', [$_SESSION['uid']]);
    return $u ? sync_status($u) : null;
}
function login_user(array $u): void
{
    app_start();
    session_regenerate_id(true);
    $_SESSION['uid'] = (int) $u['id'];
}
function logout_user(): void
{
    app_start();
    $_SESSION = [];
    session_destroy();
}

/**
 * Recalcule l'état du compte côté serveur : un essai expiré non payé passe à
 * « verrouille » ; un abonnement actif expiré repasse à « verrouille ». La
 * boutique est mise hors ligne quand le compte est verrouillé.
 */
function sync_status(array $u): array
{
    $now = time();
    $changed = false;
    if ($u['statut'] === 'essai' && $u['essai_fin'] && strtotime($u['essai_fin']) < $now) {
        $u['statut'] = 'verrouille'; $changed = true;
    }
    if ($u['statut'] === 'actif' && $u['abo_fin'] && strtotime($u['abo_fin']) < $now) {
        $u['statut'] = 'verrouille'; $changed = true;
    }
    if ($changed) {
        q('UPDATE utilisateurs SET statut = ? WHERE id = ?', [$u['statut'], $u['id']]);
        if ($u['statut'] === 'verrouille') {
            q('UPDATE boutiques SET en_ligne = 0 WHERE user_id = ?', [$u['id']]);
        }
    }
    return $u;
}

function require_login(): array
{
    $u = current_user();
    if ($u === null) { redirect('connexion.php'); }
    return $u;
}

/**
 * Garde des pages de l'espace client. Redirige selon l'état :
 *  - non_verifie  -> vérification e-mail
 *  - verrouille   -> page de paiement
 * $allow : contextes autorisés malgré l'état (ex. 'paiement', 'verif').
 */
function guard_app(string $allow = ''): array
{
    $u = require_login();
    if ($u['statut'] === 'non_verifie' && $allow !== 'verif') { redirect('verification.php'); }
    if ($u['statut'] === 'verrouille' && $allow !== 'paiement') { redirect('paiement.php'); }
    return $u;
}

function redirect(string $to): void { header('Location: ' . $to); exit; }

/* ---------------- Boutique (multi-tenant) ---------------- */
function boutique_of(int $uid): ?array
{
    return q1('SELECT * FROM boutiques WHERE user_id = ?', [$uid]);
}
/** Vérifie qu'une boutique appartient bien à l'utilisateur (isolation). */
function own_boutique_or_404(array $u): array
{
    $b = boutique_of((int) $u['id']);
    if ($b === null) { redirect('assistant.php'); }
    return $b;
}

function slugify_str(string $s): string
{
    $s = mb_strtolower(trim($s), 'UTF-8');
    if (function_exists('iconv')) { $t = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s); if ($t !== false) { $s = $t; } }
    $s = preg_replace('/[^a-z0-9]+/', '-', $s);
    $s = trim((string) $s, '-');
    return substr($s, 0, 30) ?: 'boutique';
}
function unique_slug(string $base): string
{
    $base = slugify_str($base);
    $slug = $base; $i = 2;
    while (q1('SELECT id FROM boutiques WHERE slug = ?', [$slug])) { $slug = $base . '-' . $i; $i++; }
    return $slug;
}
function shop_url(array $b): string { return 'boutique.php?s=' . rawurlencode($b['slug']); }
function shop_domain(array $b): string { return $b['slug'] . '.marsa.mr'; }

/* ---------------- Offres / devises ---------------- */
function plan_info(string $plan): array
{
    $p = cfg()['plans'][$plan] ?? cfg()['plans']['basique'];
    return $p + ['key' => $plan];
}
function currency_of_country(string $pays): string
{
    return $pays === 'SN' ? 'XOF' : 'MRU';
}
function money(int $n, string $devise = 'MRU'): string
{
    return number_format($n, 0, ',', ' ') . ' ' . $devise;
}
function merchant_can_ai(array $u): bool
{
    return plan_info($u['plan'])['price'] >= (int) (cfg()['ai_min_price'] ?? 600);
}

/* ---------------- Codes de vérification & e-mail ---------------- */
function gen_code(int $uid, string $type = 'email'): string
{
    $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    q('UPDATE codes_verification SET utilise = 1 WHERE user_id = ? AND type = ? AND utilise = 0', [$uid, $type]);
    q('INSERT INTO codes_verification (user_id, code, type, expire_le, cree_le) VALUES (?,?,?,?,?)',
      [$uid, $code, $type, date('c', time() + 15 * 60), date('c')]);
    return $code;
}
function verify_code(int $uid, string $code, string $type = 'email'): bool
{
    $row = q1('SELECT * FROM codes_verification WHERE user_id = ? AND type = ? AND utilise = 0 ORDER BY id DESC LIMIT 1', [$uid, $type]);
    if ($row === null) { return false; }
    if (strtotime($row['expire_le']) < time()) { return false; }
    if (!hash_equals($row['code'], preg_replace('/\D+/', '', $code))) { return false; }
    q('UPDATE codes_verification SET utilise = 1 WHERE id = ?', [$row['id']]);
    return true;
}
/**
 * Envoi du code par e-mail. mail() nécessite un serveur mail configuré chez
 * l'hébergeur ; en local on journalise et on affiche le code (mode démo).
 */
function send_code(array $u, string $code, string $type = 'email'): void
{
    $sujet = $type === 'reset' ? 'Marsa — Réinitialisation du mot de passe' : 'Marsa — Code de vérification';
    $corps = "Bonjour {$u['nom']},\n\nVotre code Marsa : {$code}\nIl expire dans 15 minutes.\n\n— Marsa";
    if (!empty($u['email'])) {
        @mail($u['email'], $sujet, $corps, "From: Marsa <no-reply@marsa.mr>\r\nContent-Type: text/plain; charset=UTF-8");
        @file_put_contents(__DIR__ . '/../storage/mail.log', date('c') . "  {$u['email']}  {$sujet}  code={$code}\n", FILE_APPEND | LOCK_EX);
    }
    app_start();
    $_SESSION['demo_code'] = $code; // affiché en mode démo (pas de SMTP)
}

/* ---------------- Statistiques (calcul serveur) ---------------- */
/** CA = somme des commandes NON annulées. */
function stats_boutique(int $bid): array
{
    $ca   = (int) (q1("SELECT COALESCE(SUM(total),0) s FROM commandes WHERE boutique_id=? AND statut!='annulee'", [$bid])['s'] ?? 0);
    $nb   = (int) (q1("SELECT COUNT(*) c FROM commandes WHERE boutique_id=? AND statut!='annulee'", [$bid])['c'] ?? 0);
    $prod = (int) (q1("SELECT COUNT(*) c FROM produits WHERE boutique_id=? AND visible=1", [$bid])['c'] ?? 0);
    $vis  = (int) (q1("SELECT COUNT(*) c FROM visites WHERE boutique_id=?", [$bid])['c'] ?? 0);
    $panier = $nb > 0 ? (int) round($ca / $nb) : 0;

    $sum = function (string $since) use ($bid): int {
        return (int) (q1("SELECT COALESCE(SUM(total),0) s FROM commandes WHERE boutique_id=? AND statut!='annulee' AND cree_le>=?", [$bid, $since])['s'] ?? 0);
    };
    $sumBetween = function (string $a, string $b) use ($bid): int {
        return (int) (q1("SELECT COALESCE(SUM(total),0) s FROM commandes WHERE boutique_id=? AND statut!='annulee' AND cree_le>=? AND cree_le<?", [$bid, $a, $b])['s'] ?? 0);
    };
    $today = date('c', strtotime('today'));
    $week  = date('c', strtotime('-7 days'));
    $month = date('c', strtotime('-30 days'));

    // Série 30 jours (pour le graphique)
    $serie = [];
    for ($i = 29; $i >= 0; $i--) {
        $d0 = date('Y-m-d', strtotime("-$i days"));
        $s = (int) (q1("SELECT COALESCE(SUM(total),0) s FROM commandes WHERE boutique_id=? AND statut!='annulee' AND substr(cree_le,1,10)=?", [$bid, $d0])['s'] ?? 0);
        $serie[$d0] = $s;
    }
    // Top produits
    $top = q("SELECT lc.nom nom, SUM(lc.qte) q, SUM(lc.total) t FROM lignes_commande lc JOIN commandes c ON c.id=lc.commande_id WHERE c.boutique_id=? AND c.statut!='annulee' GROUP BY lc.nom ORDER BY q DESC LIMIT 6", [$bid])->fetchAll();

    return [
        'ca' => $ca, 'commandes' => $nb, 'panier' => $panier, 'produits' => $prod, 'visiteurs' => $vis,
        'ca_jour' => $sum($today), 'ca_semaine' => $sum($week), 'ca_mois' => $sum($month),
        'ca_semaine_prec' => $sumBetween(date('c', strtotime('-14 days')), $week),
        'ca_mois_prec' => $sumBetween(date('c', strtotime('-60 days')), $month),
        'serie' => $serie, 'top' => $top,
    ];
}

/* ---------------- Navigation (retour + fil d'Ariane) ---------------- */
/** Bouton retour réel (href logique, pas history.back). */
function back_button(string $href, string $label = 'Retour'): string
{
    return '<a class="mini-back" href="' . htmlspecialchars($href) . '">'
        . '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>'
        . '<span>' . htmlspecialchars($label) . '</span></a>';
}
/** Fil d'Ariane : [[libellé, href|null], ...]. */
function breadcrumb(array $items): string
{
    $out = '<nav class="crumb">';
    $last = count($items) - 1;
    foreach ($items as $i => [$label, $href]) {
        if ($href !== null && $i !== $last) {
            $out .= '<a href="' . htmlspecialchars($href) . '">' . htmlspecialchars($label) . '</a><span>›</span>';
        } else {
            $out .= '<b>' . htmlspecialchars($label) . '</b>';
        }
    }
    return $out . '</nav>';
}

function e(?string $s): string { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }

/** Logo + nom (utilisé aussi par les pages publiques sans layout complet). */
function brand_mark(string $sub = 'Marsa'): string
{
    return '<a class="brand" href="index.php" aria-label="Marsa">'
        . '<svg class="mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">'
        . '<circle cx="20" cy="17" r="12.5" stroke="var(--accent)" stroke-width="2.4"/>'
        . '<circle cx="20" cy="17" r="4.2" fill="var(--accent)"/>'
        . '<path d="M4 31c4 2.6 7 2.6 10.6 0M14.6 31c3.6 2.6 7 2.6 10.8 0M25.4 31c3.6 2.6 6.6 2.6 10.6 0" stroke="var(--emerald)" stroke-width="2.4" stroke-linecap="round"/></svg>'
        . '<span class="brand-text"><span class="brand-ar">مرسى</span><span class="brand-la">' . e($sub) . '</span></span></a>';
}
