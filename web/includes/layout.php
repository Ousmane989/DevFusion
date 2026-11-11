<?php
/** Marsa — gabarit d'affichage partagé (en-tête, barre, pied). */
require_once __DIR__ . '/app.php';

function head(string $title, bool $noindex = true): void
{
    echo '<!DOCTYPE html><html lang="fr" dir="ltr"><head><meta charset="UTF-8">';
    echo '<meta name="viewport" content="width=device-width, initial-scale=1">';
    echo '<title>' . e($title) . '</title>';
    if ($noindex) { echo '<meta name="robots" content="noindex">'; }
    echo '<link rel="stylesheet" href="assets/css/style.css"></head><body>';
}

/** Barre supérieure : à gauche (souvent le bouton retour), à droite (actions). */
function topbar(string $left = '', string $right = '', string $sub = 'Marsa'): void
{
    echo '<header class="top"><div class="shell mini-top">';
    echo '<div class="mt-left">' . $left . '</div>';
    echo brand_mark($sub);
    echo '<div class="mt-right">' . $right . '</div>';
    echo '</div></header>';
}

function foot(bool $withJs = true): void
{
    if ($withJs) { echo '<script src="assets/js/app.js"></script>'; }
    echo '</body></html>';
}

function flash_banner(string $msg, string $type = 'ok'): string
{
    if ($msg === '') { return ''; }
    return '<div class="flash ' . e($type) . '">' . e($msg) . '</div>';
}
