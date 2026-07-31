<?php
/**
 * Marsa — couche de données simple (fichier JSON).
 * Provisoire : à remplacer par PostgreSQL lors du développement de la
 * plateforme. Suffit pour l'inscription des vendeurs et leur autorisation.
 */

function store_path(): string
{
    $dir = __DIR__ . '/../storage';
    if (!is_dir($dir)) { @mkdir($dir, 0775, true); }
    return $dir . '/merchants.json';
}

/** @return array<int,array<string,mixed>> */
function store_load(): array
{
    $f = store_path();
    if (!is_file($f)) { return []; }
    $j = json_decode((string) file_get_contents($f), true);
    return is_array($j) ? $j : [];
}

function store_save(array $rows): void
{
    file_put_contents(
        store_path(),
        json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
        LOCK_EX
    );
}

function store_find_phone(array $rows, string $phone): ?array
{
    foreach ($rows as $r) {
        if (($r['phone'] ?? '') === $phone) { return $r; }
    }
    return null;
}

function store_add(array $merchant): void
{
    $rows = store_load();
    $rows[] = $merchant;
    store_save($rows);
}

/** Met à jour le statut d'un vendeur et renvoie la liste à jour. */
function store_set_status(string $id, string $status): array
{
    $rows = store_load();
    foreach ($rows as &$r) {
        if (($r['id'] ?? '') === $id) { $r['status'] = $status; }
    }
    unset($r);
    store_save($rows);
    return $rows;
}
