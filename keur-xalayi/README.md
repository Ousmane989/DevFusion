# 🏫 Keur Xalayi — plateforme de gestion scolaire

Application web de gestion pour l'école maternelle et primaire **Keur Xalayi** (Sénégal) :
inscriptions, paiements, rappels WhatsApp, présences, notes et bulletins,
personnel, finances. L'interface est en français et s'utilise sur ordinateur
comme sur téléphone.

> Conception détaillée (base de données, arborescence des pages, règles de
> calcul, droits par rôle) : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Fonctionnalités

| Module | Contenu |
|---|---|
| **Connexion & rôles** | Identifiant + mot de passe (bcrypt), sessions sécurisées, 3 rôles : Directeur, Secrétaire/Comptable, Enseignant (sa classe uniquement) |
| **Classes** | PS → CM2, plusieurs groupes par niveau (CE1 A, CE1 B), titulaire, effectifs garçons/filles, tarifs propres |
| **Élèves** | Fiche complète avec photo, matricule automatique (`KX26-0001`), WhatsApp +221 obligatoire (+222 accepté), recherche, filtres, archivage, réinscription |
| **Paiements** | Mensualités (un ou plusieurs mois à la fois), frais d'inscription, modes sénégalais (espèces, Wave, Orange Money, Mixx by Yas / Free Money, virement, chèque ; Bankily, Masrvi et Sedad si le pays est réglé sur la Mauritanie), statut Payé/Partiel/Impayé, réductions avec motif, reçu PDF avec logo et montant en lettres, envoi du reçu par WhatsApp, annulation tracée |
| **Impayés** | Par mois et par classe, regroupés par élève, rappel en un clic, export |
| **Rappels WhatsApp** | Automatiques (jour configurable, ex. le 25), uniquement aux impayés ou à tous, second rappel après la date limite, modèles personnalisables, historique, aucun doublon |
| **Communication** | Annonces à toute l'école / une classe / un parent (un message par famille), avis d'absence, envoi des résultats et du bulletin |
| **Présences** | Appel sur téléphone (P / A / R), statistiques d'assiduité par élève et par classe |
| **Notes & bulletins** | Saisie par matière et par trimestre, coefficients, moyennes, classement (ex æquo), bilan annuel, bulletins PDF ; maternelle : appréciations par compétence (Acquis / En cours / Non acquis) |
| **Personnel** | Enseignants et employés, salaires versés par mois |
| **Finances** | Dépenses par catégorie, bilan mensuel recettes / dépenses / solde, graphiques |
| **Tableau de bord** | Effectifs, répartition par classe et par sexe, encaissé / attendu, taux de recouvrement, impayés, absences du jour, derniers paiements et inscriptions |
| **Autres** | Emploi du temps, calendrier scolaire, exports Excel et PDF de toutes les listes, liste de classe, cartes d'élève avec photo et QR code, année scolaire et passage automatique en classe supérieure, sauvegarde automatique quotidienne, paramètres (nom, logo, adresse, téléphone, devise FCFA (ou MRU), tarifs) |

## Installation (5 minutes)

Prérequis : **Node.js 18+** et une base **PostgreSQL** (locale ou Supabase).

```bash
cd keur-xalayi
npm install
cp .env.example .env          # puis renseignez DATABASE_URL et JWT_SECRET
npm run db:init               # crée les tables, les niveaux, l'année scolaire et le compte directeur
npm start                     # http://localhost:3000
```

Connexion initiale : identifiant **`directeur`**, mot de passe défini par
`ADMIN_MOT_DE_PASSE` dans `.env` (par défaut `KeurXalayi2026` — **à changer dès
la première connexion** via « Changer mon mot de passe »).

Pour essayer avec des données fictives d'une école de Dakar (environ 60 élèves, paiements en FCFA, notes, présences) :

```bash
npm run db:demo               # comptes de test : secretaire / enseignant — mot de passe demo1234
```

### Avec Supabase
1. Créez un projet sur [supabase.com](https://supabase.com).
2. *Project Settings → Database → Connection string (URI)* : copiez-la dans `DATABASE_URL`.
3. Mettez `DATABASE_SSL=true`, puis `npm run db:init`.

### Mise en ligne
Le dossier contient un `Dockerfile`. Sur Render, Railway ou un VPS :
commande de démarrage `npm start`, variables du fichier `.env.example`.
Définissez `PUBLIC_URL` (adresse publique du site) pour que les liens de reçus
et de bulletins envoyés aux parents soient corrects. Montez un disque
persistant sur `sauvegardes/` (ou `DOSSIER_SAUVEGARDES`) pour conserver les
sauvegardes.

## Premiers réglages (dans l'application)

1. **Paramètres → École** : logo, adresse, téléphone, devise (FCFA par défaut) et pays (Sénégal +221 par défaut).
2. **Paramètres → Tarifs** : frais d'inscription et mensualité de chaque niveau.
3. **Personnel** : ajoutez les enseignants ; **Classes** : désignez les titulaires et créez les groupes (CE1 B…).
4. **Utilisateurs** : créez les comptes de la secrétaire et des enseignants (un enseignant est lié à sa fiche du personnel).
5. **Rappels WhatsApp** : jour du rappel, date limite, second rappel, texte des messages.
6. **Année scolaire** : vérifiez les dates (octobre → juillet par défaut).

## WhatsApp

Trois modes, choisis par `WHATSAPP_MODE` dans `.env` :

| Mode | Fonctionnement | À configurer |
|---|---|---|
| `manuel` (par défaut) | L'application prépare chaque message ; un bouton **Envoyer** ouvre WhatsApp avec le texte déjà écrit (`wa.me`). Les rappels automatiques sont préparés à la date prévue et signalés sur le tableau de bord. | Rien |
| `meta` | Envoi automatique par **WhatsApp Business Cloud API**. | `META_WA_TOKEN`, `META_WA_PHONE_NUMBER_ID` ; `META_WA_TEMPLATE` pour écrire hors de la fenêtre de 24 h (modèle approuvé avec un paramètre `{{1}}` qui reçoit le texte) |
| `twilio` | Envoi automatique par **Twilio**. | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` |

Les secrets restent dans `.env`, jamais dans le navigateur. Le bouton
« Envoyer un message de test » (Paramètres → Messages) vérifie la connexion.
En cas d'échec d'envoi par l'API, le message reste disponible en envoi manuel.

## Tâches planifiées

Avec `CRON_INTERNE=true` (par défaut), le serveur exécute lui-même :
- **chaque heure** : les rappels de paiement dus (à partir de l'heure réglée) ;
- **chaque nuit à 2 h** : une sauvegarde complète (JSON compressé, 30 conservées).

Sur un hébergement qui met le serveur en veille, utilisez un cron externe
(cron-job.org, Render Cron Job…) une fois par jour :

```bash
curl -X POST https://votre-ecole.exemple/api/cron/quotidien -H "x-cron-secret: $CRON_SECRET"
```

Chaque rappel n'est envoyé qu'une fois par mois (table `rappels_executions`),
même si la tâche est lancée plusieurs fois ; un rattrapage de 5 jours couvre
une panne du serveur.

## Tests

```bash
npm test     # nécessite une base initialisée avec npm run db:demo
```

Les tests couvrent la connexion, les droits par rôle, l'inscription, les
paiements répartis sur plusieurs mois, les reçus, les rappels (sans doublon),
l'appel, les notes et classements, les bulletins, les exports et le passage
en classe supérieure.

## Organisation du code

```
keur-xalayi/
├── server.js                 démarrage (migrations, tâches, serveur)
├── db/schema.sql             schéma PostgreSQL (idempotent)
├── scripts/init-db.js        initialisation (+ données de démonstration)
├── src/
│   ├── app.js                application Express et routes
│   ├── auth.js               sessions et contrôle des rôles
│   ├── db.js, config.js, utils.js
│   ├── routes/               une route par module (eleves, paiements, whatsapp…)
│   └── services/             calculs financiers, notes, PDF, Excel, WhatsApp,
│                             rappels, sauvegardes, planificateur
├── public/
│   ├── index.html            connexion
│   ├── app.html              coquille de l'application
│   ├── css/app.css           styles (couleurs, composants, mobile, impression)
│   └── js/                   ui.js (outils), app.js (menu, routeur), pages/*.js
└── test/api.test.js
```

Pour ajouter une page : créer `public/js/pages/ma-page.js` exportant
`afficher(el, params)`, puis l'ajouter à `MENU` et `ROUTES` dans `public/js/app.js`.
