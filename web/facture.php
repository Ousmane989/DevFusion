<?php
/** Marsa — facture d'un paiement (imprimable / PDF via le navigateur). */
require __DIR__ . '/includes/layout.php';
$u = require_login();
$pid = (int) ($_GET['p'] ?? 0);
$pay = q1('SELECT * FROM paiements WHERE id = ? AND user_id = ?', [$pid, $u['id']]); // isolation
if (!$pay) { redirect('compte.php'); }
$pl = plan_info($u['plan']);
head('Marsa — Facture ' . $pay['reference']);
topbar(back_button('compte.php', 'Tableau de bord'), '<button class="mini-back" onclick="window.print()" type="button">Imprimer / PDF</button>');
?>
<main class="shell" style="padding-block:30px;max-width:720px">
  <div class="invoice">
    <div class="inv-head">
      <div><div class="mock-logo" style="width:44px;height:44px;font-size:1.3rem">M</div><h1 style="margin-top:10px">Facture</h1></div>
      <div class="inv-meta">
        <div><span>Référence</span><b><?= e($pay['reference']) ?></b></div>
        <div><span>Date</span><b><?= e(date('d/m/Y H:i', strtotime($pay['cree_le']))) ?></b></div>
        <div><span>Statut</span><b style="color:var(--emerald)">Payé</b></div>
      </div>
    </div>
    <div class="inv-parties">
      <div><span>Facturé à</span><b><?= e($u['nom']) ?></b><small><?= e($u['email']) ?></small><small><?= e($u['telephone']) ?></small></div>
      <div><span>Émis par</span><b>Marsa</b><small>Place de marché — <?= e($u['pays'] === 'SN' ? 'Sénégal' : 'Mauritanie') ?></small></div>
    </div>
    <table class="inv-table">
      <thead><tr><th>Désignation</th><th>Période</th><th style="text-align:right">Montant</th></tr></thead>
      <tbody>
        <tr><td>Abonnement Marsa — Offre <?= e($pl['name']) ?></td><td>1 mois</td><td style="text-align:right"><?= e(money((int) $pay['montant'], $pay['devise'])) ?></td></tr>
      </tbody>
      <tfoot><tr><td colspan="2" style="text-align:right"><b>Total payé</b></td><td style="text-align:right"><b><?= e(money((int) $pay['montant'], $pay['devise'])) ?></b></td></tr></tfoot>
    </table>
    <p class="inv-foot">Paiement par <?= e($pay['methode']) ?> · Merci de votre confiance — Marsa</p>
  </div>
</main>
<?php foot(false); ?>
