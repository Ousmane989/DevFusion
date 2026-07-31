<?php
/** Marsa — paiement de l'abonnement (montant exact du tarif choisi). */
require __DIR__ . '/includes/layout.php';
require __DIR__ . '/includes/payment.php';

$u = require_login();
if ($u['statut'] === 'non_verifie') { redirect('verification.php'); }
$csrf = csrf_token();
$pl = plan_info($u['plan']);
$devise = currency_of_country($u['pays']);
$montant = (int) $pl['price'];
$err = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && csrf_ok($_POST['csrf'] ?? '')) {
    $method = (string) ($_POST['methode'] ?? '');
    $provider = payment_provider($u['pays'], $method);
    if ($provider === null) { $err = 'Choisissez un moyen de paiement.'; }
    else {
        // Montant strictement égal au tarif choisi (contrôle serveur).
        $res = $provider->charge($u, $montant, $devise, $_POST);
        if (!empty($res['ok'])) {
            q('INSERT INTO paiements (user_id, montant, devise, methode, reference, statut, cree_le) VALUES (?,?,?,?,?,?,?)',
              [$u['id'], $montant, $devise, $provider->label(), $res['reference'], 'valide', date('c')]);
            $fin = date('c', time() + 30 * 86400);
            q("UPDATE utilisateurs SET statut='actif', abo_fin=? WHERE id=?", [$fin, $u['id']]);
            q("UPDATE abonnements SET statut='actif', fin=? WHERE user_id=? AND statut!='expire'", [$fin, $u['id']]);
            q('UPDATE boutiques SET en_ligne=1 WHERE user_id=? AND configuree=1', [$u['id']]);
            $pid = (int) db()->lastInsertId();
            redirect('facture.php?p=' . $pid);
        }
        $err = 'Le paiement a échoué. Réessayez.';
    }
}

$locked = $u['statut'] === 'verrouille';
head('Marsa — Paiement de l\'abonnement');
topbar($locked ? '' : back_button('compte.php', 'Tableau de bord'), '<a class="mini-back" href="deconnexion.php">Se déconnecter</a>');
?>
<main class="access-main">
  <div class="access-card" style="max-width:480px">
    <?php if ($locked): ?>
      <div class="flash err">Votre essai de 3 jours est terminé. Réglez votre abonnement pour réactiver votre boutique.</div>
    <?php endif; ?>
    <div><span class="eyebrow">Abonnement <?= e($pl['name']) ?></span><h1 style="margin-top:8px">Montant à régler</h1></div>
    <div class="pay-amount"><?= e(money($montant, $devise)) ?><small>/ mois</small></div>
    <p class="sub">Offre <b><?= e($pl['name']) ?></b> — <?= $pl['max_produits'] < 0 ? 'produits illimités' : $pl['max_produits'] . ' produits' ?>. Renouvelable chaque mois.</p>
    <?= flash_banner($err, 'err') ?>
    <form class="access-form" method="post" action="paiement.php">
      <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
      <p class="form-section">Moyen de paiement</p>
      <div class="pay-methods">
        <?php $first = true; foreach (payment_providers($u['pays']) as $key => $prov): ?>
          <label class="pay-opt">
            <input type="radio" name="methode" value="<?= e($key) ?>"<?= $first ? ' checked' : '' ?>>
            <span><?= e($prov->label()) ?></span>
          </label>
        <?php $first = false; endforeach; ?>
      </div>
      <button class="btn btn-primary btn-lg" type="submit">Payer <?= e(money($montant, $devise)) ?></button>
    </form>
    <p class="sub" style="font-size:.8rem;margin-top:8px">Paiement simulé dans cette démo — le flux (montant exact, facture, déverrouillage) est complet.</p>
  </div>
</main>
<?php foot(false); ?>
