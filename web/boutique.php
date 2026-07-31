<?php
/**
 * Marsa — boutique publique d'un vendeur (routée par slug), au thème choisi.
 * Commande en paiement à la livraison ; le stock est décrémenté à la commande.
 */
$config = require __DIR__ . '/includes/config.php';
require __DIR__ . '/includes/store.php';

$slug = (string) ($_GET['s'] ?? '');
$m = $slug !== '' ? merchant_by_slug($slug) : null;
$available = $m !== null && in_array($m['status'] ?? '', ['essai', 'autorise'], true);
$products = $m ? products_of($m['id']) : [];
$theme = $config['themes'][$m['theme'] ?? 'souk'] ?? $config['themes']['souk'];

function money(int $n): string { return number_format($n, 0, ',', ' ') . ' MRU'; }
function is_url(string $s): bool { return (bool) preg_match('#^https?://#i', $s); }
?>
<!DOCTYPE html>
<html lang="fr" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= $m ? htmlspecialchars($m['shop']) . ' — Marsa' : 'Boutique introuvable — Marsa' ?></title>
  <link rel="stylesheet" href="assets/css/style.css">
  <?php if ($available): ?>
  <style>
    :root{--accent:<?= $theme['accent'] ?>;--accent-strong:<?= $theme['accent'] ?>;--harbor:<?= $theme['hero'] ?>}
    :root[data-theme="dark"]{--accent:<?= $theme['accent'] ?>;--accent-strong:<?= $theme['accent'] ?>}
  </style>
  <?php endif; ?>
</head>
<body>
  <header class="top">
    <div class="shell mini-top">
      <a class="brand" href="index.php" aria-label="Marsa">
        <svg class="mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <circle cx="20" cy="17" r="12.5" stroke="var(--accent)" stroke-width="2.4"/>
          <circle cx="20" cy="17" r="4.2" fill="var(--accent)"/>
          <path d="M4 31c4 2.6 7 2.6 10.6 0M14.6 31c3.6 2.6 7 2.6 10.8 0M25.4 31c3.6 2.6 6.6 2.6 10.6 0" stroke="var(--emerald)" stroke-width="2.4" stroke-linecap="round"/>
        </svg>
        <span class="brand-text"><span class="brand-ar">مرسى</span><span class="brand-la">Marsa</span></span>
      </a>
      <a class="mini-back" href="index.php">Marketplace</a>
    </div>
  </header>

  <?php if (!$available): ?>
    <main class="access-main">
      <div class="access-card" style="max-width:440px;text-align:center">
        <h1>Boutique indisponible</h1>
        <p class="sub">Cette boutique n'existe pas ou n'est pas encore ouverte.</p>
        <a class="btn btn-primary" href="index.php">Retour à l'accueil</a>
      </div>
    </main>
  <?php else: ?>
    <section class="shop-hero">
      <div class="shell shop-hero-in">
        <div class="shop-logo"><?= htmlspecialchars(mb_substr($m['shop'], 0, 1)) ?></div>
        <div>
          <h1><?= htmlspecialchars($m['shop']) ?></h1>
          <p class="shop-meta">
            <?php if (!empty($m['category'])): ?><span><?= htmlspecialchars($m['category']) ?></span><?php endif; ?>
            <?php if (!empty($m['city'])): ?><span>· <?= htmlspecialchars($m['city']) ?></span><?php endif; ?>
            <span class="cod-inline">· Paiement à la livraison</span>
          </p>
          <?php if (!empty($m['shop_desc'])): ?><p class="shop-desc"><?= htmlspecialchars($m['shop_desc']) ?></p><?php endif; ?>
        </div>
      </div>
    </section>

    <main class="shell" style="padding-block:34px">
      <?php if (!$products): ?>
        <div class="empty-state">Cette boutique n'a pas encore ajouté de produits.</div>
      <?php else: ?>
      <div class="market-grid">
        <?php foreach ($products as $i => $p):
          $title = $p['title'] ?? $p['name'] ?? '';
          $img = trim((string) ($p['image'] ?? ''));
          $stock = (int) ($p['stock'] ?? 0);
          $compare = (int) ($p['compare_at'] ?? 0);
          $palette = ['linear-gradient(135deg,#C8912A,#8a5a12)','linear-gradient(135deg,#0E2A27,#1E5248)','linear-gradient(135deg,#B5502F,#7a2f18)','linear-gradient(135deg,#2E7263,#134a3a)'];
          $bg = $palette[$i % count($palette)]; ?>
        <div class="pcard">
          <div class="thumb" style="background:<?= $bg ?>">
            <?php if ($compare > $p['price']): ?><span class="badge-promo">-<?= (int) round(100 - $p['price'] * 100 / $compare) ?>%</span><?php endif; ?>
            <span class="badge-cod">Livraison</span>
            <?php if ($img !== '' && is_url($img)): ?><img src="<?= htmlspecialchars($img) ?>" alt="<?= htmlspecialchars($title) ?>" style="width:100%;height:100%;object-fit:cover">
            <?php elseif ($img !== ''): ?><span style="font-size:2.4rem"><?= htmlspecialchars($img) ?></span>
            <?php else: ?>🛍️<?php endif; ?>
          </div>
          <div class="pmeta">
            <b><?= htmlspecialchars($title) ?></b>
            <?php if (!empty($p['description'])): ?><span class="pdesc"><?= htmlspecialchars($p['description']) ?></span><?php endif; ?>
            <span class="price-row"><span class="price"><?= money((int) $p['price']) ?></span><?php if ($compare > $p['price']): ?><span class="price-old"><?= money($compare) ?></span><?php endif; ?></span>
            <?php if ($stock <= 0): ?>
              <span class="sold-out">Épuisé</span>
            <?php else: ?>
              <button class="btn btn-primary order-toggle" type="button" style="margin-top:8px;justify-content:center">Commander</button>
            <?php endif; ?>
          </div>
          <?php if ($stock > 0): ?>
          <form class="order-form" data-product="<?= htmlspecialchars($p['id']) ?>" data-slug="<?= htmlspecialchars($m['slug']) ?>" hidden>
            <input name="customer_name" placeholder="Votre nom" required>
            <input name="customer_phone" type="tel" inputmode="tel" placeholder="Votre téléphone" required>
            <input name="address" placeholder="Adresse (quartier, moughataa)" required>
            <div class="order-row">
              <input name="qty" type="number" min="1" max="<?= $stock ?>" value="1" class="qty">
              <button class="btn btn-primary" type="submit">Valider (paiement livraison)</button>
            </div>
            <p class="order-msg" data-ok="Commande envoyée ✓ Le vendeur vous contactera." data-err="Vérifiez les champs et réessayez."></p>
          </form>
          <?php endif; ?>
        </div>
        <?php endforeach; ?>
      </div>
      <?php endif; ?>
    </main>
  <?php endif; ?>

  <script src="assets/js/app.js"></script>
</body>
</html>
