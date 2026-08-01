<?php
/** Marsa — détail d'une commande (espace client, cloisonné). */
require __DIR__ . '/includes/layout.php';
$u = guard_app();
$b = boutique_of((int) $u['id']);
if (!$b) { redirect('assistant.php'); }
$bid = (int) $b['id'];
$oid = (int) ($_GET['id'] ?? 0);
$o = q1('SELECT * FROM commandes WHERE id=? AND boutique_id=?', [$oid, $bid]); // isolation
if (!$o) { redirect('compte.php?tab=commandes'); }
$csrf = csrf_token();
$devise = $b['devise'] ?: currency_of_country($u['pays']);
$statutFr = ['en_attente' => 'En attente', 'confirmee' => 'Confirmée', 'expediee' => 'Expédiée', 'livree' => 'Livrée', 'annulee' => 'Annulée'];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && csrf_ok($_POST['csrf'] ?? '')) {
    $st = (string) ($_POST['statut'] ?? '');
    if (isset($statutFr[$st])) {
        q('UPDATE commandes SET statut=? WHERE id=? AND boutique_id=?', [$st, $oid, $bid]);
    }
    redirect('commande.php?id=' . $oid . '&f=' . rawurlencode('Statut mis à jour.'));
}
$flash = (string) ($_GET['f'] ?? '');
$lignes = q('SELECT * FROM lignes_commande WHERE commande_id=?', [$oid])->fetchAll();
$wa = preg_replace('/\D+/', '', (string) $o['client_tel']);

head('Marsa — Commande #' . $oid);
topbar(back_button('compte.php?tab=commandes', 'Commandes'), '<a class="mini-back" href="deconnexion.php">Se déconnecter</a>', 'Espace client');
?>
<main class="shell" style="padding-block:26px;max-width:760px">
  <?= breadcrumb([['Tableau de bord', 'compte.php'], ['Commandes', 'compte.php?tab=commandes'], ['Commande #' . $oid, null]]) ?>
  <?= flash_banner($flash, 'ok') ?>
  <div class="dash-grid">
    <section class="panel">
      <div class="panel-head"><h2>Articles</h2></div>
      <div class="table-scroll"><table class="admin-table"><thead><tr><th>Produit</th><th>PU</th><th>Qté</th><th>Total</th></tr></thead><tbody>
        <?php foreach ($lignes as $l): ?><tr><td><b><?= e($l['nom']) ?></b></td><td><?= e(money((int) $l['prix'], $devise)) ?></td><td><?= (int) $l['qte'] ?></td><td><b><?= e(money((int) $l['total'], $devise)) ?></b></td></tr><?php endforeach; ?>
      </tbody><tfoot><tr><td colspan="3" style="text-align:right"><b>Total</b></td><td><b><?= e(money((int) $o['total'], $devise)) ?></b></td></tr></tfoot></table></div>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Client</h2></div>
      <ul class="contact-list" style="gap:8px">
        <li><span>Nom</span><b><?= e($o['client_nom']) ?></b></li>
        <li><span>Téléphone</span><a href="https://wa.me/<?= e($wa) ?>" target="_blank" rel="noopener"><?= e($o['client_tel']) ?></a></li>
        <li><span>Adresse</span><b><?= e($o['adresse']) ?></b></li>
        <li><span>Paiement</span><b>À la livraison</b></li>
        <li><span>Date</span><b><?= e(date('d/m/Y H:i', strtotime($o['cree_le']))) ?></b></li>
      </ul>
      <form method="post" action="commande.php?id=<?= $oid ?>" style="margin-top:14px">
        <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
        <label class="field" style="display:grid;gap:6px"><span style="font-weight:600;color:var(--muted);font-size:.86rem">Statut de la commande</span>
          <select name="statut" onchange="this.form.submit()" class="statut-select st-sel-<?= e($o['statut']) ?>">
            <?php foreach ($statutFr as $k => $lab): ?><option value="<?= $k ?>"<?= $o['statut'] === $k ? ' selected' : '' ?>><?= $lab ?></option><?php endforeach; ?>
          </select>
        </label>
      </form>
    </section>
  </div>
</main>
<?php foot(false); ?>
