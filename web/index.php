<?php
/**
 * Marsa — SaaS de création de boutiques + marketplace (page de pré-lancement).
 * i18n serveur (FR/AR), config multi-pays, bascule RTL + animations côté client.
 */
$config = require __DIR__ . '/includes/config.php';
require __DIR__ . '/includes/i18n.php';

$country = $config['countries'][$config['default_country']];
$lang = $_GET['lang'] ?? $country['default_lang'];
if (!in_array($lang, $country['langs'], true)) { $lang = $country['default_lang']; }
$dir = $country['dir'][$lang] ?? 'ltr';

// Catégories du bandeau défilant.
$cats = [
    ['📱', ['fr' => 'Électronique', 'ar' => 'إلكترونيات']],
    ['👗', ['fr' => 'Mode', 'ar' => 'أزياء']],
    ['🥘', ['fr' => 'Alimentaire', 'ar' => 'مواد غذائية']],
    ['🧺', ['fr' => 'Artisanat', 'ar' => 'حرف يدوية']],
    ['🏠', ['fr' => 'Maison', 'ar' => 'المنزل']],
    ['💄', ['fr' => 'Beauté', 'ar' => 'الجمال']],
    ['👟', ['fr' => 'Chaussures', 'ar' => 'أحذية']],
    ['🧵', ['fr' => 'Tissus', 'ar' => 'أقمشة']],
    ['🎧', ['fr' => 'Accessoires', 'ar' => 'إكسسوارات']],
    ['🛒', ['fr' => 'Épicerie', 'ar' => 'بقالة']],
];

// Produits illustratifs de la marketplace.
$prods = [
    ['pr1', '👡', 'linear-gradient(135deg,#C8912A,#8a5a12)', '1 800 MRU'],
    ['pr2', '🎧', 'linear-gradient(135deg,#0E2A27,#1E5248)', '3 500 MRU'],
    ['pr3', '🧵', 'linear-gradient(135deg,#B5502F,#7a2f18)', '2 400 MRU'],
    ['pr4', '🧴', 'linear-gradient(135deg,#2E7263,#134a3a)', '4 200 MRU'],
    ['pr5', '🫖', 'linear-gradient(135deg,#C8912A,#a5711a)', '2 900 MRU'],
    ['pr6', '👗', 'linear-gradient(135deg,#8a3f7a,#5a2650)', '5 500 MRU'],
];
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($lang) ?>" dir="<?= htmlspecialchars($dir) ?>">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Marsa — <?= $lang === 'ar' ? 'أنشئ متجرك الإلكتروني' : 'Créez votre boutique en ligne' ?></title>
  <meta name="description" content="Marsa : créez votre boutique en ligne, personnalisez-la avec des thèmes, ajoutez vos produits et vendez via une marketplace intégrée.">
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
      <nav class="mainnav">
        <a href="#features" <?= attrs('nav_features') ?>><?= t('nav_features', $lang) ?></a>
        <a href="#themes" <?= attrs('nav_themes') ?>><?= t('nav_themes', $lang) ?></a>
        <a href="#market" <?= attrs('nav_market') ?>><?= t('nav_market', $lang) ?></a>
        <a href="#pricing" <?= attrs('nav_pricing') ?>><?= t('nav_pricing', $lang) ?></a>
      </nav>
      <div class="controls">
        <div class="lang" role="group" aria-label="Langue / اللغة">
          <button type="button" data-lang="fr" aria-pressed="<?= $lang === 'fr' ? 'true' : 'false' ?>">FR</button>
          <button type="button" data-lang="ar" aria-pressed="<?= $lang === 'ar' ? 'true' : 'false' ?>">عربية</button>
        </div>
        <button class="icon-btn" id="theme" type="button" aria-label="Thème clair / sombre">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>
        </button>
        <a class="btn btn-primary nav-cta" href="#cta" <?= attrs('nav_cta') ?>><?= t('nav_cta', $lang) ?></a>
      </div>
    </div>
  </header>

  <!-- HERO -->
  <section class="hero">
    <div class="glow"></div><div class="glow2"></div>
    <div class="shell hero-inner">
      <div class="hero-copy">
        <span class="badge reveal"><span class="dot"></span><span <?= attrs('badge') ?>><?= t('badge', $lang) ?></span></span>
        <h1 class="reveal" data-i="1" <?= attrs('hero_h1') ?>><?= t('hero_h1', $lang) ?></h1>
        <p class="lead reveal" data-i="2" <?= attrs('hero_lead') ?>><?= t('hero_lead', $lang) ?></p>
        <div class="cta-row reveal" data-i="3">
          <a class="btn btn-primary btn-lg" href="#cta" <?= attrs('cta_create') ?>><?= t('cta_create', $lang) ?></a>
          <a class="btn btn-ghost btn-lg" href="#market" style="color:var(--harbor-ink);border-color:rgba(242,233,214,.35)" <?= attrs('cta_explore') ?>><?= t('cta_explore', $lang) ?></a>
        </div>
        <div class="hero-sub reveal" data-i="4">
          <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span <?= attrs('sub1') ?>><?= t('sub1', $lang) ?></span></span>
          <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span <?= attrs('sub2') ?>><?= t('sub2', $lang) ?></span></span>
          <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span <?= attrs('sub3') ?>><?= t('sub3', $lang) ?></span></span>
        </div>
      </div>
      <!-- Mockup boutique -->
      <div class="mockup reveal" data-i="2" aria-hidden="true">
        <div class="mock-bar"><i></i><i></i><i></i><span class="mock-url">salma.marsa</span></div>
        <div class="mock-body">
          <div class="mock-shophead">
            <div class="mock-logo">S</div>
            <div><b <?= attrs('mock_shop') ?>><?= t('mock_shop', $lang) ?></b><small <?= attrs('mock_tag') ?>><?= t('mock_tag', $lang) ?></small></div>
          </div>
          <div class="mock-grid">
            <?php for ($i = 0; $i < 6; $i++): ?>
            <div class="mock-prod"><div class="ph"></div><div class="pi"><b>••••</b><span>•••• MRU</span></div></div>
            <?php endfor; ?>
          </div>
          <div class="mock-cta"><div class="pill"></div><div class="pill ghost"></div></div>
        </div>
      </div>
    </div>
  </section>

  <!-- MARQUEE catégories -->
  <div class="marquee" aria-hidden="true">
    <div class="marquee-track">
      <?php for ($r = 0; $r < 2; $r++): foreach ($cats as $c): ?>
        <span class="chip"><span class="em"><?= $c[0] ?></span><span data-fr="<?= htmlspecialchars($c[1]['fr']) ?>" data-ar="<?= htmlspecialchars($c[1]['ar']) ?>"><?= htmlspecialchars($c[1][$lang] ?? $c[1]['fr']) ?></span></span>
      <?php endforeach; endfor; ?>
    </div>
  </div>

  <!-- ETAPES -->
  <section class="band">
    <div class="shell">
      <div class="sec-head reveal">
        <span class="eyebrow" <?= attrs('steps_eyebrow') ?>><?= t('steps_eyebrow', $lang) ?></span>
        <h2 <?= attrs('steps_h2') ?>><?= t('steps_h2', $lang) ?></h2>
        <p <?= attrs('steps_p') ?>><?= t('steps_p', $lang) ?></p>
      </div>
      <div class="steps-grid">
        <?php foreach (['s1','s2','s3','s4'] as $i => $s): ?>
        <div class="step reveal" data-i="<?= $i ?>">
          <div class="num"></div>
          <h3 <?= attrs($s.'_h') ?>><?= t($s.'_h', $lang) ?></h3>
          <p <?= attrs($s.'_p') ?>><?= t($s.'_p', $lang) ?></p>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
  </section>

  <!-- FONCTIONNALITES -->
  <section class="band" id="features" style="background:var(--surface-2)">
    <div class="shell">
      <div class="sec-head reveal">
        <span class="eyebrow" <?= attrs('feat_eyebrow') ?>><?= t('feat_eyebrow', $lang) ?></span>
        <h2 <?= attrs('feat_h2') ?>><?= t('feat_h2', $lang) ?></h2>
        <p <?= attrs('feat_p') ?>><?= t('feat_p', $lang) ?></p>
      </div>
      <div class="features">
        <?php
        $ficons = [
          'M3 9l1.5-5h15L21 9M4 9h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z',
          'M20 7 12 3 4 7v10l8 4 8-4zM4 7l8 4 8-4M12 11v10',
          'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
          'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3',
          'M2 6h20v12H2zM12 9v6M9 12h6',
          'M4 5h16v4H4zM4 11h10v8H4zM16 11h4v8h-4z',
        ];
        foreach (['f1','f2','f3','f4','f5','f6'] as $i => $f): ?>
        <div class="feat reveal" data-i="<?= $i ?>">
          <div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="<?= $ficons[$i] ?>"/></svg></div>
          <h3 <?= attrs($f.'_h') ?>><?= t($f.'_h', $lang) ?></h3>
          <p <?= attrs($f.'_p') ?>><?= t($f.'_p', $lang) ?></p>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
  </section>

  <!-- THEMES -->
  <section class="band" id="themes">
    <div class="shell">
      <div class="sec-head reveal">
        <span class="eyebrow" <?= attrs('themes_eyebrow') ?>><?= t('themes_eyebrow', $lang) ?></span>
        <h2 <?= attrs('themes_h2') ?>><?= t('themes_h2', $lang) ?></h2>
        <p <?= attrs('themes_p') ?>><?= t('themes_p', $lang) ?></p>
      </div>
      <div class="themes">
        <?php foreach ([['th1','theme-t1','S'],['th2','theme-t2','P'],['th3','theme-t3','A'],['th4','theme-t4','O']] as $i => $th): ?>
        <div class="theme-card reveal" data-i="<?= $i ?>">
          <div class="theme-preview <?= $th[1] ?>">
            <div class="tp-top"><span class="tp-logo"></span><span class="tp-name"><?= $th[2] ?></span></div>
            <div class="tp-row"><span class="tp-tile"></span><span class="tp-tile"></span><span class="tp-tile"></span></div>
            <span class="tp-btn" <?= attrs('th_customize') ?>><?= t('th_customize', $lang) ?></span>
          </div>
          <div class="theme-meta"><b <?= attrs($th[0].'_n') ?>><?= t($th[0].'_n', $lang) ?></b><span <?= attrs($th[0].'_t') ?>><?= t($th[0].'_t', $lang) ?></span></div>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
  </section>

  <!-- MARKETPLACE + RECHERCHE -->
  <section class="band market" id="market">
    <div class="shell">
      <div class="sec-head reveal">
        <span class="eyebrow" <?= attrs('mk_eyebrow') ?>><?= t('mk_eyebrow', $lang) ?></span>
        <h2 <?= attrs('mk_h2') ?>><?= t('mk_h2', $lang) ?></h2>
        <p <?= attrs('mk_p') ?>><?= t('mk_p', $lang) ?></p>
      </div>
      <div class="searchbar reveal" role="search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <div class="fake-input" id="search-typed" data-words="une robe brodée|des écouteurs|du tissu wax|un parfum|des sandales"><span class="txt"></span><span class="cursor"></span></div>
        <button class="btn btn-primary" type="button" <?= attrs('mk_search') ?>><?= t('mk_search', $lang) ?></button>
      </div>
      <div class="market-grid">
        <?php foreach ($prods as $i => $p): ?>
        <div class="pcard reveal" data-i="<?= $i % 4 ?>">
          <div class="thumb" style="background:<?= $p[2] ?>">
            <span class="badge-cod" <?= attrs('cod_label') ?>><?= t('cod_label', $lang) ?></span>
            <?= $p[1] ?>
          </div>
          <div class="pmeta">
            <b <?= attrs($p[0].'_n') ?>><?= t($p[0].'_n', $lang) ?></b>
            <span class="shop" <?= attrs($p[0].'_s') ?>><?= t($p[0].'_s', $lang) ?></span>
            <span class="price"><?= $p[3] ?></span>
          </div>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
  </section>

  <!-- TARIFS -->
  <section class="band" id="pricing" style="background:var(--surface-2)">
    <div class="shell">
      <div class="sec-head center reveal">
        <span class="eyebrow" <?= attrs('pr_eyebrow') ?>><?= t('pr_eyebrow', $lang) ?></span>
        <h2 <?= attrs('pr_h2') ?>><?= t('pr_h2', $lang) ?></h2>
        <p <?= attrs('pr_p') ?>><?= t('pr_p', $lang) ?></p>
      </div>
      <div class="pricing">
        <div class="plan reveal" data-i="0">
          <h3 <?= attrs('pl1_n') ?>><?= t('pl1_n', $lang) ?></h3>
          <div class="price" <?= attrs('pl1_price') ?>><?= t('pl1_price', $lang) ?></div>
          <p style="color:var(--muted);font-size:.86rem;margin-top:-6px" <?= attrs('pl1_sub') ?>><?= t('pl1_sub', $lang) ?></p>
          <ul>
            <?php foreach (['pl1_f1','pl1_f2','pl1_f3'] as $k): ?>
            <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span <?= attrs($k) ?>><?= t($k, $lang) ?></span></li>
            <?php endforeach; ?>
          </ul>
          <a class="btn btn-ghost" href="#cta" <?= attrs('pl_cta') ?>><?= t('pl_cta', $lang) ?></a>
        </div>
        <div class="plan featured reveal" data-i="1">
          <span class="tag" <?= attrs('pl_featured') ?>><?= t('pl_featured', $lang) ?></span>
          <h3 <?= attrs('pl2_n') ?>><?= t('pl2_n', $lang) ?></h3>
          <div class="price" <?= attrs('pl2_price') ?>><?= t('pl2_price', $lang) ?></div>
          <p style="color:var(--muted);font-size:.86rem;margin-top:-6px" <?= attrs('pl2_sub') ?>><?= t('pl2_sub', $lang) ?></p>
          <ul>
            <?php foreach (['pl2_f1','pl2_f2','pl2_f3'] as $k): ?>
            <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span <?= attrs($k) ?>><?= t($k, $lang) ?></span></li>
            <?php endforeach; ?>
          </ul>
          <a class="btn btn-primary" href="#cta" <?= attrs('pl_cta') ?>><?= t('pl_cta', $lang) ?></a>
        </div>
        <div class="plan reveal" data-i="2">
          <h3 <?= attrs('pl3_n') ?>><?= t('pl3_n', $lang) ?></h3>
          <div class="price" <?= attrs('pl3_price') ?>><?= t('pl3_price', $lang) ?></div>
          <p style="color:var(--muted);font-size:.86rem;margin-top:-6px" <?= attrs('pl3_sub') ?>><?= t('pl3_sub', $lang) ?></p>
          <ul>
            <?php foreach (['pl3_f1','pl3_f2','pl3_f3'] as $k): ?>
            <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span <?= attrs($k) ?>><?= t($k, $lang) ?></span></li>
            <?php endforeach; ?>
          </ul>
          <a class="btn btn-ghost" href="#cta" <?= attrs('pl_cta') ?>><?= t('pl_cta', $lang) ?></a>
        </div>
      </div>
      <p class="note-indic reveal" <?= attrs('pr_note') ?>><?= t('pr_note', $lang) ?></p>
    </div>
  </section>

  <!-- DISPONIBILITE -->
  <section class="band">
    <div class="shell">
      <div class="sec-head center reveal">
        <span class="eyebrow" <?= attrs('av_eyebrow') ?>><?= t('av_eyebrow', $lang) ?></span>
        <h2 <?= attrs('av_h2') ?>><?= t('av_h2', $lang) ?></h2>
      </div>
      <div class="avail reveal">
        <span class="country-chip"><span class="flag">🇲🇷</span>Mauritanie</span>
        <span class="country-chip"><span class="flag">🇸🇳</span>Sénégal</span>
        <span class="country-chip soon"><span class="flag">✦</span><span <?= attrs('av_soon') ?>><?= t('av_soon', $lang) ?></span></span>
      </div>
    </div>
  </section>

  <!-- CTA FINAL / LISTE D'ATTENTE -->
  <section class="band" id="cta" style="padding-top:0">
    <div class="shell">
      <div class="cta-final reveal">
        <div class="glow"></div>
        <h2 <?= attrs('cf_h2') ?>><?= t('cf_h2', $lang) ?></h2>
        <p <?= attrs('cf_p') ?>><?= t('cf_p', $lang) ?></p>
        <form class="wl-form" id="wl-form" novalidate>
          <input type="tel" name="phone" inputmode="tel" autocomplete="tel" required
                 placeholder="<?= htmlspecialchars(t('wl_ph', $lang)) ?>"
                 data-fr-ph="<?= htmlspecialchars(t('wl_ph', 'fr')) ?>" data-ar-ph="<?= htmlspecialchars(t('wl_ph', 'ar')) ?>">
          <button class="btn btn-primary btn-lg" type="submit" <?= attrs('wl_btn') ?>><?= t('wl_btn', $lang) ?></button>
        </form>
        <p class="wl-msg" id="wl-msg"
           data-fr-ok="<?= htmlspecialchars(t('wl_ok','fr')) ?>" data-ar-ok="<?= htmlspecialchars(t('wl_ok','ar')) ?>"
           data-fr-err="<?= htmlspecialchars(t('wl_err','fr')) ?>" data-ar-err="<?= htmlspecialchars(t('wl_err','ar')) ?>"></p>
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
