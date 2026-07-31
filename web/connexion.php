<?php
/**
 * Marsa — connexion vendeur.
 * Vérifie l'identifiant (e-mail ou téléphone) + mot de passe haché, ouvre la
 * session et redirige vers l'espace vendeur. Protégé par jeton CSRF.
 */
$config = require __DIR__ . '/includes/config.php';
require __DIR__ . '/includes/i18n.php';
require __DIR__ . '/includes/auth.php';

if (current_merchant() !== null) { header('Location: compte.php'); exit; }

$country = $config['countries'][$config['default_country']];
$lang = $_GET['lang'] ?? $country['default_lang'];
if (!in_array($lang, $country['langs'], true)) { $lang = $country['default_lang']; }
$dir = $country['dir'][$lang] ?? 'ltr';
$csrf = csrf_token();

$error = false;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_ok($_POST['csrf'] ?? '')) {
        $error = true;
    } else {
        $m = merchant_by_login((string) ($_POST['login'] ?? ''));
        if ($m !== null && !empty($m['password']) && password_verify((string) ($_POST['password'] ?? ''), $m['password'])) {
            login_merchant($m);
            header('Location: compte.php');
            exit;
        }
        $error = true;
    }
}
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($lang) ?>" dir="<?= htmlspecialchars($dir) ?>">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Marsa — <?= $lang === 'ar' ? 'تسجيل الدخول' : 'Connexion' ?></title>
  <meta name="robots" content="noindex">
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
  <header class="top">
    <div class="shell mini-top">
      <a class="mini-back" href="index.php">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        <span>Accueil</span>
      </a>
      <a class="brand" href="index.php" aria-label="Marsa">
        <svg class="mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <circle cx="20" cy="17" r="12.5" stroke="var(--accent)" stroke-width="2.4"/>
          <circle cx="20" cy="17" r="4.2" fill="var(--accent)"/>
          <path d="M4 31c4 2.6 7 2.6 10.6 0M14.6 31c3.6 2.6 7 2.6 10.8 0M25.4 31c3.6 2.6 6.6 2.6 10.6 0" stroke="var(--emerald)" stroke-width="2.4" stroke-linecap="round"/>
        </svg>
        <span class="brand-text"><span class="brand-ar">مرسى</span><span class="brand-la">Marsa</span></span>
      </a>
      <div class="lang" role="group" aria-label="Langue / اللغة">
        <button type="button" data-lang="fr" aria-pressed="<?= $lang === 'fr' ? 'true' : 'false' ?>">FR</button>
        <button type="button" data-lang="ar" aria-pressed="<?= $lang === 'ar' ? 'true' : 'false' ?>">عربية</button>
      </div>
    </div>
  </header>

  <main class="access-main">
    <div class="access-card" style="max-width:440px">
      <div>
        <span class="eyebrow" <?= attrs('lo_eyebrow') ?>><?= t('lo_eyebrow', $lang) ?></span>
        <h1 style="margin-top:8px" <?= attrs('lo_h1') ?>><?= t('lo_h1', $lang) ?></h1>
      </div>
      <p class="sub" <?= attrs('lo_p') ?>><?= t('lo_p', $lang) ?></p>
      <form class="access-form" method="post" action="connexion.php" novalidate>
        <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf) ?>">
        <div class="field">
          <label for="l-id" <?= attrs('lo_id_l') ?>><?= t('lo_id_l', $lang) ?></label>
          <input id="l-id" name="login" required autocomplete="username" autofocus>
        </div>
        <div class="field">
          <label for="l-pw" <?= attrs('lo_pass_l') ?>><?= t('lo_pass_l', $lang) ?></label>
          <input id="l-pw" name="password" type="password" required autocomplete="current-password">
        </div>
        <?php if ($error): ?><p class="access-msg err" <?= attrs('lo_err') ?>><?= t('lo_err', $lang) ?></p><?php endif; ?>
        <button class="btn btn-primary btn-lg" type="submit" <?= attrs('lo_submit') ?>><?= t('lo_submit', $lang) ?></button>
      </form>
      <div class="access-foot">
        <span <?= attrs('lo_no') ?>><?= t('lo_no', $lang) ?></span>
        <a href="inscription.php" <?= attrs('lo_create') ?>><?= t('lo_create', $lang) ?></a>
      </div>
    </div>
  </main>

  <script src="assets/js/app.js"></script>
</body>
</html>
