<?php
/** Marsa — panier (multi-articles) et validation de commande (COD). */
require __DIR__ . '/includes/app.php';
app_start();

$slug = (string) ($_GET['s'] ?? $_POST['s'] ?? '');
$b = $slug !== '' ? q1('SELECT * FROM boutiques WHERE slug = ?', [$slug]) : null;
$owner = $b ? q1('SELECT * FROM utilisateurs WHERE id = ?', [$b['user_id']]) : null;
if ($owner) { $owner = sync_status($owner); $b = q1('SELECT * FROM boutiques WHERE id = ?', [$b['id']]); }
$live = $b && (int) $b['en_ligne'] === 1 && $owner && in_array($owner['statut'], ['essai', 'actif'], true);
if (!$b || !$live) { redirect('boutique.php?s=' . rawurlencode($slug)); }

$theme = cfg()['themes'][$b['theme'] ?? 'souk'] ?? cfg()['themes']['souk'];
$devise = $b['devise'] ?? 'MRU';
if (!isset($_SESSION['cart'])) { $_SESSION['cart'] = []; }
$cart = &$_SESSION['cart'][$slug];
if (!is_array($cart)) { $cart = []; }
$ok = false; $err = '';

$action = $_POST['action'] ?? $_GET['action'] ?? '';
if ($action === 'add') {
    $pid = (int) ($_POST['pid'] ?? 0);
    $qte = max(1, (int) ($_POST['qte'] ?? 1));
    $p = q1('SELECT * FROM produits WHERE id=? AND boutique_id=? AND visible=1', [$pid, $b['id']]);
    if ($p && (int) $p['stock'] > 0) {
        $cart[$pid] = min((int) $p['stock'], ($cart[$pid] ?? 0) + $qte);
    }
    redirect('panier.php?s=' . rawurlencode($slug));
}
if ($action === 'update') {
    foreach (($_POST['qte'] ?? []) as $pid => $q) {
        $pid = (int) $pid; $q = (int) $q;
        if ($q <= 0) { unset($cart[$pid]); }
        else { $p = q1('SELECT stock FROM produits WHERE id=? AND boutique_id=?', [$pid, $b['id']]); if ($p) { $cart[$pid] = min((int) $p['stock'], $q); } }
    }
    redirect('panier.php?s=' . rawurlencode($slug));
}
if ($action === 'remove') { unset($cart[(int) ($_GET['pid'] ?? 0)]); redirect('panier.php?s=' . rawurlencode($slug)); }

// Construire les lignes courantes
$lignes = []; $total = 0;
foreach ($cart as $pid => $qte) {
    $p = q1('SELECT * FROM produits WHERE id=? AND boutique_id=? AND visible=1', [(int) $pid, $b['id']]);
    if (!$p) { unset($cart[$pid]); continue; }
    $qte = min((int) $qte, (int) $p['stock']);
    if ($qte <= 0) { unset($cart[$pid]); continue; }
    $lt = (int) $p['prix'] * $qte;
    $total += $lt;
    $lignes[] = ['p' => $p, 'qte' => $qte, 'total' => $lt];
}

if ($action === 'checkout' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $nom = trim((string) ($_POST['client_nom'] ?? ''));
    $tel = preg_replace('/\D+/', '', (string) ($_POST['client_tel'] ?? ''));
    $adr = trim((string) ($_POST['adresse'] ?? ''));
    if (!$lignes) { $err = 'Votre panier est vide.'; }
    elseif (mb_strlen($nom) < 2 || strlen($tel) < 8 || mb_strlen($adr) < 2) { $err = 'Vérifiez vos coordonnées.'; }
    else {
        q('INSERT INTO commandes (boutique_id, client_nom, client_tel, adresse, total, devise, paiement, statut, cree_le) VALUES (?,?,?,?,?,?,?,?,?)',
          [$b['id'], $nom, $tel, $adr, $total, $devise, 'cod', 'en_attente', date('c')]);
        $oid = (int) db()->lastInsertId();
        foreach ($lignes as $l) {
            q('INSERT INTO lignes_commande (commande_id, produit_id, nom, prix, qte, total) VALUES (?,?,?,?,?,?)',
              [$oid, $l['p']['id'], $l['p']['nom'], (int) $l['p']['prix'], $l['qte'], $l['total']]);
            q('UPDATE produits SET stock = MAX(0, stock - ?) WHERE id=?', [$l['qte'], $l['p']['id']]);
        }
        $_SESSION['cart'][$slug] = [];
        $ok = true; $lignes = []; $total = 0;
    }
}

function m2(int $n, string $d): string { return number_format($n, 0, ',', ' ') . ' ' . $d; }
?>
<!DOCTYPE html><html lang="fr" dir="ltr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Panier — <?= e($b['nom']) ?></title>
<link rel="stylesheet" href="assets/css/style.css">
<style>:root{--accent:<?= $theme['accent'] ?>;--accent-strong:<?= $theme['accent'] ?>;--harbor:<?= $theme['hero'] ?>}:root[data-theme="dark"]{--accent:<?= $theme['accent'] ?>;--accent-strong:<?= $theme['accent'] ?>}</style>
</head><body>
<header class="top"><div class="shell mini-top"><?= back_button('boutique.php?s=' . e($b['slug']), $b['nom']) ?><?= brand_mark('Marsa') ?><span></span></div></header>
<main class="shell" style="padding-block:28px;max-width:760px">
  <?= breadcrumb([['Marketplace', 'index.php'], [$b['nom'], 'boutique.php?s=' . $b['slug']], ['Panier', null]]) ?>
  <?php if ($ok): ?>
    <div class="order-success"><div class="ok-badge">✓</div><h1>Commande envoyée !</h1><p class="sub">Merci. Le vendeur vous contactera pour la livraison — vous paierez <b>à la réception</b>.</p><a class="btn btn-primary" href="boutique.php?s=<?= e($b['slug']) ?>">Continuer mes achats</a></div>
  <?php elseif (!$lignes): ?>
    <div class="empty-state">Votre panier est vide. <a href="boutique.php?s=<?= e($b['slug']) ?>" style="color:var(--accent-strong);font-weight:700">Parcourir la boutique</a></div>
  <?php else: ?>
    <h1 class="dash-title">Votre panier</h1>
    <?php if ($err): ?><div class="flash err"><?= e($err) ?></div><?php endif; ?>
    <form method="post" action="panier.php"><input type="hidden" name="s" value="<?= e($slug) ?>"><input type="hidden" name="action" value="update">
      <div class="cart-list">
        <?php foreach ($lignes as $l): $p = $l['p']; ?>
          <div class="cart-row">
            <div class="cart-info"><b><?= e($p['nom']) ?></b><span><?= e(m2((int) $p['prix'], $devise)) ?></span></div>
            <input class="cart-qty" type="number" name="qte[<?= (int) $p['id'] ?>]" min="0" max="<?= (int) $p['stock'] ?>" value="<?= (int) $l['qte'] ?>">
            <b class="cart-lt"><?= e(m2((int) $l['total'], $devise)) ?></b>
            <a class="cart-rm" href="panier.php?s=<?= e($slug) ?>&action=remove&pid=<?= (int) $p['id'] ?>" title="Retirer">✕</a>
          </div>
        <?php endforeach; ?>
      </div>
      <div class="cart-actions"><button class="btn btn-ghost" type="submit">Mettre à jour</button><div class="cart-total">Total : <b><?= e(m2($total, $devise)) ?></b></div></div>
    </form>

    <section class="panel" style="margin-top:20px">
      <div class="panel-head"><h2>Livraison & paiement à la livraison</h2></div>
      <form method="post" action="panier.php" class="pd-order">
        <input type="hidden" name="s" value="<?= e($slug) ?>"><input type="hidden" name="action" value="checkout">
        <div class="field"><label>Votre nom</label><input name="client_nom" required></div>
        <div class="field-grid">
          <div class="field"><label>Téléphone</label><input name="client_tel" type="tel" inputmode="tel" required></div>
          <div class="field"><label>Adresse</label><input name="adresse" required placeholder="Quartier, moughataa, ville"></div>
        </div>
        <button class="btn btn-primary btn-lg" type="submit">Valider la commande (<?= e(m2($total, $devise)) ?>)</button>
      </form>
    </section>
  <?php endif; ?>
</main>
<script src="assets/js/app.js"></script>
</body></html>
