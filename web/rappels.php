<?php
/**
 * Marsa — rappels d'expiration de l'essai (J-2, J-1, J0).
 * À exécuter une fois par jour, en cron :
 *   - CLI : php rappels.php
 *   - Web : curl "https://…/rappels.php?token=VOTRE_JETON"
 * Chaque jalon n'est envoyé qu'une fois par utilisateur (table rappels).
 */
require __DIR__ . '/includes/app.php';

$cli = PHP_SAPI === 'cli';
if (!$cli) {
    header('Content-Type: text/plain; charset=utf-8');
    if (($_GET['token'] ?? '') !== (cfg()['cron_token'] ?? '')) {
        http_response_code(403);
        echo "Jeton invalide\n";
        exit;
    }
}

$now = time();
$envoyes = 0;
$users = q("SELECT * FROM utilisateurs WHERE statut = 'essai' AND essai_fin IS NOT NULL")->fetchAll();
foreach ($users as $u) {
    $left = (int) ceil((strtotime($u['essai_fin']) - $now) / 86400);
    $jalon = $left === 2 ? 'J-2' : ($left === 1 ? 'J-1' : ($left <= 0 ? 'J0' : null));
    if ($jalon === null) { continue; }
    if (q1('SELECT id FROM rappels WHERE user_id = ? AND jalon = ?', [$u['id'], $jalon])) { continue; }

    $pl = plan_info($u['plan']);
    $devise = currency_of_country($u['pays']);
    $montant = number_format($pl['price'], 0, ',', ' ') . ' ' . $devise;
    if ($jalon === 'J0') {
        $sujet = 'Marsa — Votre essai gratuit se termine aujourd\'hui';
        $corps = "Bonjour {$u['nom']},\n\nVotre essai gratuit se termine aujourd'hui. Pour garder votre boutique en ligne, réglez votre abonnement {$pl['name']} ({$montant}/mois).\n\n— Marsa";
    } else {
        $j = $jalon === 'J-2' ? '2 jours' : '1 jour';
        $sujet = "Marsa — Votre essai se termine dans {$j}";
        $corps = "Bonjour {$u['nom']},\n\nIl vous reste {$j} d'essai gratuit. Pensez à régler votre abonnement {$pl['name']} ({$montant}/mois) pour éviter la mise hors ligne de votre boutique.\n\n— Marsa";
    }
    if (!empty($u['email'])) {
        @mail($u['email'], $sujet, $corps, "From: Marsa <no-reply@marsa.mr>\r\nContent-Type: text/plain; charset=UTF-8");
        @file_put_contents(__DIR__ . '/storage/mail.log', date('c') . "  {$u['email']}  RAPPEL {$jalon}  {$sujet}\n", FILE_APPEND | LOCK_EX);
    }
    q('INSERT INTO rappels (user_id, jalon, cree_le) VALUES (?,?,?)', [$u['id'], $jalon, date('c')]);
    $envoyes++;
}
echo "Rappels envoyés : {$envoyes}\n";
