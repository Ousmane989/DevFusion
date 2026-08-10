# Karat — plateforme SaaS de boutiques en ligne

Karat permet aux commerçants de **Mauritanie** et du **Sénégal** de créer une
boutique en ligne premium, d'ajouter leurs produits et d'encaisser via les
paiements mobiles locaux. Le revenu provient d'un **abonnement mensuel**.
Positionnement : **premium** (le nom vient du carat, la mesure de pureté de l'or).

Identité visuelle : noir profond `#0D0D0D`, doré `#D4AF37 → #F5D77E`, texte
blanc cassé, typographie à empattements pour les titres (Cormorant Garamond) et
sans-serif lisible pour le texte (Jost).

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
- Limitation du débit (rate limiting) sur les routes sensibles.

> Note : les statistiques du tableau de bord sont générées de façon
> déterministe (démo). Branchez-les sur vos vraies données de ventes en
> production.
