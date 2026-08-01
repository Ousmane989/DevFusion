<?php
/** Marsa — boutique publique (catalogue). Hors-ligne si compte verrouillé. */
require __DIR__ . '/includes/app.php';
app_start();

$slug = (string) ($_GET['s'] ?? '');
$b = $slug !== '' ? q1('SELECT * FROM boutiques WHERE slug = ?', [$slug]) : null;
$owner = $b ? q1('SELECT * FROM utilisateurs WHERE id = ?', [$b['user_id']]) : null;
if ($owner) { $owner = sync_status($owner); $b = q1('SELECT * FROM boutiques WHERE id = ?', [$b['id']]); }
$live = $b && (int) $b['en_ligne'] === 1 && (int) $b['configuree'] === 1 && $owner && in_array($owner['statut'], ['essai', 'actif'], true);

$theme = cfg()['themes'][$b['theme'] ?? 'souk'] ?? cfg()['themes']['souk'];
$devise = $b['devise'] ?? 'MRU';

if ($b && $live) {
    // Comptage de visite (basique)
    q('INSERT INTO visites (boutique_id, jour, ip, cree_le) VALUES (?,?,?,?)', [$b['id'], date('Y-m-d'), $_SERVER['REMOTE_ADDR'] ?? '', date('c')]);
}
function money2(int $n, string $d): string { return number_format($n, 0, ',', ' ') . ' ' . $d; }
?>
<!DOCTYPE html><html lang="fr" dir="ltr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= $b ? e($b['nom']) . ' — Marsa' : 'Boutique — Marsa' ?></title>
<link rel="stylesheet" href="assets/css/style.css">
<?php if ($live): ?><style>:root{--accent:<?= $theme['accent'] ?>;--accent-strong:<?= $theme['accent'] ?>;--harbor:<?= $theme['hero'] ?>}:root[data-theme="dark"]{--accent:<?= $theme['accent'] ?>;--accent-strong:<?= $theme['accent'] ?>}</style><?php endif; ?>
</head><body>
<?php $cartCount = $b ? array_sum($_SESSION['cart'][$b['slug']] ?? []) : 0; ?>
<header class="top"><div class="shell mini-top"><a class="mini-back" href="index.php">Marketplace</a><?= brand_mark('Marsa') ?><?php if ($live): ?><a class="mini-back" href="panier.php?s=<?= e($b['slug']) ?>">🛒 Panier<?= $cartCount ? ' (' . (int) $cartCount . ')' : '' ?></a><?php else: ?><span></span><?php endif; ?></div></header>

<?php if (!$b || !$live): ?>
  <main class="access-main"><div class="access-card" style="max-width:460px;text-align:center">
    <h1><?= $b ? 'Boutique temporairement indisponible' : 'Boutique introuvable' ?></h1>
    <p class="sub"><?= $b ? 'Cette boutique est momentanément hors ligne. Revenez bientôt.' : 'Cette adresse ne correspond à aucune boutique.' ?></p>
    <a class="btn btn-primary" href="index.php">Retour à l'accueil</a>
  </div></main>
<?php else:
  $cats = q('SELECT * FROM categories WHERE boutique_id=? ORDER BY ordre, id', [$b['id']])->fetchAll();
  $catFilter = trim((string) ($_GET['cat'] ?? ''));
  $sql = "SELECT p.* FROM produits p LEFT JOIN categories c ON c.boutique_id=p.boutique_id AND c.nom=p.categorie WHERE p.boutique_id=? AND p.visible=1";
  $params = [$b['id']];
  if ($catFilter !== '') { $sql .= " AND p.categorie=?"; $params[] = $catFilter; }
  $sql .= " ORDER BY COALESCE(c.ordre,999), p.id DESC";
  $produits = q($sql, $params)->fetchAll(); ?>
  <section class="shop-hero" <?= $b['banniere'] ? 'style="background-image:linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.45)),url(' . e($b['banniere']) . ');background-size:cover;background-position:center"' : '' ?>>
    <div class="shell shop-hero-in">
      <div class="shop-logo"><?php if ($b['logo']): ?><img src="<?= e($b['logo']) ?>" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:14px"><?php else: ?><?= e(mb_substr($b['nom'], 0, 1)) ?><?php endif; ?></div>
      <div>
        <h1><?= e($b['nom']) ?></h1>
        <p class="shop-meta"><?php if ($b['categorie']): ?><span><?= e($b['categorie']) ?></span><?php endif; ?><span class="cod-inline">· Paiement à la livraison</span></p>
        <?php if ($b['description']): ?><p class="shop-desc"><?= e($b['description']) ?></p><?php endif; ?>
      </div>
    </div>
  </section>

  <main class="shell" style="padding-block:34px">
    <?php if ($cats): ?>
    <div class="chips" style="margin-bottom:22px">
      <a class="chip<?= $catFilter === '' ? ' chip-on' : '' ?>" href="boutique.php?s=<?= e($b['slug']) ?>">Tout</a>
      <?php foreach ($cats as $c): ?><a class="chip<?= $catFilter === $c['nom'] ? ' chip-on' : '' ?>" href="boutique.php?s=<?= e($b['slug']) ?>&cat=<?= rawurlencode($c['nom']) ?>"><?= e($c['nom']) ?></a><?php endforeach; ?>
    </div>
    <?php endif; ?>
    <?php if (!$produits): ?><div class="empty-state">Aucun produit dans cette sélection.</div>
    <?php else: ?>
    <div class="market-grid">
      <?php foreach ($produits as $i => $p):
        $photos = array_filter(array_map('trim', explode(',', (string) $p['photos'])));
        $img = $photos[0] ?? '';
        $stock = (int) $p['stock']; $comp = (int) $p['prix_compare'];
        $pal = ['linear-gradient(135deg,#C8912A,#8a5a12)','linear-gradient(135deg,#0E2A27,#1E5248)','linear-gradient(135deg,#B5502F,#7a2f18)','linear-gradient(135deg,#2E7263,#134a3a)'];
        $bg = $pal[$i % 4]; ?>
      <a class="pcard" href="produit.php?s=<?= e($b['slug']) ?>&id=<?= (int) $p['id'] ?>">
        <div class="thumb" style="background:<?= $bg ?>">
          <?php if ($comp > $p['prix']): ?><span class="badge-promo">-<?= (int) round(100 - $p['prix'] * 100 / $comp) ?>%</span><?php endif; ?>
          <?php if ($img && preg_match('#^https?://#', $img)): ?><img src="<?= e($img) ?>" alt="<?= e($p['nom']) ?>" style="width:100%;height:100%;object-fit:cover">
          <?php elseif ($img): ?><span style="font-size:2.4rem"><?= e($img) ?></span><?php else: ?>🛍️<?php endif; ?>
        </div>
        <div class="pmeta">
          <b><?= e($p['nom']) ?></b>
          <span class="price-row"><span class="price"><?= e(money2((int) $p['prix'], $devise)) ?></span><?php if ($comp > $p['prix']): ?><span class="price-old"><?= e(money2($comp, $devise)) ?></span><?php endif; ?></span>
          <?php if ($stock <= 0): ?><span class="sold-out">Épuisé</span><?php else: ?><span class="btn btn-primary" style="margin-top:8px;justify-content:center">Voir le produit</span><?php endif; ?>
        </div>
      </a>
      <?php endforeach; ?>
    </div>
    <?php endif; ?>
  </main>

  <footer class="shop-foot">
    <div class="shell">
      <div><b><?= e($b['nom']) ?></b><?php if ($b['description']): ?><p><?= e($b['description']) ?></p><?php endif; ?></div>
      <div class="shop-foot-contact">
        <a href="contact.php?s=<?= e($b['slug']) ?>">Contact</a>
        <?php if ($b['contact_tel']): ?><span>📞 <?= e($b['contact_tel']) ?></span><?php endif; ?>
        <?php if ($b['zones']): ?><span>🚚 <?= e($b['zones']) ?></span><?php endif; ?>
      </div>
    </div>
    <p class="shop-foot-mini">Propulsé par <a href="index.php">Marsa</a> · Paiement à la livraison</p>
  </footer>
<?php endif; ?>
<script src="assets/js/app.js"></script>
</body></html>
