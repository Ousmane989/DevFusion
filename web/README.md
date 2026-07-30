# Marsa — page de pré-lancement (HTML · CSS · PHP · JS)

Vitrine bilingue **français / arabe (RTL)** pour la place de marché Marsa
(Mauritanie → Sénégal). Sert de socle réutilisable : i18n côté serveur,
configuration multi-pays, endpoint liste d'attente.

## Lancer en local

Prérequis : PHP 8+.

```bash
cd web
php -S localhost:8000 -t .
```

Puis ouvrir :

- <http://localhost:8000/> — français (par défaut)
- <http://localhost:8000/?lang=ar> — arabe (RTL)

La bascule **FR ⇄ عربية** et le thème clair/sombre fonctionnent aussi côté
client (JS), sans rechargement.

> ⚠️ L'ouverture directe du fichier `index.php` dans un navigateur n'exécute
> pas le PHP. Il faut passer par un serveur PHP (commande ci-dessus) ou tout
> hébergement PHP.

## Structure

```
web/
├── index.php              # page assemblée, rendu i18n côté serveur
├── includes/
│   ├── config.php         # config MULTI-PAYS (devise, langues, wallets, zones)
│   └── i18n.php           # chaînes FR/AR + helpers t() et attrs()
├── api/
│   └── subscribe.php      # POST liste d'attente -> storage/subscribers.csv
├── assets/
│   ├── css/style.css      # thème sable/port, bidirectionnel, 2 thèmes
│   └── js/app.js          # bascule langue (RTL), thème, envoi liste d'attente
└── storage/               # généré au runtime (ignoré par git)
```

## Principes portés par ce socle

- **Multi-pays par configuration** : le pays est une dimension dans
  `includes/config.php` (MR actif, SN déclaré/phase 2), jamais codé en dur.
- **Bidirectionnel natif** : `dir="rtl"` piloté par la langue, styles en
  propriétés logiques (`margin-inline`, `text-align:start`…).
- **Mobile-first / faible bande passante** : CSS et JS légers, sans dépendance
  externe, images vectorielles (SVG) inline.
- **Paiement à la livraison mis en avant** comme pilier de confiance.

## Statut

Page **pré-lancement** : présentation + liste d'attente uniquement. Le tunnel
d'achat, l'espace vendeur et les paiements relèvent du développement de la
plateforme (voir `docs/` à la racine du dépôt).
