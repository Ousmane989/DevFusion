<?php
/** Marsa — inscription (identité, pays, offre) puis vérification e-mail. */
require __DIR__ . '/includes/layout.php';

if (current_user() !== null) { redirect('compte.php'); }
$csrf = csrf_token();
$err = '';
$old = ['nom' => '', 'email' => '', 'telephone' => '', 'pays' => 'MR', 'plan' => 'basique'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_ok($_POST['csrf'] ?? '')) {
        $err = 'Session expirée, réessayez.';
    } else {
        foreach ($old as $k => $_) { $old[$k] = trim((string) ($_POST[$k] ?? $old[$k])); }
        $pass = (string) ($_POST['mot_de_passe'] ?? '');
        $phone = preg_replace('/\D+/', '', $old['telephone']);
        $plan = isset(cfg()['plans'][$old['plan']]) ? $old['plan'] : 'basique';
        $pays = in_array($old['pays'], ['MR', 'SN'], true) ? $old['pays'] : 'MR';

        if (mb_strlen($old['nom']) < 2) { $err = 'Indiquez votre nom.'; }
        elseif (!filter_var($old['email'], FILTER_VALIDATE_EMAIL)) { $err = 'E-mail invalide.'; }
        elseif (strlen($phone) < 8) { $err = 'Téléphone invalide.'; }
        elseif (strlen($pass) < 6) { $err = 'Mot de passe : 6 caractères minimum.'; }
        elseif (q1('SELECT id FROM utilisateurs WHERE email = ?', [$old['email']])) { $err = 'Un compte existe déjà avec cet e-mail. Connectez-vous.'; }
        else {
            q('INSERT INTO utilisateurs (nom, email, telephone, mot_de_passe, pays, plan, statut, cree_le) VALUES (?,?,?,?,?,?,?,?)',
              [$old['nom'], $old['email'], $phone, password_hash($pass, PASSWORD_DEFAULT), $pays, $plan, 'non_verifie', date('c')]);
            $u = q1('SELECT * FROM utilisateurs WHERE email = ?', [$old['email']]);
            $code = gen_code((int) $u['id'], 'email');
            send_code($u, $code, 'email');
            login_user($u);
            redirect('verification.php');
        }
    }
}
head('Marsa — Créer un compte');
topbar(back_button('index.php', 'Accueil'), '<a class="mini-back" href="connexion.php">Se connecter</a>');
?>
<main class="access-main">
  <div class="access-card signup-card">
    <div><span class="eyebrow">Créer un compte</span><h1 style="margin-top:8px">Lancez votre boutique en ligne</h1></div>
    <p class="sub">Un compte, une boutique. <b>3 jours d'essai gratuit</b> après vérification de votre e-mail.</p>
    <?= flash_banner($err, 'err') ?>
    <form class="access-form" method="post" action="inscription.php" novalidate>
      <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
      <div class="field"><label>Nom complet</label><input name="nom" required value="<?= e($old['nom']) ?>" placeholder="Ex. Salma Mint Ahmed"></div>
      <div class="field-grid">
        <div class="field"><label>E-mail</label><input name="email" type="email" required value="<?= e($old['email']) ?>" placeholder="vous@exemple.com"></div>
        <div class="field"><label>Téléphone</label><input name="telephone" type="tel" inputmode="tel" required value="<?= e($old['telephone']) ?>" placeholder="22 00 00 00"></div>
      </div>
      <div class="field-grid">
        <div class="field"><label>Pays</label>
          <select name="pays">
            <option value="MR"<?= $old['pays'] === 'MR' ? ' selected' : '' ?>>Mauritanie (MRU)</option>
            <option value="SN"<?= $old['pays'] === 'SN' ? ' selected' : '' ?>>Sénégal (XOF)</option>
          </select>
        </div>
        <div class="field"><label>Mot de passe</label><input name="mot_de_passe" type="password" required minlength="6" placeholder="6 caractères min."></div>
      </div>

      <p class="form-section">Choisissez votre offre <span class="tiny">· 3 jours gratuits, aucun paiement maintenant</span></p>
      <div class="plan-choice">
        <?php foreach (cfg()['plans'] as $key => $pl): ?>
          <label class="plan-opt">
            <input type="radio" name="plan" value="<?= e($key) ?>"<?= $old['plan'] === $key ? ' checked' : '' ?>>
            <span class="plan-opt-in">
              <b><?= e($pl['name']) ?></b>
              <span class="p"><?= number_format($pl['price'], 0, ',', ' ') ?> <small>MRU/mois</small></span>
              <span class="ai-tag"><?= $pl['max_produits'] < 0 ? 'Produits illimités' : $pl['max_produits'] . ' produits' ?></span>
            </span>
          </label>
        <?php endforeach; ?>
      </div>

      <button class="btn btn-primary btn-lg" type="submit">Créer mon compte</button>
    </form>
    <div class="access-foot"><span>Vous avez déjà un compte ?</span><a href="connexion.php">Se connecter</a></div>
  </div>
</main>
<?php foot(false); ?>
