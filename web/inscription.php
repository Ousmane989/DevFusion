<?php
/**
 * Marsa — inscription vendeur / création de boutique (façon Shopify).
 * Formulaire bilingue FR/AR ; envoi vers api/register.php (essai 3 jours).
 */
$config = require __DIR__ . '/includes/config.php';
require __DIR__ . '/includes/i18n.php';
require __DIR__ . '/includes/auth.php';

// Déjà connecté ? -> espace vendeur.
if (current_merchant() !== null) { header('Location: compte.php'); exit; }
$csrf = csrf_token();

$country = $config['countries'][$config['default_country']];
$lang = $_GET['lang'] ?? $country['default_lang'];
if (!in_array($lang, $country['langs'], true)) { $lang = $country['default_lang']; }
$dir = $country['dir'][$lang] ?? 'ltr';

$categories = [
    ['electronique', ['fr' => 'Électronique', 'ar' => 'إلكترونيات']],
    ['mode', ['fr' => 'Mode & tissus', 'ar' => 'أزياء وأقمشة']],
    ['alimentaire', ['fr' => 'Alimentaire', 'ar' => 'مواد غذائية']],
    ['artisanat', ['fr' => 'Artisanat', 'ar' => 'حرف يدوية']],
    ['maison', ['fr' => 'Maison', 'ar' => 'المنزل']],
    ['beaute', ['fr' => 'Beauté', 'ar' => 'الجمال']],
    ['autre', ['fr' => 'Autre', 'ar' => 'أخرى']],
];
$cities = $country['cities'];
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($lang) ?>" dir="<?= htmlspecialchars($dir) ?>">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Marsa — <?= $lang === 'ar' ? 'أنشئ متجرك' : 'Créer votre boutique' ?></title>
  <meta name="robots" content="noindex">
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
  <header class="top">
    <div class="shell mini-top">
      <a class="mini-back" href="index.php">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        <span <?= attrs('in_back') ?>><?= t('in_back', $lang) ?></span>
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
    <div class="access-card signup-card">
      <div>
        <span class="eyebrow" <?= attrs('in_eyebrow') ?>><?= t('in_eyebrow', $lang) ?></span>
        <h1 style="margin-top:8px" <?= attrs('in_h1') ?>><?= t('in_h1', $lang) ?></h1>
      </div>
      <p class="sub" <?= attrs('in_p') ?>><?= t('in_p', $lang) ?></p>

      <form class="access-form" id="register-form" novalidate>
        <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf) ?>">
        <div class="field">
          <label for="f-shop" <?= attrs('in_shop_l') ?>><?= t('in_shop_l', $lang) ?></label>
          <input id="f-shop" name="shop" required autocomplete="organization"
                 placeholder="<?= htmlspecialchars(t('in_shop_ph', $lang)) ?>">
          <p class="sub-url"><span class="u-slug" id="shop-slug">votre-boutique</span><span class="u-prefix">.marsa.mr</span></p>
        </div>
        <div class="field-grid">
          <div class="field">
            <label for="f-owner" <?= attrs('in_owner_l') ?>><?= t('in_owner_l', $lang) ?></label>
            <input id="f-owner" name="owner" required autocomplete="name"
                   placeholder="<?= htmlspecialchars(t('in_owner_ph', $lang)) ?>">
          </div>
          <div class="field">
            <label for="f-phone" <?= attrs('in_phone_l') ?>><?= t('in_phone_l', $lang) ?></label>
            <input id="f-phone" name="phone" type="tel" inputmode="tel" required autocomplete="tel"
                   placeholder="<?= htmlspecialchars(t('in_phone_ph', $lang)) ?>">
          </div>
        </div>
        <div class="field-grid">
          <div class="field">
            <label for="f-email" <?= attrs('in_email_l') ?>><?= t('in_email_l', $lang) ?></label>
            <input id="f-email" name="email" type="email" autocomplete="email"
                   placeholder="<?= htmlspecialchars(t('in_email_ph', $lang)) ?>">
          </div>
          <div class="field">
            <label for="f-pass" <?= attrs('in_pass_l') ?>><?= t('in_pass_l', $lang) ?></label>
            <input id="f-pass" name="password" type="password" required autocomplete="new-password" minlength="6"
                   placeholder="<?= htmlspecialchars(t('in_pass_ph', $lang)) ?>">
          </div>
        </div>
        <div class="field-grid">
          <div class="field">
            <label for="f-cat" <?= attrs('in_cat_l') ?>><?= t('in_cat_l', $lang) ?></label>
            <select id="f-cat" name="category">
              <?php foreach ($categories as $c): ?>
                <option value="<?= htmlspecialchars($c[1]['fr']) ?>" data-fr="<?= htmlspecialchars($c[1]['fr']) ?>" data-ar="<?= htmlspecialchars($c[1]['ar']) ?>"><?= htmlspecialchars($c[1][$lang] ?? $c[1]['fr']) ?></option>
              <?php endforeach; ?>
            </select>
          </div>
          <div class="field">
            <label for="f-city" <?= attrs('in_city_l') ?>><?= t('in_city_l', $lang) ?></label>
            <select id="f-city" name="city">
              <?php foreach ($cities as $city): ?>
                <option value="<?= htmlspecialchars($city) ?>"><?= htmlspecialchars($city) ?></option>
              <?php endforeach; ?>
            </select>
          </div>
        </div>
        <button class="btn btn-primary btn-lg" type="submit" <?= attrs('in_submit') ?>><?= t('in_submit', $lang) ?></button>
        <p class="access-msg" id="register-msg"
           data-fr-err="<?= htmlspecialchars(t('in_err','fr')) ?>" data-ar-err="<?= htmlspecialchars(t('in_err','ar')) ?>"
           data-fr-dup="<?= htmlspecialchars(t('in_dup','fr')) ?>" data-ar-dup="<?= htmlspecialchars(t('in_dup','ar')) ?>"></p>
      </form>

      <!-- Succès (affiché par JS après inscription) -->
      <div class="signup-ok" id="register-ok" hidden>
        <div class="ok-badge">✓</div>
        <h2 <?= attrs('in_ok_t') ?>><?= t('in_ok_t', $lang) ?></h2>
        <p class="sub" <?= attrs('in_ok_p') ?>><?= t('in_ok_p', $lang) ?></p>
        <a class="btn btn-primary btn-lg" href="compte.php" <?= attrs('in_ok_go') ?>><?= t('in_ok_go', $lang) ?></a>
      </div>

      <div class="access-foot">
        <span <?= attrs('in_have') ?>><?= t('in_have', $lang) ?></span>
        <a href="acces.php" <?= attrs('in_login') ?>><?= t('in_login', $lang) ?></a>
      </div>
    </div>
  </main>

  <script src="assets/js/app.js"></script>
</body>
</html>
