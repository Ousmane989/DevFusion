<?php
/** Marsa — espace client (tableau de bord). Accès cloisonné par utilisateur. */
require __DIR__ . '/includes/layout.php';

$u = guard_app();                 // connecté, vérifié, non verrouillé
$b = boutique_of((int) $u['id']);
if (!$b) { redirect('assistant.php'); }
$bid = (int) $b['id'];
$csrf = csrf_token();
$devise = $b['devise'] ?: currency_of_country($u['pays']);
$plan = plan_info($u['plan']);

/* -------- Export CSV (avant tout affichage) -------- */
if (($_GET['export'] ?? '') === 'commandes') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="commandes-marsa.csv"');
    $out = fopen('php://output', 'w');
    fputcsv($out, ['Date', 'Client', 'Téléphone', 'Adresse', 'Total', 'Devise', 'Statut']);
    foreach (q('SELECT * FROM commandes WHERE boutique_id=? ORDER BY id DESC', [$bid])->fetchAll() as $o) {
        fputcsv($out, [$o['cree_le'], $o['client_nom'], $o['client_tel'], $o['adresse'], $o['total'], $o['devise'], $o['statut']]);
    }
    fclose($out); exit;
}

/* -------- Actions POST (CSRF + propriété vérifiée côté serveur) -------- */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && csrf_ok($_POST['csrf'] ?? '')) {
    $act = $_POST['action'] ?? '';
    if ($act === 'add_product' || $act === 'edit_product') {
        $data = [
            'nom' => trim((string) ($_POST['nom'] ?? '')),
            'description' => trim((string) ($_POST['description'] ?? '')),
            'prix' => (int) preg_replace('/\D+/', '', (string) ($_POST['prix'] ?? '')),
            'prix_compare' => (int) preg_replace('/\D+/', '', (string) ($_POST['prix_compare'] ?? '')),
            'stock' => (int) preg_replace('/\D+/', '', (string) ($_POST['stock'] ?? '')),
            'categorie' => trim((string) ($_POST['categorie'] ?? '')),
            'photos' => trim((string) ($_POST['photos'] ?? '')),
            'visible' => isset($_POST['visible']) ? 1 : 0,
        ];
        $f = '';
        if (mb_strlen($data['nom']) < 2 || $data['prix'] <= 0) { $f = 'Nom ou prix invalide.'; }
        elseif ($act === 'add_product') {
            $count = (int) q1('SELECT COUNT(*) c FROM produits WHERE boutique_id=?', [$bid])['c'];
            if ($plan['max_produits'] >= 0 && $count >= $plan['max_produits']) {
                $f = 'Limite de votre offre atteinte (' . $plan['max_produits'] . ' produits). Passez à une offre supérieure.';
            } else {
                q('INSERT INTO produits (boutique_id, nom, description, prix, prix_compare, stock, categorie, photos, visible, cree_le) VALUES (?,?,?,?,?,?,?,?,?,?)',
                  [$bid, $data['nom'], $data['description'], $data['prix'], $data['prix_compare'], $data['stock'], $data['categorie'], $data['photos'], $data['visible'], date('c')]);
                $f = 'Produit ajouté.';
            }
        } else {
            $pid = (int) ($_POST['pid'] ?? 0);
            // Propriété : le produit doit appartenir à CETTE boutique.
            if (q1('SELECT id FROM produits WHERE id=? AND boutique_id=?', [$pid, $bid])) {
                q('UPDATE produits SET nom=?, description=?, prix=?, prix_compare=?, stock=?, categorie=?, photos=?, visible=? WHERE id=? AND boutique_id=?',
                  [$data['nom'], $data['description'], $data['prix'], $data['prix_compare'], $data['stock'], $data['categorie'], $data['photos'], $data['visible'], $pid, $bid]);
                $f = 'Produit mis à jour.';
            }
        }
        redirect('compte.php?tab=produits&f=' . rawurlencode($f));
    }
    if ($act === 'delete_product') {
        q('DELETE FROM produits WHERE id=? AND boutique_id=?', [(int) ($_POST['pid'] ?? 0), $bid]);
        redirect('compte.php?tab=produits&f=' . rawurlencode('Produit supprimé.'));
    }
    if ($act === 'order_status') {
        $st = (string) ($_POST['statut'] ?? '');
        if (in_array($st, ['en_attente', 'confirmee', 'expediee', 'livree', 'annulee'], true)) {
            q('UPDATE commandes SET statut=? WHERE id=? AND boutique_id=?', [$st, (int) ($_POST['oid'] ?? 0), $bid]);
        }
        redirect('compte.php?tab=commandes&f=' . rawurlencode('Statut mis à jour.'));
    }
    if ($act === 'save_boutique') {
        $theme = isset(cfg()['themes'][$_POST['theme'] ?? '']) ? $_POST['theme'] : $b['theme'];
        q('UPDATE boutiques SET nom=?, description=?, categorie=?, theme=?, couleur=?, contact_tel=?, contact_email=?, reseaux=?, zones=?, logo=?, banniere=? WHERE user_id=?',
          [trim((string) $_POST['nom']), trim((string) $_POST['description']), trim((string) $_POST['categorie']), $theme, cfg()['themes'][$theme]['accent'],
           trim((string) $_POST['contact_tel']), trim((string) $_POST['contact_email']), trim((string) $_POST['reseaux']), trim((string) $_POST['zones']),
           trim((string) $_POST['logo']), trim((string) $_POST['banniere']), $u['id']]);
        redirect('compte.php?tab=boutique&f=' . rawurlencode('Boutique mise à jour.'));
    }
}

$tab = $_GET['tab'] ?? 'accueil';
$flash = (string) ($_GET['f'] ?? '');
$s = stats_boutique($bid);
$unread = 0;
$produits = q('SELECT * FROM produits WHERE boutique_id=? ORDER BY id DESC', [$bid])->fetchAll();
$commandes = q('SELECT * FROM commandes WHERE boutique_id=? ORDER BY id DESC', [$bid])->fetchAll();

$nav = ['accueil' => ['Accueil', '🏠'], 'produits' => ['Produits', '📦'], 'commandes' => ['Commandes', '🧾'], 'boutique' => ['Ma boutique', '🎨'], 'abonnement' => ['Abonnement', '💳']];
$editing = null;
if ($tab === 'produits' && !empty($_GET['edit'])) {
    $editing = q1('SELECT * FROM produits WHERE id=? AND boutique_id=?', [(int) $_GET['edit'], $bid]);
}
$statutFr = ['en_attente' => 'En attente', 'confirmee' => 'Confirmée', 'expediee' => 'Expédiée', 'livree' => 'Livrée', 'annulee' => 'Annulée'];

// Points du graphique CA (30 j)
$vals = array_values($s['serie']);
$max = max(1, max($vals));
$pts = [];
$n = count($vals);
foreach ($vals as $i => $v) {
    $x = $n > 1 ? ($i / ($n - 1)) * 100 : 0;
    $y = 100 - ($v / $max) * 92 - 4;
    $pts[] = round($x, 2) . ',' . round($y, 2);
}
$poly = implode(' ', $pts);

head('Marsa — Tableau de bord · ' . $b['nom']);
topbar('', '<a class="btn btn-ghost" href="' . e(shop_url($b)) . '" target="_blank" rel="noopener" style="padding:9px 16px">Voir ma boutique ↗</a> <a class="mini-back" href="deconnexion.php">Se déconnecter</a>', 'Espace client');
?>
<div class="dash-shell">
  <aside class="dash-side">
    <?php foreach ($nav as $key => $it): ?>
      <a class="side-link<?= $tab === $key ? ' active' : '' ?>" href="compte.php?tab=<?= $key ?>"><span class="ic"><?= $it[1] ?></span><span><?= $it[0] ?></span></a>
    <?php endforeach; ?>
    <div class="side-plan">
      <span class="st st-ok">Offre <?= e($plan['name']) ?></span>
      <small><?= $u['statut'] === 'actif' ? 'Actif jusqu\'au ' . e(date('d/m/Y', strtotime($u['abo_fin']))) : 'Essai — fin ' . e(date('d/m', strtotime($u['essai_fin']))) ?></small>
    </div>
  </aside>

  <main class="dash-main">
    <?php
    $crumbMap = ['accueil' => 'Accueil', 'produits' => 'Produits', 'commandes' => 'Commandes', 'boutique' => 'Ma boutique', 'abonnement' => 'Abonnement'];
    $crumb = [['Tableau de bord', 'compte.php']];
    if ($tab !== 'accueil') { $crumb[] = [$crumbMap[$tab] ?? $tab, $editing ? 'compte.php?tab=produits' : null]; }
    if ($editing) { $crumb[] = ['Modifier un produit', null]; }
    echo breadcrumb($crumb);
    echo flash_banner($flash, 'ok');
    ?>

    <?php if ($tab === 'accueil'): ?>
      <h1 class="dash-title">Bonjour <?= e(explode(' ', $u['nom'])[0]) ?> 👋</h1>
      <p class="dash-addr"><a href="<?= e(shop_url($b)) ?>" target="_blank" rel="noopener"><?= e(shop_domain($b)) ?> ↗</a></p>
      <section class="kpis" style="margin-top:18px">
        <div class="kpi"><span class="kpi-l">Chiffre d'affaires</span><b class="kpi-v"><?= e(money($s['ca'], $devise)) ?></b></div>
        <div class="kpi"><span class="kpi-l">Commandes</span><b class="kpi-v"><?= $s['commandes'] ?></b></div>
        <div class="kpi"><span class="kpi-l">Panier moyen</span><b class="kpi-v"><?= e(money($s['panier'], $devise)) ?></b></div>
        <div class="kpi"><span class="kpi-l">Produits en ligne</span><b class="kpi-v"><?= $s['produits'] ?></b></div>
      </section>
      <section class="kpis" style="margin-top:14px">
        <div class="kpi"><span class="kpi-l">CA aujourd'hui</span><b class="kpi-v"><?= e(money($s['ca_jour'], $devise)) ?></b></div>
        <div class="kpi"><span class="kpi-l">CA 7 jours</span><b class="kpi-v"><?= e(money($s['ca_semaine'], $devise)) ?></b>
          <?php $d = $s['ca_semaine'] - $s['ca_semaine_prec']; ?><small style="color:<?= $d >= 0 ? 'var(--emerald)' : 'var(--clay)' ?>"><?= $d >= 0 ? '▲' : '▼' ?> vs 7 j préc.</small></div>
        <div class="kpi"><span class="kpi-l">CA 30 jours</span><b class="kpi-v"><?= e(money($s['ca_mois'], $devise)) ?></b></div>
        <div class="kpi"><span class="kpi-l">Visiteurs</span><b class="kpi-v"><?= $s['visiteurs'] ?></b></div>
      </section>
      <div class="dash-grid" style="margin-top:20px">
        <section class="panel">
          <div class="panel-head"><h2>Évolution du CA (30 jours)</h2></div>
          <svg class="chart" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="<?= e($poly) ?>" fill="none" stroke="var(--accent)" stroke-width="1.4" vector-effect="non-scaling-stroke"/></svg>
        </section>
        <section class="panel">
          <div class="panel-head"><h2>Produits les plus vendus</h2></div>
          <?php if (!$s['top']): ?><div class="empty-state" style="padding:22px">Pas encore de vente.</div>
          <?php else: $tmax = max(array_map(fn($t) => (int) $t['q'], $s['top'])); ?>
            <ul class="trend-list"><?php foreach ($s['top'] as $t): ?><li><span><?= e($t['nom']) ?></span><span class="trend-bar" style="--w:<?= max(6, round($t['q'] / max(1, $tmax) * 100)) ?>%"></span><b><?= (int) $t['q'] ?></b></li><?php endforeach; ?></ul>
          <?php endif; ?>
        </section>
      </div>
      <section class="panel" style="margin-top:20px">
        <div class="panel-head"><h2>Dernières commandes</h2><a class="mini-back" href="compte.php?tab=commandes">Tout voir</a></div>
        <?php if (!$commandes): ?><div class="empty-state">Aucune commande. Partagez l'adresse de votre boutique.</div>
        <?php else: ?><ul class="mini-list"><?php foreach (array_slice($commandes, 0, 5) as $o): ?><li><span><b><?= e($o['client_nom']) ?></b> · <?= e($statutFr[$o['statut']] ?? $o['statut']) ?></span><b><?= e(money((int) $o['total'], $devise)) ?></b></li><?php endforeach; ?></ul><?php endif; ?>
      </section>

    <?php elseif ($tab === 'produits'): ?>
      <h1 class="dash-title"><?= $editing ? 'Modifier le produit' : 'Produits' ?></h1>
      <section class="panel">
        <div class="panel-head"><h2><?= $editing ? 'Modifier' : 'Nouveau produit' ?></h2><?php if ($editing): ?><a class="mini-back" href="compte.php?tab=produits">+ Nouveau</a><?php endif; ?></div>
        <form method="post" action="compte.php" class="prod-editor">
          <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
          <input type="hidden" name="action" value="<?= $editing ? 'edit_product' : 'add_product' ?>">
          <?php if ($editing): ?><input type="hidden" name="pid" value="<?= (int) $editing['id'] ?>"><?php endif; ?>
          <div class="field"><label>Nom du produit</label><input name="nom" required value="<?= e($editing['nom'] ?? '') ?>" placeholder="Ex. Robe brodée"></div>
          <div class="field"><label>Description</label><textarea name="description" rows="3" placeholder="Décrivez votre produit…"><?= e($editing['description'] ?? '') ?></textarea></div>
          <div class="field-grid">
            <div class="field"><label>Prix (<?= e($devise) ?>)</label><input name="prix" inputmode="numeric" required value="<?= e((string) ($editing['prix'] ?? '')) ?>" placeholder="5500"></div>
            <div class="field"><label>Prix avant réduction</label><input name="prix_compare" inputmode="numeric" value="<?= e((string) ($editing['prix_compare'] ?? '')) ?>" placeholder="Optionnel"></div>
          </div>
          <div class="field-grid">
            <div class="field"><label>Stock</label><input name="stock" inputmode="numeric" value="<?= e((string) ($editing['stock'] ?? '')) ?>" placeholder="10"></div>
            <div class="field"><label>Catégorie</label><input name="categorie" value="<?= e($editing['categorie'] ?? $b['categorie']) ?>"></div>
          </div>
          <div class="field"><label>Photos (liens séparés par des virgules, ou emoji)</label><input name="photos" value="<?= e($editing['photos'] ?? '') ?>" placeholder="👗 ou https://…, https://…"></div>
          <label class="check"><input type="checkbox" name="visible" <?= ($editing['visible'] ?? 1) ? 'checked' : '' ?>> Visible sur la boutique</label>
          <button class="btn btn-primary" type="submit"><?= $editing ? 'Enregistrer' : 'Ajouter le produit' ?></button>
        </form>
      </section>
      <section class="panel" style="margin-top:20px">
        <div class="panel-head"><h2>Mes produits (<?= count($produits) ?><?= $plan['max_produits'] >= 0 ? ' / ' . $plan['max_produits'] : '' ?>)</h2></div>
        <?php if (!$produits): ?><div class="empty-state">Aucun produit. Ajoutez votre premier article ci-dessus.</div>
        <?php else: ?>
        <div class="table-scroll"><table class="admin-table"><thead><tr><th>Produit</th><th>Prix</th><th>Stock</th><th>État</th><th></th></tr></thead><tbody>
          <?php foreach ($produits as $p): ?>
          <tr>
            <td><b><?= e($p['nom']) ?></b><?php if ($p['categorie']): ?><small><?= e($p['categorie']) ?></small><?php endif; ?></td>
            <td><?= e(money((int) $p['prix'], $devise)) ?><?php if ($p['prix_compare'] > $p['prix']): ?><small style="text-decoration:line-through"><?= e(money((int) $p['prix_compare'], $devise)) ?></small><?php endif; ?></td>
            <td><span class="st <?= $p['stock'] <= 3 ? 'st-bad' : 'st-ok' ?>"><?= (int) $p['stock'] ?></span></td>
            <td><span class="st <?= $p['visible'] ? 'st-ok' : 'st-warn' ?>"><?= $p['visible'] ? 'Visible' : 'Masqué' ?></span></td>
            <td><div class="row-actions">
              <a class="btn-mini" href="compte.php?tab=produits&edit=<?= (int) $p['id'] ?>">Modifier</a>
              <form method="post" action="compte.php" onsubmit="return confirm('Supprimer « <?= e($p['nom']) ?> » ?')" style="margin:0"><input type="hidden" name="csrf" value="<?= e($csrf) ?>"><input type="hidden" name="action" value="delete_product"><input type="hidden" name="pid" value="<?= (int) $p['id'] ?>"><button class="btn-mini bad" type="submit">Suppr.</button></form>
            </div></td>
          </tr>
          <?php endforeach; ?>
        </tbody></table></div>
        <?php endif; ?>
      </section>

    <?php elseif ($tab === 'commandes'): ?>
      <h1 class="dash-title">Commandes (<?= count($commandes) ?>)</h1>
      <div class="panel-head" style="margin-bottom:12px"><span></span><a class="btn-mini" href="compte.php?export=commandes">Exporter CSV</a></div>
      <section class="panel">
        <?php if (!$commandes): ?><div class="empty-state">Aucune commande pour l'instant.</div>
        <?php else: ?>
        <div class="table-scroll"><table class="admin-table"><thead><tr><th>Client</th><th>Adresse</th><th>Total</th><th>Statut</th><th>Date</th></tr></thead><tbody>
          <?php foreach ($commandes as $o): $lignes = q('SELECT * FROM lignes_commande WHERE commande_id=?', [$o['id']])->fetchAll(); ?>
          <tr>
            <td><b><?= e($o['client_nom']) ?></b><small><?= e($o['client_tel']) ?></small><small><?php foreach ($lignes as $l) { echo e($l['qte'] . '× ' . $l['nom']) . '<br>'; } ?></small></td>
            <td><small><?= e($o['adresse']) ?></small></td>
            <td><b><?= e(money((int) $o['total'], $devise)) ?></b><small>Livraison</small></td>
            <td>
              <form method="post" action="compte.php" style="margin:0">
                <input type="hidden" name="csrf" value="<?= e($csrf) ?>"><input type="hidden" name="action" value="order_status"><input type="hidden" name="oid" value="<?= (int) $o['id'] ?>">
                <select name="statut" onchange="this.form.submit()" class="statut-select st-sel-<?= e($o['statut']) ?>">
                  <?php foreach ($statutFr as $k => $lab): ?><option value="<?= $k ?>"<?= $o['statut'] === $k ? ' selected' : '' ?>><?= $lab ?></option><?php endforeach; ?>
                </select>
              </form>
            </td>
            <td><small><?= e(date('d/m H:i', strtotime($o['cree_le']))) ?></small></td>
          </tr>
          <?php endforeach; ?>
        </tbody></table></div>
        <?php endif; ?>
      </section>

    <?php elseif ($tab === 'boutique'): ?>
      <h1 class="dash-title">Ma boutique</h1>
      <p class="dash-addr"><a href="<?= e(shop_url($b)) ?>" target="_blank" rel="noopener"><?= e(shop_domain($b)) ?> ↗</a></p>
      <section class="panel" style="margin-top:14px">
        <form method="post" action="compte.php">
          <input type="hidden" name="csrf" value="<?= e($csrf) ?>"><input type="hidden" name="action" value="save_boutique">
          <div class="field-grid">
            <div class="field"><label>Nom</label><input name="nom" value="<?= e($b['nom']) ?>" required></div>
            <div class="field"><label>Catégorie</label><input name="categorie" value="<?= e($b['categorie']) ?>"></div>
          </div>
          <div class="field"><label>Description</label><textarea name="description" rows="2"><?= e($b['description']) ?></textarea></div>
          <div class="field-grid">
            <div class="field"><label>Logo (lien)</label><input name="logo" value="<?= e($b['logo']) ?>"></div>
            <div class="field"><label>Bannière (lien)</label><input name="banniere" value="<?= e($b['banniere']) ?>"></div>
          </div>
          <div class="field-grid">
            <div class="field"><label>Téléphone contact</label><input name="contact_tel" value="<?= e($b['contact_tel']) ?>"></div>
            <div class="field"><label>E-mail contact</label><input name="contact_email" value="<?= e($b['contact_email']) ?>"></div>
          </div>
          <div class="field-grid">
            <div class="field"><label>Réseaux (lien)</label><input name="reseaux" value="<?= e($b['reseaux']) ?>"></div>
            <div class="field"><label>Zones de livraison</label><input name="zones" value="<?= e($b['zones']) ?>"></div>
          </div>
          <p class="form-section">Thème</p>
          <div class="theme-choice">
            <?php foreach (cfg()['themes'] as $key => $th): ?>
              <label class="theme-opt"><input type="radio" name="theme" value="<?= e($key) ?>"<?= $b['theme'] === $key ? ' checked' : '' ?>><span class="theme-swatch" style="background:linear-gradient(135deg,<?= $th['accent'] ?>,<?= $th['hero'] ?>)"></span><b><?= e($th['name']) ?></b></label>
            <?php endforeach; ?>
          </div>
          <button class="btn btn-primary" type="submit">Enregistrer</button>
        </form>
      </section>

    <?php elseif ($tab === 'abonnement'): ?>
      <h1 class="dash-title">Abonnement</h1>
      <section class="panel">
        <div class="kpis">
          <div class="kpi"><span class="kpi-l">Offre</span><b class="kpi-v" style="font-size:1.3rem"><?= e($plan['name']) ?></b></div>
          <div class="kpi"><span class="kpi-l">Montant</span><b class="kpi-v" style="font-size:1.3rem"><?= e(money((int) $plan['price'], $devise)) ?>/mois</b></div>
          <div class="kpi"><span class="kpi-l">Statut</span><b class="kpi-v" style="font-size:1.3rem"><?= $u['statut'] === 'actif' ? 'Actif' : 'Essai' ?></b></div>
        </div>
        <p class="sub" style="margin-top:14px"><?= $u['statut'] === 'actif' ? 'Renouvellement le ' . e(date('d/m/Y', strtotime($u['abo_fin']))) : 'Essai gratuit jusqu\'au ' . e(date('d/m/Y', strtotime($u['essai_fin']))) . '. Réglez pour continuer sans interruption.' ?></p>
        <a class="btn btn-primary" href="paiement.php" style="margin-top:12px"><?= $u['statut'] === 'actif' ? 'Renouveler maintenant' : 'Régler mon abonnement' ?></a>
      </section>
      <section class="panel" style="margin-top:20px">
        <div class="panel-head"><h2>Historique des paiements</h2></div>
        <?php $pays = q('SELECT * FROM paiements WHERE user_id=? ORDER BY id DESC', [$u['id']])->fetchAll(); ?>
        <?php if (!$pays): ?><div class="empty-state">Aucun paiement pour l'instant.</div>
        <?php else: ?><div class="table-scroll"><table class="admin-table"><thead><tr><th>Date</th><th>Montant</th><th>Méthode</th><th>Réf.</th><th></th></tr></thead><tbody>
          <?php foreach ($pays as $p): ?><tr><td><small><?= e(date('d/m/Y', strtotime($p['cree_le']))) ?></small></td><td><b><?= e(money((int) $p['montant'], $p['devise'])) ?></b></td><td><?= e($p['methode']) ?></td><td><small><?= e($p['reference']) ?></small></td><td><a class="btn-mini" href="facture.php?p=<?= (int) $p['id'] ?>">Facture</a></td></tr><?php endforeach; ?>
        </tbody></table></div><?php endif; ?>
      </section>
    <?php endif; ?>
  </main>
</div>
<?php foot(false); ?>
