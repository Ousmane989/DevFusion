<?php
/** Marsa — saisie du code + nouveau mot de passe. */
require __DIR__ . '/includes/layout.php';
app_start();
$uid = (int) ($_SESSION['reset_uid'] ?? 0);
if (!$uid) { redirect('mot-de-passe-oublie.php'); }
$u = q1('SELECT * FROM utilisateurs WHERE id = ?', [$uid]);
if (!$u) { redirect('mot-de-passe-oublie.php'); }
$csrf = csrf_token();
$err = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && csrf_ok($_POST['csrf'] ?? '')) {
    $pass = (string) ($_POST['mot_de_passe'] ?? '');
    if (strlen($pass) < 6) { $err = 'Mot de passe : 6 caractères minimum.'; }
    elseif (!verify_code($uid, (string) ($_POST['code'] ?? ''), 'reset')) { $err = 'Code invalide ou expiré.'; }
    else {
        q('UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?', [password_hash($pass, PASSWORD_DEFAULT), $uid]);
        unset($_SESSION['reset_uid']);
        $_SESSION['flash_login'] = 'Mot de passe modifié. Connectez-vous.';
        redirect('connexion.php');
    }
}
$demo = $_SESSION['demo_code'] ?? '';
head('Marsa — Nouveau mot de passe');
topbar(back_button('mot-de-passe-oublie.php', 'Retour'));
?>
<main class="access-main">
  <div class="access-card" style="max-width:440px">
    <div><span class="eyebrow">Réinitialisation</span><h1 style="margin-top:8px">Nouveau mot de passe</h1></div>
    <p class="sub">Code envoyé à <b><?= e($u['email']) ?></b>.</p>
    <?php if ($demo !== ''): ?><div class="flash" style="background:color-mix(in srgb,var(--accent) 16%,var(--surface));color:var(--accent-strong)">Mode démo — code : <b style="letter-spacing:.2em"><?= e($demo) ?></b></div><?php endif; ?>
    <?= flash_banner($err, 'err') ?>
    <form class="access-form" method="post" action="reinitialiser.php" novalidate>
      <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
      <div class="field"><label>Code reçu</label><input name="code" inputmode="numeric" maxlength="6" required placeholder="000000" style="letter-spacing:.3em;text-align:center"></div>
      <div class="field"><label>Nouveau mot de passe</label><input name="mot_de_passe" type="password" required minlength="6"></div>
      <button class="btn btn-primary btn-lg" type="submit">Changer le mot de passe</button>
    </form>
  </div>
</main>
<?php foot(false); ?>
