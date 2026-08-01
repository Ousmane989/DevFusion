<?php
/** Marsa — fiche produit détaillée + ajout au panier. */
require __DIR__ . '/includes/app.php';
app_start();

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
$cartCount = array_sum($_SESSION['cart'][$slug] ?? []);
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
<header class="top"><div class="shell mini-top"><?= back_button('boutique.php?s=' . e($b['slug']), $b['nom']) ?><?= brand_mark('Marsa') ?>
  <a class="mini-back" href="panier.php?s=<?= e($b['slug']) ?>">🛒 Panier<?= $cartCount ? ' (' . (int) $cartCount . ')' : '' ?></a></div></header>

<main class="shell" style="padding-block:28px;max-width:900px">
  <?= breadcrumb([['Marketplace', 'index.php'], [$b['nom'], 'boutique.php?s=' . $b['slug']], [$p['nom'], null]]) ?>
  <div class="product-detail">
    <div class="pd-gallery">
      <div class="pd-media" style="background:linear-gradient(135deg,var(--accent),var(--harbor))">
        <?php if ($img && preg_match('#^(https?:)?/#', $img)): ?><img src="<?= e($img) ?>" alt="<?= e($p['nom']) ?>">
        <?php elseif ($img): ?><span style="font-size:5rem"><?= e($img) ?></span><?php else: ?><span style="font-size:5rem">🛍️</span><?php endif; ?>
      </div>
      <?php if (count($photos) > 1): ?><div class="pd-thumbs"><?php foreach (array_slice($photos, 0, 4) as $ph): ?><span class="pd-thumb"><?php if (preg_match('#^(https?:)?/#', $ph)): ?><img src="<?= e($ph) ?>" alt=""><?php else: ?><?= e($ph) ?><?php endif; ?></span><?php endforeach; ?></div><?php endif; ?>
    </div>
    <div class="pd-info">
      <h1><?= e($p['nom']) ?></h1>
      <div class="price-row" style="font-size:1.3rem"><span class="price"><?= e(money((int) $p['prix'], $devise)) ?></span><?php if ($comp > $p['prix']): ?><span class="price-old"><?= e(money($comp, $devise)) ?></span><span class="badge-promo" style="position:static">-<?= (int) round(100 - $p['prix'] * 100 / $comp) ?>%</span><?php endif; ?></div>
      <?php if ($p['description']): ?><p class="pd-desc"><?= nl2br(e($p['description'])) ?></p><?php endif; ?>
      <p class="pd-stock"><?= (int) $p['stock'] > 0 ? '✔ En stock (' . (int) $p['stock'] . ')' : '✗ Épuisé' ?> · Paiement à la livraison</p>
      <?php if ((int) $p['stock'] > 0): ?>
      <form method="post" action="panier.php" class="pd-order">
        <input type="hidden" name="s" value="<?= e($b['slug']) ?>"><input type="hidden" name="action" value="add"><input type="hidden" name="pid" value="<?= (int) $p['id'] ?>">
        <div class="field-grid" style="align-items:end">
          <div class="field"><label>Quantité</label><input name="qte" type="number" min="1" max="<?= (int) $p['stock'] ?>" value="1"></div>
          <button class="btn btn-primary btn-lg" type="submit">Ajouter au panier</button>
        </div>
      </form>
      <?php else: ?><span class="sold-out">Produit épuisé</span><?php endif; ?>
    </div>
  </div>
</main>
<script src="assets/js/app.js"></script>
</body></html>
