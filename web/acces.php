<?php
/**
 * Marsa — page Accès (autonome).
 * Identification par téléphone. Essai gratuit de 3 jours automatique à
 * l'ouverture ; au-delà, l'accès est prolongé via une autorisation WhatsApp
 * gérée par un conseiller (le paiement en ligne n'est pas encore disponible).
 */
$config = require __DIR__ . '/includes/config.php';
require __DIR__ . '/includes/i18n.php';

$country = $config['countries'][$config['default_country']];
$lang = $_GET['lang'] ?? $country['default_lang'];
if (!in_array($lang, $country['langs'], true)) { $lang = $country['default_lang']; }
$dir = $country['dir'][$lang] ?? 'ltr';

$wa      = preg_replace('/\D+/', '', $config['support_whatsapp'] ?? '');
$waMsgFr = rawurlencode(t('ac_wa_msg', 'fr'));
$waHref  = 'https://wa.me/' . $wa . '?text=' . $waMsgFr;
$trial   = (int) ($config['trial_days'] ?? 3);
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($lang) ?>" dir="<?= htmlspecialchars($dir) ?>">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Marsa — <?= $lang === 'ar' ? 'الدخول إلى متجرك' : 'Accès à votre boutique' ?></title>
  <meta name="robots" content="noindex">
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
  <header class="top">
    <div class="shell mini-top">
      <a class="mini-back" href="index.php">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        <span <?= attrs('ac_back') ?>><?= t('ac_back', $lang) ?></span>
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
    <div class="access-card">
      <div>
        <span class="eyebrow" <?= attrs('ac_eyebrow') ?>><?= t('ac_eyebrow', $lang) ?></span>
        <h1 style="margin-top:8px" <?= attrs('ac_h1') ?>><?= t('ac_h1', $lang) ?></h1>
      </div>
      <p class="sub" <?= attrs('ac_p') ?>><?= t('ac_p', $lang) ?></p>

      <form class="access-form" id="access-form" novalidate>
        <label for="ac-phone" <?= attrs('ac_ph') ?>><?= t('ac_ph', $lang) ?></label>
        <input id="ac-phone" type="tel" name="phone" inputmode="tel" autocomplete="tel" required
               placeholder="<?= htmlspecialchars(t('ac_ph', $lang)) ?>">
        <button class="btn btn-primary btn-lg" type="submit" <?= attrs('ac_continue') ?>><?= t('ac_continue', $lang) ?></button>
        <p class="access-msg" id="access-msg"
           data-fr-ok="<?= htmlspecialchars(t('ac_hint_ok','fr')) ?>" data-ar-ok="<?= htmlspecialchars(t('ac_hint_ok','ar')) ?>"
           data-fr-err="<?= htmlspecialchars(t('ac_hint_err','fr')) ?>" data-ar-err="<?= htmlspecialchars(t('ac_hint_err','ar')) ?>"></p>
      </form>

      <div class="info-block">
        <div class="it">
          <span class="n">1</span>
          <div><b <?= attrs('ac_trial_t') ?>><?= t('ac_trial_t', $lang) ?></b><br><span <?= attrs('ac_trial_p') ?>><?= t('ac_trial_p', $lang) ?></span></div>
        </div>
        <div class="it">
          <span class="n">2</span>
          <div><b <?= attrs('ac_after_t') ?>><?= t('ac_after_t', $lang) ?></b><br><span <?= attrs('ac_after_p') ?>><?= t('ac_after_p', $lang) ?></span></div>
        </div>
      </div>

      <a class="btn btn-wa btn-lg" href="<?= htmlspecialchars($waHref) ?>" target="_blank" rel="noopener"
         data-fr-wa="https://wa.me/<?= $wa ?>?text=<?= rawurlencode(t('ac_wa_msg','fr')) ?>"
         data-ar-wa="https://wa.me/<?= $wa ?>?text=<?= rawurlencode(t('ac_wa_msg','ar')) ?>">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.1 14.9l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 0 1 12 4zm4.5 10.3c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.1-.2 0-.4.1-.5l.4-.5c.1-.2.1-.3 0-.5l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.9.9-.9 2.2 0 3.5a9 9 0 0 0 4.4 3.9c1.5.5 2.1.4 2.7.3.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1l-.5-.2z"/></svg>
        <span <?= attrs('ac_wa_btn') ?>><?= t('ac_wa_btn', $lang) ?></span>
      </a>

      <div class="access-foot">
        <span <?= attrs('ac_no_acc') ?>><?= t('ac_no_acc', $lang) ?></span>
        <a href="index.php#cta" <?= attrs('ac_create') ?>><?= t('ac_create', $lang) ?></a>
      </div>
    </div>
  </main>

  <script src="assets/js/app.js"></script>
  <script>
    // Traduit le lien WhatsApp (message FR/AR) au changement de langue.
    (function(){
      var wa = document.querySelector('.btn-wa');
      var langBtns = document.querySelectorAll('.lang button');
      langBtns.forEach(function(b){
        b.addEventListener('click', function(){
          var ar = b.getAttribute('data-lang') === 'ar';
          if (wa) { wa.setAttribute('href', wa.getAttribute(ar ? 'data-ar-wa' : 'data-fr-wa')); }
        });
      });
    })();
  </script>
</body>
</html>
