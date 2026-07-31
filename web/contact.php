<?php
/** Marsa — page contact d'une boutique. */
require __DIR__ . '/includes/app.php';
$slug = (string) ($_GET['s'] ?? '');
$b = $slug !== '' ? q1('SELECT * FROM boutiques WHERE slug = ?', [$slug]) : null;
if (!$b) { redirect('index.php'); }
$theme = cfg()['themes'][$b['theme'] ?? 'souk'] ?? cfg()['themes']['souk'];
?>
<!DOCTYPE html><html lang="fr" dir="ltr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Contact — <?= e($b['nom']) ?></title>
<link rel="stylesheet" href="assets/css/style.css">
<style>:root{--accent:<?= $theme['accent'] ?>;--accent-strong:<?= $theme['accent'] ?>}</style>
</head><body>
<header class="top"><div class="shell mini-top"><?= back_button('boutique.php?s=' . e($b['slug']), $b['nom']) ?><?= brand_mark('Marsa') ?><span></span></div></header>
<main class="access-main"><div class="access-card" style="max-width:460px">
  <?= breadcrumb([['Marketplace', 'index.php'], [$b['nom'], 'boutique.php?s=' . $b['slug']], ['Contact', null]]) ?>
  <h1>Contacter <?= e($b['nom']) ?></h1>
  <ul class="contact-list">
    <?php if ($b['contact_tel']): ?><li><span>📞 Téléphone</span><b><?= e($b['contact_tel']) ?></b></li><?php endif; ?>
    <?php if ($b['contact_email']): ?><li><span>✉️ E-mail</span><b><?= e($b['contact_email']) ?></b></li><?php endif; ?>
    <?php if ($b['zones']): ?><li><span>🚚 Livraison</span><b><?= e($b['zones']) ?></b></li><?php endif; ?>
    <?php if ($b['reseaux']): ?><li><span>🔗 Réseaux</span><a href="<?= e($b['reseaux']) ?>" target="_blank" rel="noopener">Nous suivre</a></li><?php endif; ?>
  </ul>
  <a class="btn btn-primary" href="boutique.php?s=<?= e($b['slug']) ?>">Retour à la boutique</a>
</div></main>
</body></html>
