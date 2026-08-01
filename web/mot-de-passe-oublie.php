<?php
/** Marsa — demande de réinitialisation du mot de passe (code par e-mail). */
require __DIR__ . '/includes/layout.php';
$csrf = csrf_token();
$err = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && csrf_ok($_POST['csrf'] ?? '')) {
    $email = trim((string) ($_POST['email'] ?? ''));
    $u = q1('SELECT * FROM utilisateurs WHERE email = ?', [$email]);
    if ($u) {
        $code = gen_code((int) $u['id'], 'reset');
        send_code($u, $code, 'reset');
        app_start();
        $_SESSION['reset_uid'] = (int) $u['id'];
        redirect('reinitialiser.php');
    }
    $err = "Aucun compte avec cet e-mail.";
}
head('Marsa — Mot de passe oublié');
topbar(back_button('connexion.php', 'Connexion'));
?>
<main class="access-main">
  <div class="access-card" style="max-width:440px">
    <div><span class="eyebrow">Mot de passe oublié</span><h1 style="margin-top:8px">Réinitialiser</h1></div>
    <p class="sub">Entrez votre e-mail : nous vous enverrons un code à 6 chiffres.</p>
    <?= flash_banner($err, 'err') ?>
    <form class="access-form" method="post" action="mot-de-passe-oublie.php" novalidate>
      <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
      <div class="field"><label>E-mail</label><input name="email" type="email" required autofocus></div>
      <button class="btn btn-primary btn-lg" type="submit">Envoyer le code</button>
    </form>
    <div class="access-foot"><a href="connexion.php">Retour à la connexion</a></div>
  </div>
</main>
<?php foot(false); ?>
