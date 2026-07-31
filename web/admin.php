<?php
/**
 * Marsa — back-office d'autorisation (réservé à l'équipe Marsa).
 * Le paiement en ligne n'étant pas disponible, l'accès des vendeurs après
 * l'essai gratuit est autorisé ici manuellement. Outil interne, en français.
 *
 * Provisoire : mot de passe simple + stockage fichier. À remplacer par une
 * vraie authentification (rôles, journal d'audit) et PostgreSQL.
 */
session_start();
$config = require __DIR__ . '/includes/config.php';
require __DIR__ . '/includes/store.php';

$wa = preg_replace('/\D+/', '', $config['support_whatsapp'] ?? '');

// -- Déconnexion
if (($_GET['action'] ?? '') === 'logout') {
    $_SESSION = [];
    session_destroy();
    header('Location: admin.php');
    exit;
}

// -- Connexion
$loginError = false;
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['admin_password'])) {
    if (hash_equals((string) ($config['admin_password'] ?? ''), (string) $_POST['admin_password'])) {
        $_SESSION['marsa_admin'] = true;
        header('Location: admin.php');
        exit;
    }
    $loginError = true;
}

$authed = !empty($_SESSION['marsa_admin']);

// -- Actions d'autorisation (POST, protégées)
if ($authed && $_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['merchant_id'], $_POST['act'])) {
    $map = ['autoriser' => 'autorise', 'suspendre' => 'suspendu', 'reactiver' => 'essai'];
    $new = $map[$_POST['act']] ?? null;
    if ($new !== null) { store_set_status((string) $_POST['merchant_id'], $new); }
    header('Location: admin.php');
    exit;
}

$rows = $authed ? store_load() : [];
// Tri : en attente d'action d'abord (essai expiré, puis essai), autorisés ensuite.
usort($rows, function ($a, $b) {
    $order = ['essai' => 0, 'suspendu' => 1, 'autorise' => 2];
    return ($order[$a['status'] ?? 'essai'] ?? 9) <=> ($order[$b['status'] ?? 'essai'] ?? 9);
});

function trial_state(array $m): array
{
    $ends = strtotime($m['trial_ends'] ?? 'now');
    $left = (int) ceil(($ends - time()) / 86400);
    if (($m['status'] ?? '') === 'autorise') { return ['ok', 'Autorisé']; }
    if (($m['status'] ?? '') === 'suspendu') { return ['bad', 'Suspendu']; }
    if ($left > 0) { return ['warn', 'Essai — ' . $left . ' j restant' . ($left > 1 ? 's' : '')]; }
    return ['bad', 'Essai expiré'];
}
?>
<!DOCTYPE html>
<html lang="fr" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Marsa — Console d'autorisation</title>
  <meta name="robots" content="noindex">
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
  <header class="top">
    <div class="shell mini-top">
      <a class="brand" href="admin.php" aria-label="Marsa Console">
        <svg class="mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <circle cx="20" cy="17" r="12.5" stroke="var(--accent)" stroke-width="2.4"/>
          <circle cx="20" cy="17" r="4.2" fill="var(--accent)"/>
          <path d="M4 31c4 2.6 7 2.6 10.6 0M14.6 31c3.6 2.6 7 2.6 10.8 0M25.4 31c3.6 2.6 6.6 2.6 10.6 0" stroke="var(--emerald)" stroke-width="2.4" stroke-linecap="round"/>
        </svg>
        <span class="brand-text"><span class="brand-ar">مرسى</span><span class="brand-la">Console</span></span>
      </a>
      <?php if ($authed): ?>
        <a class="mini-back" href="admin.php?action=logout">Se déconnecter</a>
      <?php endif; ?>
    </div>
  </header>

  <?php if (!$authed): ?>
    <main class="access-main">
      <div class="access-card" style="max-width:420px">
        <div>
          <span class="eyebrow">Espace équipe Marsa</span>
          <h1 style="margin-top:8px">Console d'autorisation</h1>
        </div>
        <p class="sub">Réservé à l'équipe. Entrez le mot de passe pour gérer les accès vendeurs.</p>
        <form class="access-form" method="post" action="admin.php">
          <label for="pw">Mot de passe</label>
          <input id="pw" type="password" name="admin_password" required autofocus>
          <?php if ($loginError): ?><p class="access-msg err">Mot de passe incorrect.</p><?php endif; ?>
          <button class="btn btn-primary btn-lg" type="submit">Entrer</button>
        </form>
      </div>
    </main>
  <?php else: ?>
    <main class="shell" style="padding-block:34px">
      <div class="admin-head">
        <div>
          <span class="eyebrow">Back-office</span>
          <h1 style="font-size:1.7rem;margin-top:6px">Autorisation des vendeurs</h1>
          <p style="color:var(--muted);margin-top:6px">Autorisez les vendeurs à continuer après leurs 3 jours d'essai.</p>
        </div>
        <div class="admin-stats">
          <?php
            $all = store_load();
            $cEssai = count(array_filter($all, fn($m) => ($m['status'] ?? '') === 'essai'));
            $cAuth  = count(array_filter($all, fn($m) => ($m['status'] ?? '') === 'autorise'));
          ?>
          <div class="stat"><b><?= count($all) ?></b><span>Vendeurs</span></div>
          <div class="stat"><b><?= $cEssai ?></b><span>En essai</span></div>
          <div class="stat"><b><?= $cAuth ?></b><span>Autorisés</span></div>
        </div>
      </div>

      <?php if (!$rows): ?>
        <div class="empty-state">Aucun vendeur inscrit pour le moment. Les inscriptions apparaîtront ici automatiquement.</div>
      <?php else: ?>
      <div class="table-scroll">
        <table class="admin-table">
          <thead>
            <tr><th>Boutique</th><th>Vendeur</th><th>Ville</th><th>Statut</th><th>Inscription</th><th>Actions</th></tr>
          </thead>
          <tbody>
          <?php foreach ($rows as $m):
              [$cls, $label] = trial_state($m);
              $status = $m['status'] ?? 'essai'; ?>
            <tr>
              <td>
                <b><?= htmlspecialchars($m['shop'] ?? '') ?></b>
                <?php if (!empty($m['category'])): ?><small><?= htmlspecialchars($m['category']) ?></small><?php endif; ?>
              </td>
              <td>
                <?= htmlspecialchars($m['owner'] ?? '') ?>
                <small><a href="https://wa.me/<?= htmlspecialchars($m['phone'] ?? '') ?>" target="_blank" rel="noopener">+<?= htmlspecialchars($m['phone'] ?? '') ?></a></small>
              </td>
              <td><?= htmlspecialchars($m['city'] ?? '—') ?></td>
              <td><span class="st st-<?= $cls ?>"><?= htmlspecialchars($label) ?></span></td>
              <td><small><?= htmlspecialchars(date('d/m/Y', strtotime($m['created_at'] ?? 'now'))) ?></small></td>
              <td>
                <form method="post" action="admin.php" class="row-actions">
                  <input type="hidden" name="merchant_id" value="<?= htmlspecialchars($m['id'] ?? '') ?>">
                  <?php if ($status !== 'autorise'): ?>
                    <button class="btn-mini ok" name="act" value="autoriser" type="submit">Autoriser</button>
                  <?php endif; ?>
                  <?php if ($status !== 'suspendu'): ?>
                    <button class="btn-mini bad" name="act" value="suspendre" type="submit">Suspendre</button>
                  <?php else: ?>
                    <button class="btn-mini" name="act" value="reactiver" type="submit">Réactiver</button>
                  <?php endif; ?>
                </form>
              </td>
            </tr>
          <?php endforeach; ?>
          </tbody>
        </table>
      </div>
      <?php endif; ?>
    </main>
  <?php endif; ?>
</body>
</html>
