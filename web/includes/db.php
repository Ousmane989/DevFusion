<?php
/**
 * Marsa — base de données relationnelle (SQLite via PDO).
 * Le schéma est créé automatiquement au premier accès. Fichier unique
 * storage/marsa.sqlite (ignoré par git). Migration facile vers PostgreSQL :
 * même modèle relationnel, mêmes requêtes SQL standard.
 */

function db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) { return $pdo; }

    $dir = __DIR__ . '/../storage';
    if (!is_dir($dir)) { @mkdir($dir, 0775, true); }

    $pdo = new PDO('sqlite:' . $dir . '/marsa.sqlite');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec('PRAGMA foreign_keys = ON');
    db_init($pdo);
    return $pdo;
}

/** Requête préparée + exécutée. Renvoie le PDOStatement. */
function q(string $sql, array $params = []): PDOStatement
{
    $st = db()->prepare($sql);
    $st->execute($params);
    return $st;
}

/** Première ligne (ou null). */
function q1(string $sql, array $params = []): ?array
{
    $r = q($sql, $params)->fetch();
    return $r === false ? null : $r;
}

function db_init(PDO $pdo): void
{
    $pdo->exec("
    CREATE TABLE IF NOT EXISTS utilisateurs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT NOT NULL,
        email TEXT UNIQUE,
        telephone TEXT,
        mot_de_passe TEXT NOT NULL,
        pays TEXT NOT NULL DEFAULT 'MR',
        plan TEXT NOT NULL DEFAULT 'basique',
        email_verifie INTEGER NOT NULL DEFAULT 0,
        statut TEXT NOT NULL DEFAULT 'non_verifie', -- non_verifie|essai|actif|verrouille
        essai_fin TEXT,
        abo_fin TEXT,
        cree_le TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS abonnements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        plan TEXT NOT NULL,
        prix INTEGER NOT NULL,
        devise TEXT NOT NULL,
        statut TEXT NOT NULL DEFAULT 'en_attente', -- en_attente|actif|expire
        debut TEXT,
        fin TEXT,
        cree_le TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES utilisateurs(id)
    );

    CREATE TABLE IF NOT EXISTS paiements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        montant INTEGER NOT NULL,
        devise TEXT NOT NULL,
        methode TEXT NOT NULL,
        reference TEXT NOT NULL,
        statut TEXT NOT NULL DEFAULT 'valide', -- valide|echoue|rembourse
        cree_le TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES utilisateurs(id)
    );

    CREATE TABLE IF NOT EXISTS boutiques (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        nom TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        logo TEXT DEFAULT '',
        banniere TEXT DEFAULT '',
        couleur TEXT DEFAULT '#C8912A',
        theme TEXT DEFAULT 'souk',
        description TEXT DEFAULT '',
        categorie TEXT DEFAULT '',
        contact_tel TEXT DEFAULT '',
        contact_email TEXT DEFAULT '',
        reseaux TEXT DEFAULT '',
        devise TEXT DEFAULT 'MRU',
        zones TEXT DEFAULT '',
        en_ligne INTEGER NOT NULL DEFAULT 0,
        configuree INTEGER NOT NULL DEFAULT 0,
        cree_le TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES utilisateurs(id)
    );

    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        boutique_id INTEGER NOT NULL,
        nom TEXT NOT NULL,
        ordre INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (boutique_id) REFERENCES boutiques(id)
    );

    CREATE TABLE IF NOT EXISTS produits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        boutique_id INTEGER NOT NULL,
        nom TEXT NOT NULL,
        description TEXT DEFAULT '',
        prix INTEGER NOT NULL DEFAULT 0,
        prix_compare INTEGER NOT NULL DEFAULT 0,
        stock INTEGER NOT NULL DEFAULT 0,
        categorie_id INTEGER,
        categorie TEXT DEFAULT '',
        photos TEXT DEFAULT '',
        visible INTEGER NOT NULL DEFAULT 1,
        ordre INTEGER NOT NULL DEFAULT 0,
        cree_le TEXT NOT NULL,
        FOREIGN KEY (boutique_id) REFERENCES boutiques(id)
    );

    CREATE TABLE IF NOT EXISTS commandes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        boutique_id INTEGER NOT NULL,
        client_nom TEXT NOT NULL,
        client_tel TEXT NOT NULL,
        adresse TEXT NOT NULL,
        total INTEGER NOT NULL,
        devise TEXT NOT NULL,
        paiement TEXT NOT NULL DEFAULT 'cod',
        statut TEXT NOT NULL DEFAULT 'en_attente', -- en_attente|confirmee|expediee|livree|annulee
        cree_le TEXT NOT NULL,
        FOREIGN KEY (boutique_id) REFERENCES boutiques(id)
    );

    CREATE TABLE IF NOT EXISTS lignes_commande (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        commande_id INTEGER NOT NULL,
        produit_id INTEGER,
        nom TEXT NOT NULL,
        prix INTEGER NOT NULL,
        qte INTEGER NOT NULL,
        total INTEGER NOT NULL,
        FOREIGN KEY (commande_id) REFERENCES commandes(id)
    );

    CREATE TABLE IF NOT EXISTS codes_verification (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        code TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'email', -- email|reset
        expire_le TEXT NOT NULL,
        utilise INTEGER NOT NULL DEFAULT 0,
        cree_le TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES utilisateurs(id)
    );

    CREATE TABLE IF NOT EXISTS visites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        boutique_id INTEGER NOT NULL,
        jour TEXT NOT NULL,
        ip TEXT,
        cree_le TEXT NOT NULL
    );
    ");
}
