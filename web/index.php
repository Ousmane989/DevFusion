<?php
/**
 * Marsa — page de pré-lancement (place de marché Mauritanie → Sénégal).
 * Rendu i18n côté serveur (FR/AR), config multi-pays, bascule RTL côté client.
 */
$config  = require __DIR__ . '/includes/config.php';
require __DIR__ . '/includes/i18n.php';

$country = $config['countries'][$config['default_country']];

// Langue : ?lang=fr|ar sinon langue par défaut du pays.
$lang = $_GET['lang'] ?? $country['default_lang'];
if (!in_array($lang, $country['langs'], true)) {
    $lang = $country['default_lang'];
}
$dir = $country['dir'][$lang] ?? 'ltr';
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($lang) ?>" dir="<?= htmlspecialchars($dir) ?>">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Marsa — <?= $lang === 'ar' ? 'سوق غرب إفريقيا' : 'Place de marché d’Afrique de l’Ouest' ?></title>
  <meta name="description" content="Marsa : ouvrez votre boutique en ligne ou achetez en toute confiance en Mauritanie — paiement à la livraison, vendeurs vérifiés, WhatsApp direct.">
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
  <header class="top">
    <div class="shell topbar">
      <a class="brand" href="?" aria-label="Marsa">
        <svg class="mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <circle cx="20" cy="17" r="12.5" stroke="var(--accent)" stroke-width="2.4"/>
          <circle cx="20" cy="17" r="4.2" fill="var(--accent)"/>
          <path d="M4 31c4 2.6 7 2.6 10.6 0M14.6 31c3.6 2.6 7 2.6 10.8 0M25.4 31c3.6 2.6 6.6 2.6 10.6 0" stroke="var(--emerald)" stroke-width="2.4" stroke-linecap="round"/>
        </svg>
        <span class="brand-text"><span class="brand-ar">مرسى</span><span class="brand-la">Marsa</span></span>
      </a>
      <div class="controls">
        <div class="lang" role="group" aria-label="Langue / اللغة">
          <button type="button" data-lang="fr" aria-pressed="<?= $lang === 'fr' ? 'true' : 'false' ?>">FR</button>
          <button type="button" data-lang="ar" aria-pressed="<?= $lang === 'ar' ? 'true' : 'false' ?>">عربية</button>
        </div>
        <button class="icon-btn" id="theme" type="button" aria-label="Thème clair / sombre">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>
        </button>
      </div>
    </div>
  </header>

  <!-- HERO -->
  <section class="hero">
    <div class="glow"></div>
    <div class="horizon" aria-hidden="true">
      <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
        <path d="M0 70 Q150 40 300 70 T600 70 T900 70 T1200 70 V120 H0 Z" fill="var(--accent)" opacity=".28"/>
        <path d="M0 84 Q150 58 300 84 T600 84 T900 84 T1200 84 V120 H0 Z" fill="var(--emerald)" opacity=".55"/>
      </svg>
    </div>
    <div class="shell hero-inner">
      <span class="badge"><span class="dot"></span><span <?= attrs('badge') ?>><?= t('badge', $lang) ?></span></span>
      <span class="eyebrow" <?= attrs('hero_eyebrow') ?>><?= t('hero_eyebrow', $lang) ?></span>
      <h1 <?= attrs('hero_h1') ?>><?= t('hero_h1', $lang) ?></h1>
      <p class="lead" <?= attrs('hero_lead') ?>><?= t('hero_lead', $lang) ?></p>
      <div class="cta-row">
        <a class="btn btn-primary" href="#vendeur" <?= attrs('cta_shop') ?>><?= t('cta_shop', $lang) ?></a>
        <a class="btn btn-ghost" href="#marche" <?= attrs('cta_market') ?>><?= t('cta_market', $lang) ?></a>
      </div>
      <div class="hero-meta">
        <span <?= attrs('meta1') ?>><?= t('meta1', $lang) ?></span>
        <span <?= attrs('meta2') ?>><?= t('meta2', $lang) ?></span>
        <span <?= attrs('meta3') ?>><?= t('meta3', $lang) ?></span>
      </div>
    </div>
  </section>

  <!-- CONFIANCE -->
  <section class="band">
    <div class="shell">
      <div class="sec-head">
        <span class="eyebrow" <?= attrs('trust_eyebrow') ?>><?= t('trust_eyebrow', $lang) ?></span>
        <h2 <?= attrs('trust_h2') ?>><?= t('trust_h2', $lang) ?></h2>
        <p <?= attrs('trust_p') ?>><?= t('trust_p', $lang) ?></p>
      </div>
      <div class="grid pillars">
        <div class="card">
          <div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg></div>
          <h3 <?= attrs('p1_h') ?>><?= t('p1_h', $lang) ?></h3>
          <p <?= attrs('p1_p') ?>><?= t('p1_p', $lang) ?></p>
        </div>
        <div class="card">
          <div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg></div>
          <h3 <?= attrs('p2_h') ?>><?= t('p2_h', $lang) ?></h3>
          <p <?= attrs('p2_p') ?>><?= t('p2_p', $lang) ?></p>
        </div>
        <div class="card">
          <div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/></svg></div>
          <h3 <?= attrs('p3_h') ?>><?= t('p3_h', $lang) ?></h3>
          <p <?= attrs('p3_p') ?>><?= t('p3_p', $lang) ?></p>
        </div>
        <div class="card">
          <div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l1.5-4A8 8 0 1 1 9 19.5z"/></svg></div>
          <h3 <?= attrs('p4_h') ?>><?= t('p4_h', $lang) ?></h3>
          <p <?= attrs('p4_p') ?>><?= t('p4_p', $lang) ?></p>
        </div>
      </div>
    </div>
  </section>

  <!-- COMMENT CA MARCHE -->
  <section class="band" id="marche" style="background:var(--surface-2)">
    <div class="shell">
      <div class="sec-head">
        <span class="eyebrow" <?= attrs('how_eyebrow') ?>><?= t('how_eyebrow', $lang) ?></span>
        <h2 <?= attrs('how_h2') ?>><?= t('how_h2', $lang) ?></h2>
        <p <?= attrs('how_p') ?>><?= t('how_p', $lang) ?></p>
      </div>
      <div class="tracks">
        <div class="track">
          <span class="lbl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1.6"/><circle cx="18" cy="21" r="1.6"/><path d="M2 3h3l2.5 13h11l2-8H6.5"/></svg><span <?= attrs('buy_lbl') ?>><?= t('buy_lbl', $lang) ?></span></span>
          <ol class="steps">
            <li><div><b <?= attrs('buy1_b') ?>><?= t('buy1_b', $lang) ?></b><span <?= attrs('buy1_s') ?>><?= t('buy1_s', $lang) ?></span></div></li>
            <li><div><b <?= attrs('buy2_b') ?>><?= t('buy2_b', $lang) ?></b><span <?= attrs('buy2_s') ?>><?= t('buy2_s', $lang) ?></span></div></li>
            <li><div><b <?= attrs('buy3_b') ?>><?= t('buy3_b', $lang) ?></b><span <?= attrs('buy3_s') ?>><?= t('buy3_s', $lang) ?></span></div></li>
          </ol>
        </div>
        <div class="track" id="vendeur">
          <span class="lbl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1.5-5h15L21 9M4 9h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0"/></svg><span <?= attrs('sell_lbl') ?>><?= t('sell_lbl', $lang) ?></span></span>
          <ol class="steps">
            <li><div><b <?= attrs('sell1_b') ?>><?= t('sell1_b', $lang) ?></b><span <?= attrs('sell1_s') ?>><?= t('sell1_s', $lang) ?></span></div></li>
            <li><div><b <?= attrs('sell2_b') ?>><?= t('sell2_b', $lang) ?></b><span <?= attrs('sell2_s') ?>><?= t('sell2_s', $lang) ?></span></div></li>
            <li><div><b <?= attrs('sell3_b') ?>><?= t('sell3_b', $lang) ?></b><span <?= attrs('sell3_s') ?>><?= t('sell3_s', $lang) ?></span></div></li>
          </ol>
        </div>
      </div>
    </div>
  </section>

  <!-- CATEGORIES -->
  <section class="band">
    <div class="shell">
      <div class="sec-head">
        <span class="eyebrow" <?= attrs('cat_eyebrow') ?>><?= t('cat_eyebrow', $lang) ?></span>
        <h2 <?= attrs('cat_h2') ?>><?= t('cat_h2', $lang) ?></h2>
      </div>
      <div class="chips">
        <span class="chip"><span class="em">📱</span><span <?= attrs('cat_elec') ?>><?= t('cat_elec', $lang) ?></span></span>
        <span class="chip"><span class="em">👗</span><span <?= attrs('cat_mode') ?>><?= t('cat_mode', $lang) ?></span></span>
        <span class="chip"><span class="em">🥘</span><span <?= attrs('cat_food') ?>><?= t('cat_food', $lang) ?></span></span>
        <span class="chip"><span class="em">🧺</span><span <?= attrs('cat_craft') ?>><?= t('cat_craft', $lang) ?></span></span>
        <span class="chip"><span class="em">🏠</span><span <?= attrs('cat_home') ?>><?= t('cat_home', $lang) ?></span></span>
        <span class="chip"><span class="em">💄</span><span <?= attrs('cat_beauty') ?>><?= t('cat_beauty', $lang) ?></span></span>
        <span class="chip"><span class="em">🚗</span><span <?= attrs('cat_auto') ?>><?= t('cat_auto', $lang) ?></span></span>
        <span class="chip"><span class="em">📚</span><span <?= attrs('cat_books') ?>><?= t('cat_books', $lang) ?></span></span>
      </div>
    </div>
  </section>

  <!-- BANDE VENDEUR -->
  <section class="band">
    <div class="shell">
      <div class="seller">
        <div>
          <h2 <?= attrs('seller_h2') ?>><?= t('seller_h2', $lang) ?></h2>
          <p <?= attrs('seller_p') ?>><?= t('seller_p', $lang) ?></p>
        </div>
        <a class="btn btn-primary" href="#wl" <?= attrs('seller_cta') ?>><?= t('seller_cta', $lang) ?></a>
      </div>
    </div>
  </section>

  <!-- LISTE D'ATTENTE -->
  <section class="band" id="wl" style="padding-top:0">
    <div class="shell">
      <div class="waitlist">
        <h2 <?= attrs('wl_h2') ?>><?= t('wl_h2', $lang) ?></h2>
        <p <?= attrs('wl_p') ?>><?= t('wl_p', $lang) ?></p>
        <form class="wl-form" id="wl-form" novalidate>
          <input type="tel" name="phone" inputmode="tel" autocomplete="tel"
                 placeholder="<?= htmlspecialchars(t('wl_ph', $lang)) ?>"
                 data-fr-ph="<?= htmlspecialchars(t('wl_ph', 'fr')) ?>"
                 data-ar-ph="<?= htmlspecialchars(t('wl_ph', 'ar')) ?>" required>
          <button class="btn btn-primary" type="submit" <?= attrs('wl_btn') ?>><?= t('wl_btn', $lang) ?></button>
        </form>
        <p class="wl-msg" id="wl-msg"
           data-fr-ok="<?= htmlspecialchars(t('wl_ok', 'fr')) ?>" data-ar-ok="<?= htmlspecialchars(t('wl_ok', 'ar')) ?>"
           data-fr-err="<?= htmlspecialchars(t('wl_err', 'fr')) ?>" data-ar-err="<?= htmlspecialchars(t('wl_err', 'ar')) ?>"></p>
      </div>
    </div>
  </section>

  <!-- ZONES -->
  <section class="band" style="padding-top:0">
    <div class="shell">
      <div class="sec-head">
        <span class="eyebrow" <?= attrs('zones_eyebrow') ?>><?= t('zones_eyebrow', $lang) ?></span>
        <h2 <?= attrs('zones_h2') ?>><?= t('zones_h2', $lang) ?></h2>
      </div>
      <div class="cities">
        <div class="city"><b>Nouakchott</b><span <?= attrs('city_nkc_s') ?>><?= t('city_nkc_s', $lang) ?></span></div>
        <div class="city"><b>Nouadhibou</b><span <?= attrs('city_ndb_s') ?>><?= t('city_ndb_s', $lang) ?></span></div>
        <div class="city soon"><b>Dakar</b><span <?= attrs('soon') ?>><?= t('soon', $lang) ?></span></div>
        <div class="city soon"><b>Thiès · Saint-Louis · Touba</b><span <?= attrs('soon') ?>><?= t('soon', $lang) ?></span></div>
      </div>
    </div>
  </section>

  <footer class="foot">
    <div class="shell foot-in">
      <a class="brand" href="?" aria-label="Marsa">
        <svg class="mark" viewBox="0 0 40 40" fill="none" aria-hidden="true" style="width:28px;height:28px">
          <circle cx="20" cy="17" r="12.5" stroke="var(--accent)" stroke-width="2.4"/>
          <circle cx="20" cy="17" r="4.2" fill="var(--accent)"/>
          <path d="M4 31c4 2.6 7 2.6 10.6 0M14.6 31c3.6 2.6 7 2.6 10.8 0M25.4 31c3.6 2.6 6.6 2.6 10.6 0" stroke="var(--emerald)" stroke-width="2.4" stroke-linecap="round"/>
        </svg>
        <span class="brand-ar">مرسى · Marsa</span>
      </a>
      <span <?= attrs('footer_tag') ?>><?= t('footer_tag', $lang) ?></span>
    </div>
    <p class="disclaimer" <?= attrs('disclaimer') ?>><?= t('disclaimer', $lang) ?></p>
  </footer>

  <script src="assets/js/app.js"></script>
</body>
</html>
