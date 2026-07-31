<?php
/**
 * Marsa — espace partenaire (tableau de bord complet, façon Shopify/Adafrik).
 * Sections : Accueil, Produits, Boutique (thèmes), Tendances IA, Commandes,
 * Notifications. Gestion de stock, personnalisation, IA réservée aux offres.
 */
$config = require __DIR__ . '/includes/config.php';
require __DIR__ . '/includes/auth.php';

$m = require_login();
$id = $m['id'];

if (($_GET['action'] ?? '') === 'logout') { logout(); header('Location: index.php'); exit; }

$tab = $_GET['tab'] ?? 'accueil';
$flash = '';

// Actions POST (CSRF)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && csrf_ok($_POST['csrf'] ?? '')) {
    $act = $_POST['action'] ?? '';
    if ($act === 'add_product' || $act === 'edit_product') {
        $data = [
            'title'          => trim((string) ($_POST['title'] ?? '')),
            'description'    => trim((string) ($_POST['description'] ?? '')),
            'price'          => (int) preg_replace('/\D+/', '', (string) ($_POST['price'] ?? '')),
            'compare_at'     => (int) preg_replace('/\D+/', '', (string) ($_POST['compare_at'] ?? '')),
            'stock'          => (int) preg_replace('/\D+/', '', (string) ($_POST['stock'] ?? '')),
            'category'       => trim((string) ($_POST['category'] ?? '')),
            'image'          => trim((string) ($_POST['image'] ?? '')),
        ];
        if (mb_strlen($data['title']) >= 2 && $data['price'] > 0) {
            if ($act === 'add_product') {
                store_insert('products', array_merge($data, [
                    'id' => new_id(), 'merchant_id' => $id, 'created_at' => date('c'),
                ]));
                $flash = 'Produit ajouté.';
            } else {
                product_update((string) ($_POST['pid'] ?? ''), $id, $data);
                $flash = 'Produit mis à jour.';
            }
        } else { $flash = 'Titre ou prix invalide.'; }
        header('Location: compte.php?tab=produits&f=' . rawurlencode($flash)); exit;
    }
    if ($act === 'delete_product') {
        product_delete((string) ($_POST['pid'] ?? ''), $id);
        header('Location: compte.php?tab=produits&f=' . rawurlencode('Produit supprimé.')); exit;
    }
    if ($act === 'save_shop') {
        $theme = (string) ($_POST['theme'] ?? 'souk');
        if (!isset($config['themes'][$theme])) { $theme = 'souk'; }
        merchant_update($id, fn($r) => array_merge($r, [
            'theme' => $theme,
            'shop_desc' => trim((string) ($_POST['shop_desc'] ?? '')),
        ]));
        header('Location: compte.php?tab=boutique&f=' . rawurlencode('Boutique mise à jour.')); exit;
    }
    if ($act === 'read_notifs') { notifications_mark_read($id); header('Location: compte.php?tab=notifications'); exit; }
}
$flash = (string) ($_GET['f'] ?? '');
$csrf = csrf_token();
$m = merchant_by_id($id); // rafraîchir après éventuelle maj

// Données
$orders   = orders_of($id);
$products  = products_of($id);
$notifs    = notifications_of($id);
$unread    = count(array_filter($notifs, fn($n) => empty($n['read'])));
$ca        = array_sum(array_map(fn($o) => (int) ($o['total'] ?? 0), $orders));
$ventes    = count($orders);
$lowStock  = count(array_filter($products, fn($p) => (int) ($p['stock'] ?? 0) <= 3));
[$sc, $sl] = trial_info($m);
$canAI     = merchant_can_ai($config, $m);
$planName  = $config['plans'][$m['plan'] ?? 'decouverte']['name'] ?? 'Découverte';

function money(int $n): string { return number_format($n, 0, ',', ' ') . ' MRU'; }

$nav = [
    'accueil'       => ['Accueil', '🏠'],
    'produits'      => ['Produits', '📦'],
    'boutique'      => ['Ma boutique', '🎨'],
    'tendances'     => ['Tendances IA', '✨'],
    'commandes'     => ['Commandes', '🧾'],
    'notifications' => ['Notifications', '🔔'],
];
$editing = null;
if ($tab === 'produits' && !empty($_GET['edit'])) { $editing = product_by_id((string) $_GET['edit']); if ($editing && $editing['merchant_id'] !== $id) { $editing = null; } }
?>
<!DOCTYPE html>
<html lang="fr" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Marsa — Espace partenaire · <?= htmlspecialchars($m['shop'] ?? '') ?></title>
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
        <span class="brand-text"><span class="brand-ar">مرسى</span><span class="brand-la">Partenaire</span></span>
      </a>
      <div style="display:flex;gap:10px;align-items:center">
        <a class="btn btn-ghost" href="<?= htmlspecialchars(shop_url($m)) ?>" target="_blank" rel="noopener" style="padding:9px 16px">Voir ma boutique ↗</a>
        <a class="mini-back" href="compte.php?action=logout">Se déconnecter</a>
      </div>
    </div>
  </header>

  <div class="dash-shell">
    <!-- Sidebar -->
    <aside class="dash-side">
      <?php foreach ($nav as $key => $n): ?>
        <a class="side-link<?= $tab === $key ? ' active' : '' ?>" href="compte.php?tab=<?= $key ?>">
          <span class="ic"><?= $n[1] ?></span><span><?= $n[0] ?></span>
          <?php if ($key === 'notifications' && $unread): ?><span class="badge-n"><?= $unread ?></span><?php endif; ?>
        </a>
      <?php endforeach; ?>
      <div class="side-plan">
        <span class="st st-<?= $sc ?>"><?= htmlspecialchars($sl) ?></span>
        <small>Offre <?= htmlspecialchars($planName) ?></small>
      </div>
    </aside>

    <!-- Contenu -->
    <main class="dash-main">
      <?php if ($flash): ?><div class="flash"><?= htmlspecialchars($flash) ?></div><?php endif; ?>

      <?php if ($sc === 'bad' && ($m['status'] ?? '') !== 'autorise'): ?>
        <div class="trial-over">
          <b>Votre essai est terminé.</b> Pour continuer avec votre boutique, contactez notre assistante afin d'activer votre offre <?= htmlspecialchars($planName) ?>.
          <a class="btn btn-primary" href="acces.php">Contacter l'assistante (WhatsApp)</a>
        </div>
      <?php endif; ?>

      <?php if ($tab === 'accueil'): ?>
        <h1 class="dash-title">Bonjour <?= htmlspecialchars($m['first_name'] ?? $m['owner'] ?? '') ?> 👋</h1>
        <p class="dash-addr"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/></svg>
          <a href="<?= htmlspecialchars(shop_url($m)) ?>" target="_blank" rel="noopener"><?= htmlspecialchars(shop_domain($m)) ?></a></p>
        <section class="kpis" style="margin-top:20px">
          <div class="kpi"><span class="kpi-l">Chiffre d'affaires</span><b class="kpi-v"><?= money($ca) ?></b></div>
          <div class="kpi"><span class="kpi-l">Ventes</span><b class="kpi-v"><?= $ventes ?></b></div>
          <div class="kpi"><span class="kpi-l">Produits</span><b class="kpi-v"><?= count($products) ?></b></div>
          <div class="kpi"><span class="kpi-l">Stock faible</span><b class="kpi-v"><?= $lowStock ?></b></div>
        </section>
        <div class="dash-grid" style="margin-top:20px">
          <section class="panel">
            <div class="panel-head"><h2>Dernières commandes</h2><a class="mini-back" href="compte.php?tab=commandes">Tout voir</a></div>
            <?php if (!$orders): ?><div class="empty-state">Aucune commande. Partagez l'adresse de votre boutique.</div>
            <?php else: ?><ul class="mini-list"><?php foreach (array_slice($orders, 0, 5) as $o): ?>
              <li><span><b><?= htmlspecialchars($o['product_name'] ?? '') ?></b> · <?= htmlspecialchars($o['customer_name'] ?? '') ?></span><b><?= money((int) ($o['total'] ?? 0)) ?></b></li>
            <?php endforeach; ?></ul><?php endif; ?>
          </section>
          <section class="panel">
            <div class="panel-head"><h2>Notifications</h2><?php if ($unread): ?><span class="badge-n"><?= $unread ?></span><?php endif; ?></div>
            <?php if (!$notifs): ?><div class="empty-state" style="padding:22px">Rien pour l'instant.</div>
            <?php else: ?><ul class="notif-list"><?php foreach (array_slice($notifs, 0, 5) as $n): ?>
              <li class="<?= empty($n['read']) ? 'unread' : '' ?>"><span class="dot"></span><div><p><?= htmlspecialchars($n['text'] ?? '') ?></p><small><?= htmlspecialchars(date('d/m H:i', strtotime($n['created_at'] ?? 'now'))) ?></small></div></li>
            <?php endforeach; ?></ul><?php endif; ?>
          </section>
        </div>

      <?php elseif ($tab === 'produits'): ?>
        <h1 class="dash-title"><?= $editing ? 'Modifier le produit' : 'Produits' ?></h1>
        <section class="panel">
          <div class="panel-head"><h2><?= $editing ? 'Modifier' : 'Nouveau produit' ?></h2><?php if ($editing): ?><a class="mini-back" href="compte.php?tab=produits">+ Nouveau</a><?php endif; ?></div>
          <form method="post" action="compte.php" class="prod-editor">
            <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf) ?>">
            <input type="hidden" name="action" value="<?= $editing ? 'edit_product' : 'add_product' ?>">
            <?php if ($editing): ?><input type="hidden" name="pid" value="<?= htmlspecialchars($editing['id']) ?>"><?php endif; ?>
            <div class="field"><label>Titre du produit</label><input name="title" required value="<?= htmlspecialchars($editing['title'] ?? $editing['name'] ?? '') ?>" placeholder="Ex. Robe brodée"></div>
            <div class="field"><label>Description</label><textarea name="description" rows="3" placeholder="Décrivez votre produit…"><?= htmlspecialchars($editing['description'] ?? '') ?></textarea></div>
            <div class="field-grid">
              <div class="field"><label>Prix (MRU)</label><input name="price" inputmode="numeric" required value="<?= htmlspecialchars((string) ($editing['price'] ?? '')) ?>" placeholder="5500"></div>
              <div class="field"><label>Prix avant réduction (MRU)</label><input name="compare_at" inputmode="numeric" value="<?= htmlspecialchars((string) ($editing['compare_at'] ?? '')) ?>" placeholder="Optionnel"></div>
            </div>
            <div class="field-grid">
              <div class="field"><label>Stock</label><input name="stock" inputmode="numeric" value="<?= htmlspecialchars((string) ($editing['stock'] ?? '')) ?>" placeholder="10"></div>
              <div class="field"><label>Catégorie</label><input name="category" value="<?= htmlspecialchars($editing['category'] ?? ($m['shop_type'] ?? '')) ?>" placeholder="Mode"></div>
            </div>
            <div class="field"><label>Image (emoji ou lien URL)</label><input name="image" value="<?= htmlspecialchars($editing['image'] ?? '') ?>" placeholder="👗 ou https://…"></div>
            <button class="btn btn-primary" type="submit"><?= $editing ? 'Enregistrer' : 'Ajouter le produit' ?></button>
          </form>
        </section>
        <section class="panel" style="margin-top:20px">
          <div class="panel-head"><h2>Mes produits (<?= count($products) ?>)</h2></div>
          <?php if (!$products): ?><div class="empty-state">Aucun produit. Ajoutez votre premier article ci-dessus.</div>
          <?php else: ?>
          <div class="table-scroll"><table class="admin-table"><thead><tr><th>Produit</th><th>Prix</th><th>Stock</th><th></th></tr></thead><tbody>
            <?php foreach ($products as $p): $t = $p['title'] ?? $p['name'] ?? ''; ?>
            <tr>
              <td><b><?= htmlspecialchars($t) ?></b><?php if (!empty($p['category'])): ?><small><?= htmlspecialchars($p['category']) ?></small><?php endif; ?></td>
              <td><?= money((int) ($p['price'] ?? 0)) ?><?php if (!empty($p['compare_at']) && $p['compare_at'] > $p['price']): ?><small style="text-decoration:line-through"><?= money((int) $p['compare_at']) ?></small><?php endif; ?></td>
              <td><?php $s = (int) ($p['stock'] ?? 0); ?><span class="st <?= $s <= 3 ? 'st-bad' : 'st-ok' ?>"><?= $s ?></span></td>
              <td><div class="row-actions">
                <a class="btn-mini" href="compte.php?tab=produits&edit=<?= htmlspecialchars($p['id']) ?>">Modifier</a>
                <form method="post" action="compte.php" onsubmit="return confirm('Supprimer ce produit ?')" style="margin:0"><input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf) ?>"><input type="hidden" name="action" value="delete_product"><input type="hidden" name="pid" value="<?= htmlspecialchars($p['id']) ?>"><button class="btn-mini bad" type="submit">Suppr.</button></form>
              </div></td>
            </tr>
            <?php endforeach; ?>
          </tbody></table></div>
          <?php endif; ?>
        </section>

      <?php elseif ($tab === 'boutique'): ?>
        <h1 class="dash-title">Ma boutique</h1>
        <p class="dash-addr"><a href="<?= htmlspecialchars(shop_url($m)) ?>" target="_blank" rel="noopener"><?= htmlspecialchars(shop_domain($m)) ?> ↗</a></p>
        <section class="panel" style="margin-top:16px">
          <form method="post" action="compte.php">
            <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf) ?>">
            <input type="hidden" name="action" value="save_shop">
            <div class="panel-head"><h2>Thème de la boutique</h2></div>
            <div class="theme-choice">
              <?php foreach ($config['themes'] as $key => $th): ?>
                <label class="theme-opt">
                  <input type="radio" name="theme" value="<?= htmlspecialchars($key) ?>"<?= ($m['theme'] ?? 'souk') === $key ? ' checked' : '' ?>>
                  <span class="theme-swatch" style="background:linear-gradient(135deg,<?= $th['accent'] ?>,<?= $th['hero'] ?>)"></span>
                  <b><?= htmlspecialchars($th['name']) ?></b>
                </label>
              <?php endforeach; ?>
            </div>
            <div class="field" style="margin-top:16px"><label>Description de la boutique</label><textarea name="shop_desc" rows="3" placeholder="Présentez votre boutique en quelques mots…"><?= htmlspecialchars($m['shop_desc'] ?? '') ?></textarea></div>
            <button class="btn btn-primary" type="submit">Enregistrer</button>
          </form>
        </section>

      <?php elseif ($tab === 'tendances'): ?>
        <h1 class="dash-title">Tendances du marché <span class="ai-pill">IA</span></h1>
        <?php if (!$canAI): ?>
          <div class="locked">
            <div class="lock-ic">🔒</div>
            <h2>Fonctionnalité des offres payantes</h2>
            <p>L'assistant IA « Tendances » est inclus à partir de l'offre <b>Découverte (600 MRU/mois)</b>. Activez votre offre pour découvrir les produits qui marchent sur votre marché.</p>
            <a class="btn btn-primary" href="acces.php">Activer mon offre</a>
          </div>
        <?php else: $tr = market_trends(6); ?>
          <p class="sub" style="max-width:60ch">Analyse des ventes de l'ensemble du marché Marsa pour repérer ce qui se vend. Mis à jour en continu.</p>
          <div class="dash-grid" style="margin-top:18px">
            <section class="panel">
              <div class="panel-head"><h2>🔥 Catégories en tendance</h2></div>
              <?php if (!$tr['categories']): ?><div class="empty-state" style="padding:22px">Pas encore assez de données de marché.</div>
              <?php else: ?><ul class="trend-list"><?php foreach ($tr['categories'] as $cat => $q): ?><li><span><?= htmlspecialchars($cat) ?></span><span class="trend-bar" style="--w:<?= min(100, $q * 20) ?>%"></span><b><?= (int) $q ?></b></li><?php endforeach; ?></ul><?php endif; ?>
            </section>
            <section class="panel">
              <div class="panel-head"><h2>⭐ Produits les plus demandés</h2></div>
              <?php if (!$tr['products']): ?><div class="empty-state" style="padding:22px">Pas encore de ventes sur le marché.</div>
              <?php else: ?><ul class="mini-list"><?php foreach ($tr['products'] as $name => $q): ?><li><span><?= htmlspecialchars($name) ?></span><b><?= (int) $q ?> vendus</b></li><?php endforeach; ?></ul><?php endif; ?>
            </section>
          </div>
          <section class="panel" style="margin-top:20px">
            <div class="panel-head"><h2>💡 Suggestions pour « <?= htmlspecialchars($m['shop_type'] ?? 'votre marché') ?> »</h2></div>
            <p class="sub">Idées d'articles à mettre en avant selon votre catégorie et la demande actuelle : soignez vos <b>photos</b>, proposez un <b>prix avant réduction</b> visible, et gardez du <b>stock</b> sur vos best-sellers.</p>
          </section>
        <?php endif; ?>

      <?php elseif ($tab === 'commandes'): ?>
        <h1 class="dash-title">Commandes (<?= $ventes ?>)</h1>
        <section class="panel">
          <?php if (!$orders): ?><div class="empty-state">Aucune commande pour l'instant.</div>
          <?php else: ?>
          <div class="table-scroll"><table class="admin-table"><thead><tr><th>Produit</th><th>Client</th><th>Adresse</th><th>Montant</th><th>Paiement</th><th>Date</th></tr></thead><tbody>
            <?php foreach ($orders as $o): ?>
            <tr>
              <td><b><?= htmlspecialchars($o['product_name'] ?? '') ?></b><small>x<?= (int) ($o['qty'] ?? 1) ?></small></td>
              <td><?= htmlspecialchars($o['customer_name'] ?? '') ?><small><?= htmlspecialchars($o['customer_phone'] ?? '') ?></small></td>
              <td><small><?= htmlspecialchars($o['address'] ?? '') ?></small></td>
              <td><b><?= money((int) ($o['total'] ?? 0)) ?></b></td>
              <td><span class="st st-warn">Livraison</span></td>
              <td><small><?= htmlspecialchars(date('d/m H:i', strtotime($o['created_at'] ?? 'now'))) ?></small></td>
            </tr>
            <?php endforeach; ?>
          </tbody></table></div>
          <?php endif; ?>
        </section>

      <?php elseif ($tab === 'notifications'): ?>
        <h1 class="dash-title">Notifications</h1>
        <section class="panel">
          <div class="panel-head"><h2><?= $unread ?> non lue<?= $unread > 1 ? 's' : '' ?></h2>
            <?php if ($unread): ?><form method="post" action="compte.php" style="margin:0"><input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf) ?>"><button class="btn-mini" name="action" value="read_notifs" type="submit">Tout marquer lu</button></form><?php endif; ?>
          </div>
          <?php if (!$notifs): ?><div class="empty-state">Aucune notification.</div>
          <?php else: ?><ul class="notif-list"><?php foreach ($notifs as $n): ?>
            <li class="<?= empty($n['read']) ? 'unread' : '' ?>"><span class="dot"></span><div><p><?= htmlspecialchars($n['text'] ?? '') ?></p><small><?= htmlspecialchars(date('d/m/Y H:i', strtotime($n['created_at'] ?? 'now'))) ?></small></div></li>
          <?php endforeach; ?></ul><?php endif; ?>
        </section>
      <?php endif; ?>
    </main>
  </div>
</body>
</html>
