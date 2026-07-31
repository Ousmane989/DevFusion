<?php
/** Marsa — vérification de l'e-mail par code à 6 chiffres. */
require __DIR__ . '/includes/layout.php';

$u = require_login();
if ($u['statut'] !== 'non_verifie') { redirect('compte.php'); }
$csrf = csrf_token();
$err = '';
$info = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && csrf_ok($_POST['csrf'] ?? '')) {
    if (($_POST['action'] ?? '') === 'renvoyer') {
        $wait = 60 - (time() - (int) ($_SESSION['last_code'] ?? 0));
        if ($wait > 0) { $err = "Patientez {$wait}s avant de renvoyer un code."; }
        else {
            $code = gen_code((int) $u['id'], 'email');
            send_code($u, $code, 'email');
            $_SESSION['last_code'] = time();
            $info = 'Un nouveau code a été envoyé.';
        }
    } else {
        if (verify_code((int) $u['id'], (string) ($_POST['code'] ?? ''), 'email')) {
            $days = (int) (cfg()['trial_days'] ?? 3);
            $fin = date('c', time() + $days * 86400);
            q("UPDATE utilisateurs SET email_verifie=1, statut='essai', essai_fin=? WHERE id=?", [$fin, $u['id']]);
            $pl = plan_info($u['plan']);
            q('INSERT INTO abonnements (user_id, plan, prix, devise, statut, debut, fin, cree_le) VALUES (?,?,?,?,?,?,?,?)',
              [$u['id'], $u['plan'], $pl['price'], currency_of_country($u['pays']), 'en_attente', date('c'), $fin, date('c')]);
            redirect('assistant.php');
        }
        $err = 'Code invalide ou expiré.';
    }
}
$demo = $_SESSION['demo_code'] ?? '';
head('Marsa — Vérification de l\'e-mail');
topbar(back_button('index.php', 'Accueil'), '<a class="mini-back" href="deconnexion.php">Se déconnecter</a>');
?>
<main class="access-main">
  <div class="access-card" style="max-width:440px">
    <div><span class="eyebrow">Étape 1 / 2</span><h1 style="margin-top:8px">Vérifiez votre e-mail</h1></div>
    <p class="sub">Nous avons envoyé un code à 6 chiffres à <b><?= e($u['email']) ?></b>. Il expire dans 15 minutes.</p>
    <?php if ($demo !== ''): ?><div class="flash" style="background:color-mix(in srgb,var(--accent) 16%,var(--surface));color:var(--accent-strong)">Mode démo (pas de serveur e-mail) — votre code : <b style="letter-spacing:.2em"><?= e($demo) ?></b></div><?php endif; ?>
    <?= flash_banner($err, 'err') ?><?= flash_banner($info, 'ok') ?>
    <form class="access-form" method="post" action="verification.php" novalidate>
      <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
      <div class="field"><label>Code de vérification</label><input name="code" inputmode="numeric" maxlength="6" required placeholder="000000" style="letter-spacing:.4em;text-align:center;font-size:1.3rem"></div>
      <button class="btn btn-primary btn-lg" type="submit">Vérifier</button>
    </form>
    <form method="post" action="verification.php" style="margin-top:4px">
      <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
      <input type="hidden" name="action" value="renvoyer">
      <button class="btn btn-ghost" type="submit" style="width:100%;justify-content:center">Renvoyer le code</button>
    </form>
  </div>
</main>
<?php foot(false); ?>
