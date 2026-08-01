<?php
/**
 * Marsa — endpoint liste d'attente (pré-lancement).
 *
 * Reçoit un numéro de téléphone en POST (JSON ou formulaire), le valide très
 * simplement, et l'enregistre dans storage/subscribers.csv. Volontairement
 * minimal : à remplacer par une vraie couche service + base de données lors
 * du développement de la plateforme.
 */

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
    exit;
}

// Accepte JSON ou application/x-www-form-urlencoded.
$phone = '';
$raw   = file_get_contents('php://input');
if ($raw !== '' && ($json = json_decode($raw, true)) !== null && isset($json['phone'])) {
    $phone = (string) $json['phone'];
} elseif (isset($_POST['phone'])) {
    $phone = (string) $_POST['phone'];
}

// Validation : 8 à 15 chiffres après nettoyage (formats FR/AR, espaces, +).
$digits = preg_replace('/\D+/', '', $phone);
if ($digits === '' || strlen($digits) < 8 || strlen($digits) > 15) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'invalid_phone']);
    exit;
}

$dir = __DIR__ . '/../storage';
if (!is_dir($dir)) {
    @mkdir($dir, 0775, true);
}

$row = [date('c'), $digits, $_SERVER['REMOTE_ADDR'] ?? ''];
$fh  = @fopen($dir . '/subscribers.csv', 'a');
if ($fh === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'storage_unavailable']);
    exit;
}
fputcsv($fh, $row);
fclose($fh);

echo json_encode(['ok' => true]);
