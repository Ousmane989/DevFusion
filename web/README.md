# Marsa — plateforme e-commerce (Mauritanie / Sénégal)

SaaS de création de boutiques en ligne (façon Shopify / Adafrik) :
inscription + vérification e-mail, essai de 3 jours puis abonnement,
personnalisation de boutique, gestion produits/commandes, statistiques,
et boutique publique avec paiement à la livraison.

## Lancer en local

Prérequis : **PHP 8+** (extension `pdo_sqlite`, incluse par défaut).

```bash
cd web
php -S localhost:8000 -t .
```

Ouvrir <http://localhost:8000/>. La base **SQLite** (`storage/marsa.sqlite`)
est créée automatiquement au premier accès.

> ⚠️ Il faut un **serveur PHP** — ouvrir les `.php` en statique (ou via un
> hébergeur sans PHP comme Vercel) renvoie « unsupported media type ».
> Pour les e-mails réels et les sous-domaines `slug.marsa.mr`, configurer
> SMTP + DNS joker chez l'hébergeur.

## Architecture

- **Base de données relationnelle** : SQLite via PDO (`includes/db.php`).
  Tables : `utilisateurs`, `abonnements`, `paiements`, `boutiques`,
  `categories`, `produits`, `commandes`, `lignes_commande`,
  `codes_verification`, `visites`. Modèle standard → migration PostgreSQL aisée.
- **Socle** (`includes/app.php`) : sessions httponly, CSRF, états de compte,
  gardes d'accès, codes de vérification, e-mail, statistiques (calcul serveur),
  navigation (retour + fil d'Ariane). Tout contrôle critique est côté serveur.
- **Paiement** (`includes/payment.php`) : interface `PaymentProvider`
  (mobile money, carte, virement) — brancher un opérateur sans toucher au reste.

## Parcours & pages

| Page | Rôle |
|---|---|
| `index.php` | Accueil / marketing (bilingue FR/AR) |
| `inscription.php` → `verification.php` | Création de compte + code e-mail (6 chiffres, 15 min) |
| `connexion.php` · `mot-de-passe-oublie.php` · `reinitialiser.php` | Connexion, réinitialisation par code |
| `assistant.php` | Création / personnalisation de la boutique |
| `compte.php` | Espace client : Accueil (stats+graphique), Produits, Commandes, Ma boutique, Abonnement, export CSV |
| `paiement.php` → `facture.php` | Abonnement (montant exact du tarif), facture imprimable |
| `boutique.php` · `produit.php` · `contact.php` | Boutique publique, fiche produit, commande COD, contact |

## États du compte

`non_verifie` → `essai` (3 jours) → `verrouille` (essai/abo expiré, boutique
hors ligne, redirection paiement) → `actif` (après paiement, +30 jours,
boutique en ligne). Recalcul côté serveur à chaque accès.

## Offres

| Offre | Prix | Produits |
|---|---|---|
| Basique | 600 MRU/mois | 20 |
| Standard | 1000 MRU/mois | 100 |
| Premium | 1500 MRU/mois | illimité |

Devise selon le pays de la boutique : **MRU** (Mauritanie) / **XOF** (Sénégal).
