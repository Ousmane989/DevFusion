# Karat — plateforme SaaS de boutiques en ligne

> Ce dépôt contient aussi **Keur Xalayi**, une plateforme de gestion scolaire
> indépendante : voir [`keur-xalayi/README.md`](keur-xalayi/README.md).

Karat permet aux commerçants de **Mauritanie** et du **Sénégal** de créer une
boutique en ligne premium, d'ajouter leurs produits et d'encaisser via les
paiements mobiles locaux. Le revenu provient d'un **abonnement mensuel**.
Positionnement : **premium** (le nom vient du carat, la mesure de pureté de l'or).

Identité visuelle : noir profond `#0D0D0D`, doré `#D4AF37 → #F5D77E`, texte
blanc cassé, typographie à empattements pour les titres (Cormorant Garamond) et
sans-serif lisible pour le texte (Jost).

---

## 🚀 Mettre en ligne (Render)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Ousmane989/DevFusion)

1. Cliquez sur le bouton ci-dessus (connectez-vous à Render avec GitHub).
2. Render lit `render.yaml`, crée le service, génère `JWT_SECRET` et monte un
   disque persistant pour la base SQLite.
3. Cliquez **Apply** → la boutique est en ligne en quelques minutes sur une URL
   `https://karat-xxxx.onrender.com` (les liens du catalogue Meta et les balises
   Open Graph s'y adaptent automatiquement).

> ⚠ **Persistance des données** : la conservation des comptes et commandes
> nécessite un disque persistant, donc un plan payant (**Starter, ~7 $/mois**,
> déjà configuré dans `render.yaml`). Le plan gratuit de Render n'a pas de
> disque : la base serait réinitialisée à chaque redémarrage.

Options : branchez un **domaine** (Settings → Custom Domain, puis `BASE_DOMAIN`)
et des **e-mails réels** (variables `SMTP_*`). Détails dans `render.yaml`.

---

## ✨ Ce qui est inclus

**Page d'accueil publique** (`/`)
- En-tête avec navigation, « Se connecter » et « Créer ma boutique »
- Héro + bouton « Essai gratuit de 3 jours »
- Comment ça marche (4 étapes)
- 6 fonctionnalités
- Section chiffres avec **compteurs animés**
- Galerie de **6 modèles** de boutiques avec aperçu en modale
- 3 formules tarifaires (MRU + FCFA), celle du milieu mise en avant
- Témoignages + FAQ (6 questions)
- Pied de page (liens, contact, réseaux sociaux, mentions légales)

**Authentification**
- **Inscription** : nom, e-mail, téléphone, nom de la boutique, mot de passe,
  choix du tarif → envoi d'un **code de vérification par e-mail**
- **Vérification** du code avant l'accès au compte
- Après vérification : **essai de 3 jours**, puis **verrouillage** du compte
  jusqu'au **paiement** de la formule choisie
- **Connexion** e-mail + mot de passe, avec **mot de passe oublié**
- Un compte existant et à jour arrive directement sur son **tableau de bord**

**Animations** : apparition fondu + glissement au scroll, brillance dorée qui
traverse les boutons au survol, agrandissement + ombre dorée des cartes,
compteurs animés, transitions de pages et de modales. Toutes les animations
sont **désactivées si `prefers-reduced-motion`** est actif.

---

## 🚚 Karat Livreur — agence de livraison (Mauritanie)

Agence de livraison **dédiée aux e-commerçants** (boutiques Instagram, Facebook,
TikTok, sites web), intégrée à l'application et accessible sur **`/livreur`**.
Le site public sert à recruter des partenaires (pas d'offre pour les
particuliers). Les livreurs sont créés par l'agence.

**Tarif unique** : 150 MRU par produit livré, quelle que soit la zone
(`fee_per_item` dans `public/livreur/defaults.json`, ou variable
`LIVREUR_FEE_PER_ITEM`). Chaque commande indique son nombre de produits ;
frais = nombre de produits × tarif. L'agence peut ajuster les frais d'une
commande.

**Deux espaces séparés**, chacun avec sa propre connexion :
- **Espace partenaire** — connexion `/livreur/connexion` (e-commerçants) ;
- **Espace agence** — connexion `/livreur/agence/connexion` (agents de
  l'agence et livreurs).
Une connexion refuse les comptes de l'autre espace.

**Premier compte agence** : tant qu'aucun compte agence n'existe, la page
`/livreur/agence/connexion` propose de le créer (une seule fois). Ensuite,
l'agence ajoute ses agents (Équipe) et ses livreurs (Livreurs). Karat Livreur
est indépendant des comptes du site Karat.
Données séparées des boutiques (tables `lv_*`, créées automatiquement en SQLite
comme en PostgreSQL) et session dédiée.

**Pages publiques**
| URL | Contenu |
|-----|---------|
| `/livreur` | Accueil pour les e-commerçants : héro + suivi de colis, services (stockage, confirmation, livraison, encaissement), fonctionnement, couverture (carte de la Mauritanie, délais), avantages, types de partenaires, espace partenaire, FAQ, contact, bouton WhatsApp |
| `/livreur/suivi` | Suivi d'un colis par code `KL-XXXXXX` (étapes + historique) |
| `/livreur/inscription` | Inscription partenaire (validée par l'agence) |
| `/livreur/connexion` | Connexion de l'espace partenaire |
| `/livreur/agence/connexion` | Connexion de l'espace agence (agents et livreurs) |

**Espaces**
- **Partenaire** (`/livreur/partenaire`) : tableau de bord, nouvelle commande (avec
  article du stock), commandes + suivi + annulation, stock déposé, reversements,
  relevé CSV, profil (moyen de reversement : Bankily, Masrvi, Sedad…).
- **Livreur** (`/livreur/coursier`, pensé mobile, comptes créés par l'agence) : tournée du jour, appel /
  WhatsApp / itinéraire, statuts (récupéré → en route → livré / échec / reporté),
  preuve de remise (nom du réceptionnaire), caisse à remettre.
- **Agence** (`/livreur/agence`) : tableau de bord, centre d'appel (confirmer,
  reporter, annuler), dispatch par zone, toutes les commandes (édition complète,
  historique, export CSV), livreurs, partenaires, équipe, stock, caisse des
  livreurs, reversements, zones desservies & délais, messages du formulaire de
  contact.

**Circuit de l'argent** : le livreur encaisse (prix articles + frais si payés par
le client) → l'agence « reçoit la caisse » → le montant net devient reversable
au partenaire (frais déduits s'il les paie) → « Reverser » l'enregistre.

**Design** : thème clair aux couleurs du drapeau mauritanien (vert, jaune or,
rouge), carte SVG de la Mauritanie (agence à Nouakchott, itinéraires et délais
par ville), plan OpenStreetMap de l'agence, carte d'itinéraire sur la page de suivi.

**Configuration** (voir `.env.example`) : `LIVREUR_PHONE`, `LIVREUR_WHATSAPP`,
`LIVREUR_EMAIL`, `LIVREUR_ADDRESS`, la position du plan `LIVREUR_LAT` /
`LIVREUR_LNG` et le compte agence initial
`LIVREUR_ADMIN_PHONE` / `LIVREUR_ADMIN_PASSWORD`.

**Démo (hors production uniquement)** — mot de passe `demo1234` :
agence `22200000001`, partenaire `22200000002`, livreur `22200000003`.

---

## 🗂 Structure du projet

```
DevFusion/
├── package.json            # dépendances et scripts
├── .env.example            # variables d'environnement (à copier en .env)
├── server.js               # serveur Express : API + service des pages
├── src/
│   ├── db.js               # base SQLite (better-sqlite3) + schéma
│   ├── auth.js             # mots de passe, codes, jetons de session (JWT)
│   ├── account.js          # formules, cycle de vie du compte, statut
│   ├── mailer.js           # envoi des e-mails (fallback console en dev)
│   ├── middleware.js       # chargement utilisateur + garde d'authentification
│   └── routes/
│       ├── auth.routes.js       # inscription, vérification, connexion, reset
│       ├── billing.routes.js    # paiement (déverrouillage) + statut
│       └── dashboard.routes.js  # données du tableau de bord
├── public/                 # front-end statique
│   ├── index.html               # page d'accueil
│   ├── inscription.html         # création de compte
│   ├── verification.html        # saisie du code e-mail
│   ├── connexion.html           # connexion
│   ├── mot-de-passe-oublie.html # demande de réinitialisation
│   ├── reinitialiser.html       # nouveau mot de passe
│   ├── paiement.html            # activation / déverrouillage de l'abonnement
│   ├── tableau-de-bord.html     # tableau de bord (protégé)
│   ├── 404.html
│   ├── css/styles.css           # design system complet
│   └── js/
│       ├── main.js              # interactions de la page d'accueil
│       └── api.js               # utilitaires client partagés
└── data/                   # base SQLite (créée automatiquement, non versionnée)
```

---

## 🚀 Installation et lancement

Prérequis : **Node.js ≥ 18**.

```bash
# 1. Installer les dépendances
npm install

# 2. Créer le fichier d'environnement
cp .env.example .env
#    (adaptez JWT_SECRET ; laissez SMTP_HOST vide pour le mode démo)

# 3. Démarrer le serveur
npm start
#    ou, en développement avec rechargement : npm run dev
```

Puis ouvrez : **http://localhost:3000**

### Mode démo (sans serveur e-mail)

Si `SMTP_HOST` est vide dans `.env`, aucun e-mail réel n'est envoyé :
- le code de vérification s'affiche **dans la console du serveur** ;
- il est aussi pré-rempli sur les pages de vérification / réinitialisation
  pour faciliter les tests.

### Mode production (e-mails réels)

Renseignez les variables `SMTP_*` dans `.env` (par exemple un fournisseur
comme Brevo, Mailgun, Gmail SMTP…). Les codes seront alors envoyés par e-mail.

---

## 🚀 Déploiement en production

Karat est une application Node + SQLite. Le plus simple est un hébergeur qui
supporte un serveur Node persistant avec un disque (Render, Railway, Fly.io) —
**pas** un hébergeur 100 % serverless comme Vercel, car SQLite a besoin d'un
disque persistant.

### Option A — Render (recommandé, fichier `render.yaml` fourni)

1. Poussez ce dépôt sur GitHub.
2. Sur [render.com](https://render.com) : **New + → Blueprint**, sélectionnez ce dépôt.
3. Render lit `render.yaml`, crée le service, génère `JWT_SECRET` et monte un
   disque persistant pour la base (`/data`). Cliquez sur **Apply**.
4. (Optionnel) Renseignez les variables `SMTP_*` pour l'envoi réel des e-mails.

### Option B — Docker (n'importe quel hébergeur)

```bash
docker build -t karat .
docker run -p 3000:3000 -e JWT_SECRET=une-chaine-longue -v karat_data:/app/data karat
```

> Pensez à définir un `JWT_SECRET` fort et les variables `SMTP_*` en production.

---

## 💳 Formules & paiements

| Formule    | Prix mensuel        |
|------------|---------------------|
| Découverte | 500 MRU / 3 000 FCFA  |
| **Pro** (mise en avant) | **1 500 MRU / 9 000 FCFA** |
| Business   | 3 500 MRU / 21 000 FCFA |

Chaque formule démarre par un **essai gratuit de 3 jours**.

Moyens de paiement prévus dans l'interface : **Bankily** (Mauritanie),
**Wave** et **Orange Money** (Sénégal). L'endpoint `POST /api/billing/pay`
**simule** le paiement (il active l'abonnement pour 30 jours). En production,
il faudrait le relier à l'API du prestataire et confirmer via un *webhook*.

---

## 🔌 Aperçu de l'API

| Méthode | Route                     | Rôle                                        |
|---------|---------------------------|---------------------------------------------|
| POST    | `/api/auth/signup`        | Créer un compte + envoyer le code           |
| POST    | `/api/auth/verify-email`  | Vérifier le code → active l'essai + session |
| POST    | `/api/auth/resend-code`   | Renvoyer un code de vérification            |
| POST    | `/api/auth/login`         | Connexion                                   |
| POST    | `/api/auth/logout`        | Déconnexion                                 |
| GET     | `/api/auth/me`            | Utilisateur courant                         |
| POST    | `/api/auth/forgot`        | Demander un code de réinitialisation        |
| POST    | `/api/auth/reset`         | Définir un nouveau mot de passe             |
| GET     | `/api/billing/status`     | Statut du compte / jours d'essai restants   |
| POST    | `/api/billing/pay`        | Activer l'abonnement (déverrouille)         |
| GET     | `/api/dashboard`          | Données du tableau de bord                  |
| GET/POST/PUT/DELETE | `/api/products`     | CRUD des produits                     |
| GET/PUT | `/api/store`, `/api/store/shipping` | Boutique (thème, contenu, livraison) |
| GET/PUT | `/api/orders`, `/api/orders/:id/status` | Commandes + statuts       |
| GET/POST | `/api/public/store/:slug`(+`/order`,`/visit`,`/event`) | Vitrine publique |
| GET     | `/api/health`, `/api` | Santé + index des routes (health check)         |

### Cycle de vie d'un compte

`pending` (inscrit, e-mail non vérifié) → `trial` (essai 3 jours après
vérification) → `locked` (essai expiré, paiement requis) → `active` (abonné).
Un abonnement expiré repasse en `locked`.

---

## 🔒 Sécurité

- Mots de passe hachés avec **bcrypt**.
- Codes de vérification **hachés** (SHA-256), à expiration (15 min) et à
  nombre de tentatives limité.
- Session par **JWT** dans un cookie `httpOnly` (`secure` en production).
- Limitation du débit (rate limiting) sur l'authentification **et** les routes
  publiques (commandes, événements de la vitrine).
- En-têtes de sécurité (`X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`, `HSTS` en production).
- `trust proxy` activé en production (cookies `secure` + IP correctes derrière
  un proxy), corps JSON limité, **CORS** sur l'API publique, gestion d'erreurs
  JSON, endpoint **health check** (`/api/health`) et arrêt propre (SIGTERM).
- En production, le serveur **refuse de démarrer** si `JWT_SECRET` n'est pas
  défini (valeur par défaut interdite).

> Note : les statistiques du tableau de bord sont générées de façon
> déterministe (démo). Branchez-les sur vos vraies données de ventes en
> production.
