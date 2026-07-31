<?php
/**
 * Marsa — inscription vendeur façon Shopify (identité, boutique, offre).
 */
$config = require __DIR__ . '/includes/config.php';
require __DIR__ . '/includes/i18n.php';
require __DIR__ . '/includes/auth.php';

if (current_merchant() !== null) { header('Location: compte.php'); exit; }
$csrf = csrf_token();

$lang = 'fr';
$dir = 'ltr';

$types = ['Électronique', 'Mode & tissus', 'Alimentaire', 'Artisanat', 'Maison', 'Beauté', 'Autre'];
?>
<!DOCTYPE html>
<html lang="fr" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Marsa — Créer votre boutique</title>
  <meta name="robots" content="noindex">
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
  <header class="top">
    <div class="shell mini-top">
      <a class="mini-back" href="index.php">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        <span>Retour à l'accueil</span>
      </a>
      <a class="brand" href="index.php" aria-label="Marsa">
        <svg class="mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <circle cx="20" cy="17" r="12.5" stroke="var(--accent)" stroke-width="2.4"/>
          <circle cx="20" cy="17" r="4.2" fill="var(--accent)"/>
          <path d="M4 31c4 2.6 7 2.6 10.6 0M14.6 31c3.6 2.6 7 2.6 10.8 0M25.4 31c3.6 2.6 6.6 2.6 10.6 0" stroke="var(--emerald)" stroke-width="2.4" stroke-linecap="round"/>
        </svg>
        <span class="brand-text"><span class="brand-ar">مرسى</span><span class="brand-la">Marsa</span></span>
      </a>
      <a class="mini-back" href="connexion.php">Se connecter</a>
    </div>
  </header>

  <main class="access-main">
    <div class="access-card signup-card">
      <div>
        <span class="eyebrow">Créer votre boutique</span>
        <h1 style="margin-top:8px">Lancez votre commerce en ligne</h1>
      </div>
      <p class="sub">Quelques informations et votre boutique est prête. <b>3 jours d'essai gratuit</b>, sans paiement.</p>

      <form class="access-form" id="register-form" novalidate>
        <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf) ?>">

        <p class="form-section">Vous</p>
        <div class="field-grid">
          <div class="field"><label for="f-first">Prénom</label><input id="f-first" name="first_name" required autocomplete="given-name" placeholder="Ex. Salma"></div>
          <div class="field"><label for="f-last">Nom</label><input id="f-last" name="last_name" required autocomplete="family-name" placeholder="Ex. Mint Ahmed"></div>
        </div>
        <div class="field-grid">
          <div class="field"><label for="f-email">E-mail (pour les notifications)</label><input id="f-email" name="email" type="email" autocomplete="email" placeholder="vous@exemple.com"></div>
          <div class="field"><label for="f-phone">Téléphone (WhatsApp)</label><input id="f-phone" name="phone" type="tel" inputmode="tel" required autocomplete="tel" placeholder="Ex. 22 00 00 00"></div>
        </div>
        <div class="field-grid">
          <div class="field"><label for="f-country">Pays</label>
            <select id="f-country" name="country">
              <?php foreach ($config['countries'] as $code => $c): ?>
                <option value="<?= htmlspecialchars($code) ?>"<?= $code === $config['default_country'] ? ' selected' : '' ?>><?= htmlspecialchars($c['name']['fr']) ?></option>
              <?php endforeach; ?>
            </select>
          </div>
          <div class="field"><label for="f-city">Ville</label><input id="f-city" name="city" placeholder="Ex. Nouakchott"></div>
        </div>
        <div class="field"><label for="f-pass">Mot de passe</label><input id="f-pass" name="password" type="password" required autocomplete="new-password" minlength="6" placeholder="Au moins 6 caractères"></div>

        <p class="form-section">Votre boutique</p>
        <div class="field">
          <label for="f-shop">Nom de la boutique</label>
          <input id="f-shop" name="shop" required autocomplete="organization" placeholder="Ex. Boutique Salma">
          <p class="sub-url"><span class="u-slug" id="shop-slug">votre-boutique</span><span class="u-prefix">.marsa.mr</span></p>
        </div>
        <div class="field">
          <label for="f-type">Que vendez-vous ?</label>
          <select id="f-type" name="shop_type">
            <?php foreach ($types as $ty): ?><option value="<?= htmlspecialchars($ty) ?>"><?= htmlspecialchars($ty) ?></option><?php endforeach; ?>
          </select>
        </div>

        <p class="form-section">Votre offre <span class="tiny">· 3 jours gratuits, aucune carte demandée</span></p>
        <div class="plan-choice">
          <?php $i = 0; foreach ($config['plans'] as $key => $pl): ?>
            <label class="plan-opt">
              <input type="radio" name="plan" value="<?= htmlspecialchars($key) ?>"<?= $key === 'decouverte' ? ' checked' : '' ?>>
              <span class="plan-opt-in">
                <b><?= htmlspecialchars($pl['name']) ?></b>
                <span class="p"><?= number_format($pl['price'], 0, ',', ' ') ?> <small>MRU/mois</small></span>
                <span class="ai-tag">IA incluse</span>
              </span>
            </label>
          <?php $i++; endforeach; ?>
        </div>

        <button class="btn btn-primary btn-lg" type="submit">Créer ma boutique — 3 jours gratuits</button>
        <p class="access-msg" id="register-msg"
           data-fr-err="Vérifiez les champs et réessayez." data-ar-err="تحقق من الحقول وأعد المحاولة."
           data-fr-dup="Ce numéro ou e-mail a déjà une boutique. Connectez-vous." data-ar-dup="هذا الرقم أو البريد لديه متجر بالفعل."></p>
      </form>

      <div class="signup-ok" id="register-ok" hidden>
        <div class="ok-badge">✓</div>
        <h2>Boutique créée 🎉</h2>
        <p class="sub">Votre essai gratuit de 3 jours démarre maintenant. Après 3 jours, la boutique se ferme et notre assistante vous contacte sur WhatsApp pour activer votre offre.</p>
        <a class="btn btn-primary btn-lg" href="compte.php">Aller à mon espace</a>
      </div>

      <div class="access-foot">
        <span>Vous avez déjà une boutique ?</span>
        <a href="connexion.php">Se connecter</a>
      </div>
    </div>
  </main>

  <script src="assets/js/app.js"></script>
</body>
</html>
