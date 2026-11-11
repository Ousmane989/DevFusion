<?php
/** Marsa — assistant de création / personnalisation de la boutique. */
require __DIR__ . '/includes/layout.php';
$u = guard_app();
$existing = boutique_of((int) $u['id']);
if ($existing && (int) $existing['configuree'] === 1) { redirect('compte.php'); }
$csrf = csrf_token();
$err = '';
$devise = currency_of_country($u['pays']);

if ($_SERVER['REQUEST_METHOD'] === 'POST' && csrf_ok($_POST['csrf'] ?? '')) {
    $nom = trim((string) ($_POST['nom'] ?? ''));
    $theme = isset(cfg()['themes'][$_POST['theme'] ?? '']) ? $_POST['theme'] : 'souk';
    if (mb_strlen($nom) < 2) { $err = 'Donnez un nom à votre boutique.'; }
    else {
        $data = [
            'nom' => $nom,
            'theme' => $theme,
            'couleur' => cfg()['themes'][$theme]['accent'],
            'description' => trim((string) ($_POST['description'] ?? '')),
            'categorie' => trim((string) ($_POST['categorie'] ?? '')),
            'logo' => trim((string) ($_POST['logo'] ?? '')),
            'banniere' => trim((string) ($_POST['banniere'] ?? '')),
            'contact_tel' => trim((string) ($_POST['contact_tel'] ?? $u['telephone'])),
            'contact_email' => trim((string) ($_POST['contact_email'] ?? $u['email'])),
            'reseaux' => trim((string) ($_POST['reseaux'] ?? '')),
            'zones' => trim((string) ($_POST['zones'] ?? '')),
        ];
        if ($existing) {
            q('UPDATE boutiques SET nom=?, theme=?, couleur=?, description=?, categorie=?, logo=?, banniere=?, contact_tel=?, contact_email=?, reseaux=?, zones=?, en_ligne=1, configuree=1 WHERE user_id=?',
              array_merge(array_values($data), [$u['id']]));
        } else {
            q('INSERT INTO boutiques (user_id, nom, slug, theme, couleur, description, categorie, logo, banniere, contact_tel, contact_email, reseaux, devise, zones, en_ligne, configuree, cree_le)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,1,?)',
              [$u['id'], $data['nom'], unique_slug($data['nom']), $data['theme'], $data['couleur'], $data['description'], $data['categorie'],
               $data['logo'], $data['banniere'], $data['contact_tel'], $data['contact_email'], $data['reseaux'], $devise, $data['zones'], date('c')]);
        }
        redirect('compte.php?f=' . rawurlencode('Votre boutique est en ligne !'));
    }
}
head('Marsa — Créer ma boutique');
topbar('', '<a class="mini-back" href="deconnexion.php">Se déconnecter</a>', 'Assistant');
?>
<main class="access-main">
  <div class="access-card signup-card">
    <div><span class="eyebrow">Étape 2 / 2</span><h1 style="margin-top:8px">Personnalisez votre boutique</h1></div>
    <p class="sub">Ces informations apparaîtront sur votre boutique publique. Vous pourrez tout modifier plus tard.</p>
    <?= flash_banner($err, 'err') ?>
    <form class="access-form" method="post" action="assistant.php" novalidate>
      <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
      <div class="field"><label>Nom de la boutique</label><input name="nom" required placeholder="Ex. Boutique Salma"></div>
      <div class="field"><label>Description</label><textarea name="description" rows="2" placeholder="Présentez votre boutique…"></textarea></div>
      <div class="field-grid">
        <div class="field"><label>Catégorie d'activité</label><input name="categorie" placeholder="Ex. Mode & tissus"></div>
        <div class="field"><label>Zones de livraison</label><input name="zones" placeholder="Ex. Nouakchott, Nouadhibou"></div>
      </div>
      <div class="field-grid">
        <div class="field"><label>Logo (lien image, optionnel)</label><input name="logo" placeholder="https://…"></div>
        <div class="field"><label>Bannière (lien image, optionnel)</label><input name="banniere" placeholder="https://…"></div>
      </div>
      <div class="field-grid">
        <div class="field"><label>Téléphone de contact</label><input name="contact_tel" value="<?= e($u['telephone']) ?>"></div>
        <div class="field"><label>Réseaux (lien, optionnel)</label><input name="reseaux" placeholder="https://wa.me/…"></div>
      </div>
      <p class="form-section">Thème</p>
      <div class="theme-choice">
        <?php foreach (cfg()['themes'] as $key => $th): ?>
          <label class="theme-opt">
            <input type="radio" name="theme" value="<?= e($key) ?>"<?= $key === 'souk' ? ' checked' : '' ?>>
            <span class="theme-swatch" style="background:linear-gradient(135deg,<?= $th['accent'] ?>,<?= $th['hero'] ?>)"></span>
            <b><?= e($th['name']) ?></b>
          </label>
        <?php endforeach; ?>
      </div>
      <button class="btn btn-primary btn-lg" type="submit">Mettre ma boutique en ligne</button>
    </form>
  </div>
</main>
<?php foot(false); ?>
