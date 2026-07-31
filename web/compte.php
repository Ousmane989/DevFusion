<?php
/**
 * Marsa — espace vendeur (tableau de bord).
 * Statistiques (chiffre d'affaires, ventes), commandes, notifications,
 * gestion des produits. Accès réservé au vendeur connecté.
 */
$config = require __DIR__ . '/includes/config.php';
require __DIR__ . '/includes/auth.php';

$m = require_login();
$id = $m['id'];

// Déconnexion
if (($_GET['action'] ?? '') === 'logout') { logout(); header('Location: index.php'); exit; }

// Actions (POST, protégées par CSRF)
$flash = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && csrf_ok($_POST['csrf'] ?? '')) {
    $act = $_POST['action'] ?? '';
    if ($act === 'add_product') {
        $name  = trim((string) ($_POST['name'] ?? ''));
        $price = (int) preg_replace('/\D+/', '', (string) ($_POST['price'] ?? ''));
        $stock = (int) preg_replace('/\D+/', '', (string) ($_POST['stock'] ?? ''));
        if (mb_strlen($name) >= 2 && $price > 0) {
            store_insert('products', [
                'id' => new_id(), 'merchant_id' => $id, 'name' => $name,
                'price' => $price, 'stock' => $stock, 'created_at' => date('c'),
            ]);
            $flash = 'Produit ajouté.';
        } else {
            $flash = 'Nom ou prix invalide.';
        }
    } elseif ($act === 'read_notifs') {
        notifications_mark_read($id);
    }
    header('Location: compte.php' . ($flash ? '?f=' . rawurlencode($flash) : ''));
    exit;
}
$flash = (string) ($_GET['f'] ?? '');
$csrf = csrf_token();

// Données
$orders = orders_of($id);
$products = products_of($id);
$notifs = notifications_of($id);
$unread = count(array_filter($notifs, fn($n) => empty($n['read'])));
$ca = array_sum(array_map(fn($o) => (int) ($o['total'] ?? 0), $orders));
$ventes = count($orders);

// État de l'essai
$ends = strtotime($m['trial_ends'] ?? 'now');
$left = (int) ceil(($ends - time()) / 86400);
if (($m['status'] ?? '') === 'autorise') { [$sc, $sl] = ['ok', 'Boutique autorisée']; }
elseif (($m['status'] ?? '') === 'suspendu') { [$sc, $sl] = ['bad', 'Boutique suspendue']; }
elseif ($left > 0) { [$sc, $sl] = ['warn', 'Essai — ' . $left . ' j restant' . ($left > 1 ? 's' : '')]; }
else { [$sc, $sl] = ['bad', 'Essai expiré — autorisation requise']; }

function money(int $n): string { return number_format($n, 0, ',', ' ') . ' MRU'; }
?>
<!DOCTYPE html>
<html lang="fr" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Marsa — Espace vendeur · <?= htmlspecialchars($m['shop'] ?? '') ?></title>
  <meta name="robots" content="noindex">
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
  <header class="top">
    <div class="shell mini-top">
      <a class="brand" href="compte.php" aria-label="Marsa">
        <svg class="mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <circle cx="20" cy="17" r="12.5" stroke="var(--accent)" stroke-width="2.4"/>
          <circle cx="20" cy="17" r="4.2" fill="var(--accent)"/>
          <path d="M4 31c4 2.6 7 2.6 10.6 0M14.6 31c3.6 2.6 7 2.6 10.8 0M25.4 31c3.6 2.6 6.6 2.6 10.6 0" stroke="var(--emerald)" stroke-width="2.4" stroke-linecap="round"/>
        </svg>
        <span class="brand-text"><span class="brand-ar">مرسى</span><span class="brand-la">Espace vendeur</span></span>
      </a>
      <div style="display:flex;gap:10px;align-items:center">
        <a class="btn btn-ghost" href="<?= htmlspecialchars(shop_url($m)) ?>" target="_blank" rel="noopener" style="padding:9px 16px">Voir ma boutique</a>
        <a class="mini-back" href="compte.php?action=logout">Se déconnecter</a>
      </div>
    </div>
  </header>

  <main class="shell" style="padding-block:30px;display:grid;gap:26px">

    <!-- En-tête boutique -->
    <section class="dash-hero">
      <div>
        <span class="eyebrow">Tableau de bord</span>
        <h1 style="font-size:1.8rem;margin-top:6px"><?= htmlspecialchars($m['shop'] ?? '') ?></h1>
        <p class="dash-addr">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/></svg>
          <a href="<?= htmlspecialchars(shop_url($m)) ?>" target="_blank" rel="noopener"><?= htmlspecialchars(shop_domain($m)) ?></a>
        </p>
      </div>
      <span class="st st-<?= $sc ?>" style="font-size:.84rem"><?= htmlspecialchars($sl) ?></span>
    </section>

    <?php if ($flash): ?><div class="flash"><?= htmlspecialchars($flash) ?></div><?php endif; ?>

    <!-- Statistiques -->
    <section class="kpis">
      <div class="kpi"><span class="kpi-l">Chiffre d'affaires</span><b class="kpi-v"><?= money($ca) ?></b></div>
      <div class="kpi"><span class="kpi-l">Ventes</span><b class="kpi-v"><?= $ventes ?></b></div>
      <div class="kpi"><span class="kpi-l">Produits</span><b class="kpi-v"><?= count($products) ?></b></div>
      <div class="kpi"><span class="kpi-l">Notifications</span><b class="kpi-v"><?= $unread ?><?= $unread ? ' <small>non lues</small>' : '' ?></b></div>
    </section>

    <div class="dash-grid">
      <!-- Colonne principale : commandes -->
      <section class="panel">
        <div class="panel-head"><h2>Commandes reçues</h2></div>
        <?php if (!$orders): ?>
          <div class="empty-state">Aucune commande pour l'instant. Partagez l'adresse de votre boutique pour recevoir vos premières commandes.</div>
        <?php else: ?>
        <div class="table-scroll">
          <table class="admin-table">
            <thead><tr><th>Produit</th><th>Client</th><th>Montant</th><th>Statut</th><th>Date</th></tr></thead>
            <tbody>
            <?php foreach ($orders as $o): ?>
              <tr>
                <td><b><?= htmlspecialchars($o['product_name'] ?? '') ?></b><small>x<?= (int) ($o['qty'] ?? 1) ?></small></td>
                <td><?= htmlspecialchars($o['customer_name'] ?? '') ?><small><?= htmlspecialchars($o['customer_phone'] ?? '') ?></small></td>
                <td><b><?= money((int) ($o['total'] ?? 0)) ?></b><small>Paiement livraison</small></td>
                <td><span class="st st-warn"><?= htmlspecialchars($o['status'] ?? 'nouvelle') ?></span></td>
                <td><small><?= htmlspecialchars(date('d/m H:i', strtotime($o['created_at'] ?? 'now'))) ?></small></td>
              </tr>
            <?php endforeach; ?>
            </tbody>
          </table>
        </div>
        <?php endif; ?>
      </section>

      <!-- Colonne latérale : notifications -->
      <section class="panel">
        <div class="panel-head">
          <h2>Notifications</h2>
          <?php if ($unread): ?>
            <form method="post" action="compte.php" style="margin:0">
              <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf) ?>">
              <button class="btn-mini" name="action" value="read_notifs" type="submit">Tout marquer lu</button>
            </form>
          <?php endif; ?>
        </div>
        <?php if (!$notifs): ?>
          <div class="empty-state" style="padding:24px">Pas encore de notification.</div>
        <?php else: ?>
          <ul class="notif-list">
            <?php foreach (array_slice($notifs, 0, 12) as $n): ?>
              <li class="<?= empty($n['read']) ? 'unread' : '' ?>">
                <span class="dot"></span>
                <div>
                  <p><?= htmlspecialchars($n['text'] ?? '') ?></p>
                  <small><?= htmlspecialchars(date('d/m H:i', strtotime($n['created_at'] ?? 'now'))) ?></small>
                </div>
              </li>
            <?php endforeach; ?>
          </ul>
        <?php endif; ?>
      </section>
    </div>

    <!-- Produits -->
    <section class="panel">
      <div class="panel-head"><h2>Mes produits</h2></div>
      <form method="post" action="compte.php" class="product-form">
        <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf) ?>">
        <input type="hidden" name="action" value="add_product">
        <input name="name" placeholder="Nom du produit" required>
        <input name="price" inputmode="numeric" placeholder="Prix (MRU)" required>
        <input name="stock" inputmode="numeric" placeholder="Stock">
        <button class="btn btn-primary" type="submit">Ajouter</button>
      </form>
      <?php if ($products): ?>
      <div class="table-scroll" style="margin-top:16px">
        <table class="admin-table">
          <thead><tr><th>Produit</th><th>Prix</th><th>Stock</th></tr></thead>
          <tbody>
          <?php foreach ($products as $p): ?>
            <tr><td><b><?= htmlspecialchars($p['name'] ?? '') ?></b></td><td><?= money((int) ($p['price'] ?? 0)) ?></td><td><?= (int) ($p['stock'] ?? 0) ?></td></tr>
          <?php endforeach; ?>
          </tbody>
        </table>
      </div>
      <?php endif; ?>
    </section>
  </main>
</body>
</html>
