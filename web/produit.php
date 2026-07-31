<?php
/** Marsa — fiche produit + commande en paiement à la livraison. */
require __DIR__ . '/includes/app.php';

$slug = (string) ($_GET['s'] ?? '');
$b = $slug !== '' ? q1('SELECT * FROM boutiques WHERE slug = ?', [$slug]) : null;
$owner = $b ? q1('SELECT * FROM utilisateurs WHERE id = ?', [$b['user_id']]) : null;
if ($owner) { $owner = sync_status($owner); $b = q1('SELECT * FROM boutiques WHERE id = ?', [$b['id']]); }
$live = $b && (int) $b['en_ligne'] === 1 && $owner && in_array($owner['statut'], ['essai', 'actif'], true);
if (!$b || !$live) { redirect('boutique.php?s=' . rawurlencode($slug)); }

$p = q1('SELECT * FROM produits WHERE id=? AND boutique_id=? AND visible=1', [(int) ($_GET['id'] ?? 0), $b['id']]);
if (!$p) { redirect('boutique.php?s=' . rawurlencode($slug)); }

$theme = cfg()['themes'][$b['theme'] ?? 'souk'] ?? cfg()['themes']['souk'];
$devise = $b['devise'] ?? 'MRU';
$ok = false; $err = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nom = trim((string) ($_POST['client_nom'] ?? ''));
    $tel = preg_replace('/\D+/', '', (string) ($_POST['client_tel'] ?? ''));
    $adr = trim((string) ($_POST['adresse'] ?? ''));
    $qte = max(1, (int) ($_POST['qte'] ?? 1));
    $stock = (int) $p['stock'];
    if (mb_strlen($nom) < 2 || strlen($tel) < 8 || mb_strlen($adr) < 2) { $err = 'Vérifiez vos coordonnées.'; }
    elseif ($stock <= 0) { $err = 'Produit épuisé.'; }
    else {
        if ($qte > $stock) { $qte = $stock; }
        $total = (int) $p['prix'] * $qte;
        q('INSERT INTO commandes (boutique_id, client_nom, client_tel, adresse, total, devise, paiement, statut, cree_le) VALUES (?,?,?,?,?,?,?,?,?)',
          [$b['id'], $nom, $tel, $adr, $total, $devise, 'cod', 'en_attente', date('c')]);
        $oid = (int) db()->lastInsertId();
        q('INSERT INTO lignes_commande (commande_id, produit_id, nom, prix, qte, total) VALUES (?,?,?,?,?,?)',
          [$oid, $p['id'], $p['nom'], (int) $p['prix'], $qte, $total]);
        q('UPDATE produits SET stock = MAX(0, stock - ?) WHERE id=?', [$qte, $p['id']]);
        $p['stock'] = max(0, $stock - $qte);
        $ok = true;
    }
}

$photos = array_filter(array_map('trim', explode(',', (string) $p['photos'])));
$img = $photos[0] ?? '';
$comp = (int) $p['prix_compare'];
?>
<!DOCTYPE html><html lang="fr" dir="ltr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($p['nom']) ?> — <?= e($b['nom']) ?></title>
<link rel="stylesheet" href="assets/css/style.css">
<style>:root{--accent:<?= $theme['accent'] ?>;--accent-strong:<?= $theme['accent'] ?>;--harbor:<?= $theme['hero'] ?>}:root[data-theme="dark"]{--accent:<?= $theme['accent'] ?>;--accent-strong:<?= $theme['accent'] ?>}</style>
</head><body>
<header class="top"><div class="shell mini-top"><?= back_button('boutique.php?s=' . e($b['slug']), $b['nom']) ?><?= brand_mark('Marsa') ?><span></span></div></header>

<main class="shell" style="padding-block:28px;max-width:900px">
  <?= breadcrumb([['Marketplace', 'index.php'], [$b['nom'], 'boutique.php?s=' . $b['slug']], [$p['nom'], null]]) ?>
  <?php if ($ok): ?>
    <div class="order-success">
      <div class="ok-badge">✓</div>
      <h1>Commande envoyée !</h1>
      <p class="sub">Merci <?= e($_POST['client_nom']) ?>. Le vendeur vous contactera pour la livraison. Vous paierez <b>à la réception</b>.</p>
      <a class="btn btn-primary" href="boutique.php?s=<?= e($b['slug']) ?>">Continuer mes achats</a>
    </div>
  <?php else: ?>
  <div class="product-detail">
    <div class="pd-media" style="background:linear-gradient(135deg,var(--accent),var(--harbor))">
      <?php if ($img && preg_match('#^https?://#', $img)): ?><img src="<?= e($img) ?>" alt="<?= e($p['nom']) ?>">
      <?php elseif ($img): ?><span style="font-size:5rem"><?= e($img) ?></span><?php else: ?><span style="font-size:5rem">🛍️</span><?php endif; ?>
    </div>
    <div class="pd-info">
      <h1><?= e($p['nom']) ?></h1>
      <div class="price-row" style="font-size:1.3rem"><span class="price"><?= e(money($p['prix'], $devise)) ?></span><?php if ($comp > $p['prix']): ?><span class="price-old"><?= e(money($comp, $devise)) ?></span><span class="badge-promo" style="position:static">-<?= (int) round(100 - $p['prix'] * 100 / $comp) ?>%</span><?php endif; ?></div>
      <?php if ($p['description']): ?><p class="pd-desc"><?= nl2br(e($p['description'])) ?></p><?php endif; ?>
      <p class="pd-stock"><?= (int) $p['stock'] > 0 ? '✔ En stock (' . (int) $p['stock'] . ')' : '✗ Épuisé' ?> · Paiement à la livraison</p>
      <?php if ($err): ?><div class="flash err"><?= e($err) ?></div><?php endif; ?>
      <?php if ((int) $p['stock'] > 0): ?>
      <form method="post" action="produit.php?s=<?= e($b['slug']) ?>&id=<?= (int) $p['id'] ?>" class="pd-order">
        <div class="field"><label>Votre nom</label><input name="client_nom" required></div>
        <div class="field-grid">
          <div class="field"><label>Téléphone</label><input name="client_tel" type="tel" inputmode="tel" required></div>
          <div class="field"><label>Quantité</label><input name="qte" type="number" min="1" max="<?= (int) $p['stock'] ?>" value="1"></div>
        </div>
        <div class="field"><label>Adresse de livraison</label><input name="adresse" required placeholder="Quartier, moughataa, ville"></div>
        <button class="btn btn-primary btn-lg" type="submit">Commander — paiement à la livraison</button>
      </form>
      <?php else: ?><span class="sold-out">Produit épuisé</span><?php endif; ?>
    </div>
  </div>
  <?php endif; ?>
</main>
<script src="assets/js/app.js"></script>
</body></html>
