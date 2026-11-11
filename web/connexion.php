<?php
/** Marsa — connexion. Redirige selon l'état : non_verifie / verrouille / actif. */
require __DIR__ . '/includes/layout.php';

if (current_user() !== null) { redirect('compte.php'); }
$csrf = csrf_token();
$err = '';
app_start();
$info = (string) ($_SESSION['flash_login'] ?? '');
unset($_SESSION['flash_login']);

if ($_SERVER['REQUEST_METHOD'] === 'POST' && csrf_ok($_POST['csrf'] ?? '')) {
    $login = trim((string) ($_POST['login'] ?? ''));
    $u = q1('SELECT * FROM utilisateurs WHERE email = ? OR telephone = ?', [$login, preg_replace('/\D+/', '', $login)]);
    if ($u && password_verify((string) ($_POST['mot_de_passe'] ?? ''), $u['mot_de_passe'])) {
        login_user($u);
        $u = sync_status($u);
        if ($u['statut'] === 'non_verifie') { redirect('verification.php'); }
        if ($u['statut'] === 'verrouille') { redirect('paiement.php'); }
        redirect('compte.php');
    }
    $err = 'Identifiants incorrects.';
}
head('Marsa — Connexion');
topbar(back_button('index.php', 'Accueil'), '<a class="mini-back" href="inscription.php">Créer un compte</a>');
?>
<main class="access-main">
  <div class="access-card" style="max-width:440px">
    <div><span class="eyebrow">Espace vendeur</span><h1 style="margin-top:8px">Connexion à votre boutique</h1></div>
    <p class="sub">Entrez votre e-mail ou téléphone et votre mot de passe.</p>
    <?= flash_banner($err, 'err') ?><?= flash_banner($info, 'ok') ?>
    <form class="access-form" method="post" action="connexion.php" novalidate>
      <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
      <div class="field"><label>E-mail ou téléphone</label><input name="login" required autofocus autocomplete="username"></div>
      <div class="field"><label>Mot de passe</label><input name="mot_de_passe" type="password" required autocomplete="current-password"></div>
      <button class="btn btn-primary btn-lg" type="submit">Se connecter</button>
    </form>
    <div class="access-foot">
      <a href="mot-de-passe-oublie.php">Mot de passe oublié ?</a>
      <a href="inscription.php">Créer un compte</a>
    </div>
  </div>
</main>
<?php foot(false); ?>
