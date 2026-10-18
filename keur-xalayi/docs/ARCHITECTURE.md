# Keur Xalayi — conception de la plateforme

Ce document présente la **structure de la base de données** et
l'**arborescence des pages** de la plateforme de gestion scolaire.
Le SQL complet se trouve dans [`db/schema.sql`](../db/schema.sql).

## 1. Choix techniques

| Élément | Choix | Pourquoi |
|---|---|---|
| Serveur | Node.js 18+ / Express | Simple, léger, un seul langage (JavaScript) partout |
| Base de données | PostgreSQL (local ou **Supabase**) | Relationnelle, gratuite, hébergée facilement |
| Interface | HTML + CSS + JavaScript (modules natifs) | Aucune compilation : on modifie un fichier, on recharge |
| PDF | `pdfkit` côté serveur | Reçus, bulletins, cartes, listes imprimables |
| Excel | `exceljs` | Export de toutes les listes |
| QR code | `qrcode` | Cartes d'élève |
| Tâches planifiées | `node-cron` (+ route `/api/cron/*` pour un cron externe) | Rappels WhatsApp, sauvegardes |
| WhatsApp | Meta Cloud API, Twilio, ou mode **manuel** (liens `wa.me`) | Fonctionne même sans compte API |
| Sécurité | Mots de passe `bcrypt`, session JWT en cookie `httpOnly`, limitation des tentatives de connexion, contrôle des rôles sur chaque route | |

## 2. Modèle de données

```
annees_scolaires ─┬─< classes >── niveaux (PS…CM2, tarifs par défaut)
                  │      │  └── personnel (enseignant titulaire)
                  │      └─< emploi_du_temps
                  └─< inscriptions >── eleves
                         ├─< paiements          (mensualités, inscription)
                         ├─< presences
                         ├─< notes >── matieres          (primaire)
                         ├─< appreciations >── competences (maternelle)
                         └─< observations

personnel ─< salaires        depenses        evenements (calendrier)
utilisateurs ── personnel (pour les enseignants)
messages (historique WhatsApp)   rappels_executions   sauvegardes
parametres (1 seule ligne : nom, logo, devise, modèles de messages…)
```

### Idée clé : la table `inscriptions`
Un **élève** (identité, parents, photo, matricule) est permanent. Chaque
année scolaire, il a **une inscription** qui le place dans une classe avec
ses montants (frais d'inscription, mensualité, réduction + motif).
Ainsi :
- la **réinscription** crée simplement une nouvelle ligne pour la nouvelle année ;
- le **passage en classe supérieure** choisit automatiquement la classe du
  niveau suivant (`niveaux.ordre + 1`) ;
- tout l'historique (paiements, notes, présences des années passées) est conservé.

### Tables

| Table | Rôle | Champs principaux |
|---|---|---|
| `parametres` | Réglages de l'école | nom, logo, adresse, téléphone, devise (FCFA par défaut, ou MRU), pays / indicatif (+221 par défaut), jour du rappel (25), date limite, délai du 2ᵉ rappel, modèles de messages, nombre de périodes |
| `annees_scolaires` | Année d'octobre à juillet (dates libres) | libellé, date_debut, date_fin, active |
| `niveaux` | PS, MS, GS, CP, CE1, CE2, CM1, CM2 | code, ordre, cycle (maternelle/primaire), tarifs par défaut |
| `classes` | Groupes d'un niveau (CE1 A, CE1 B) | année, niveau, groupe, enseignant titulaire, tarifs propres (facultatifs) |
| `eleves` | Fiche élève | matricule auto, nom, prénom, sexe, naissance, photo, père/mère/tuteur, WhatsApp (+221, ou +222), 2ᵉ téléphone, adresse, remarques, statut (actif/archivé) |
| `inscriptions` | Élève × année × classe | frais d'inscription, mensualité, réduction, motif, décision de fin d'année |
| `paiements` | Encaissements | type, mois, montant, date, mode (espèces, Wave, Orange Money, Mixx by Yas / Free Money, virement, chèque ; Bankily, Masrvi, Sedad pour la Mauritanie), n° de reçu |
| `messages` | Historique WhatsApp | type, destinataire, téléphone, contenu, canal, statut, erreur |
| `rappels_executions` | Empêche d'envoyer deux fois le même rappel | mois, type |
| `presences` | Appel quotidien | inscription, date, présent/absent/retard, parent notifié |
| `matieres` / `notes` | Notes du primaire | coefficient, barème (/10 ou /20), niveaux concernés ; note par période |
| `competences` / `appreciations` | Maternelle | domaine, compétence ; Acquis / En cours / Non acquis |
| `observations` | Appréciation générale du bulletin | |
| `personnel` / `salaires` | Employés et salaires versés | poste, téléphone, salaire de base ; mois, montant |
| `depenses` | Dépenses de l'école | catégorie, libellé, montant |
| `emploi_du_temps` | Créneaux par classe | jour, heures, matière |
| `evenements` | Calendrier scolaire | vacances, examens, fêtes, réunions |
| `sauvegardes` | Journal des sauvegardes automatiques | |

### Règles de calcul
- **Montant dû d'un mois** = mensualité − réduction de l'inscription.
- **Statut d'un mois** : `Payé` si total versé ≥ dû, `Partiel` si 0 < versé < dû,
  `Impayé` sinon. Seuls les mois écoulés depuis l'inscription sont exigibles.
- **Taux de recouvrement du mois** = encaissé pour ce mois ÷ attendu pour ce mois.
- **Moyenne** = Σ (note ramenée sur 10 × coefficient) ÷ Σ coefficients ;
  **rang** calculé dans la classe (ex æquo gérés).
- **Matricule** : `KX` + 2 chiffres de l'année d'inscription + numéro, ex. `KX26-0007`.
- **Reçu** : `R` + année/mois + numéro, ex. `R2610-00042`.

## 3. Rôles et droits

| Module | Directeur | Secrétaire / Comptable | Enseignant |
|---|:-:|:-:|:-:|
| Tableau de bord | ✅ complet | ✅ (sans finances globales) | ✅ sa classe |
| Élèves (inscription, fiche) | ✅ | ✅ | 👁 sa classe |
| Classes | ✅ | 👁 | 👁 sa classe |
| Paiements, impayés, reçus | ✅ | ✅ | ❌ |
| Rappels et messages WhatsApp | ✅ | ✅ | ❌ |
| Présences | ✅ | 👁 | ✅ sa classe |
| Notes et bulletins | ✅ | 👁 bulletins | ✅ sa classe |
| Personnel et salaires | ✅ | ❌ | ❌ |
| Finances (dépenses, bilan) | ✅ | ✅ dépenses | ❌ |
| Emploi du temps, calendrier | ✅ | ✅ | 👁 |
| Année scolaire (réinscription, passage) | ✅ | ❌ | ❌ |
| Paramètres, utilisateurs, sauvegardes | ✅ | ❌ | ❌ |

## 4. Arborescence des pages

```
/                         Page de connexion
/app                      Application (menu latéral sur ordinateur, menu en bas sur téléphone)
 ├─ #/                    Tableau de bord
 ├─ #/eleves              Liste des élèves (recherche, filtre classe, actifs/archivés, export)
 │   ├─ #/eleves/nouveau  Formulaire d'inscription
 │   ├─ #/eleves/:id      Fiche élève : infos · paiements · présences · notes · carte
 │   └─ #/eleves/:id/modifier
 ├─ #/classes             Classes de l'année (effectif, titulaire, tarifs) + création de groupes
 │   └─ #/classes/:id     Liste de classe, emploi du temps, impressions
 ├─ #/paiements           Encaisser un paiement + journal des paiements + reçus
 ├─ #/impayes             Impayés par classe et par mois (+ rappel en un clic)
 ├─ #/rappels             Rappels automatiques : réglages, aperçu, envoi manuel
 ├─ #/messages            Annonces (école / classe / parent) + historique des envois
 ├─ #/presences           Faire l'appel (pensé pour le téléphone)
 │   └─ #/presences/stats Statistiques d'assiduité
 ├─ #/notes               Saisie des notes (primaire) ou appréciations (maternelle)
 ├─ #/bulletins           Moyennes, classement, bulletins PDF, envoi aux parents
 ├─ #/personnel           Personnel + salaires versés
 ├─ #/finances            Dépenses, bilan mensuel, graphiques
 ├─ #/emploi-du-temps     Emploi du temps par classe
 ├─ #/calendrier          Calendrier scolaire
 ├─ #/annee               Années scolaires, réinscriptions, passage en classe supérieure
 ├─ #/utilisateurs        Comptes et rôles
 └─ #/parametres          École, logo, devise, tarifs, WhatsApp, sauvegardes
```

## 5. API (extrait)

Toutes les routes sont préfixées par `/api` et renvoient du JSON (sauf PDF/Excel).

| Méthode | Route | Description |
|---|---|---|
| POST | `/auth/connexion`, `/auth/deconnexion` · GET `/auth/moi` | Session |
| GET/PUT | `/parametres` | Réglages de l'école |
| GET/POST/PUT | `/annees`, `/niveaux`, `/classes` | Structure de l'école |
| GET/POST/PUT | `/eleves`, `/eleves/:id`, `POST /eleves/:id/archiver` | Élèves |
| GET/POST | `/paiements`, `/paiements/statut`, `/paiements/impayes`, `GET /paiements/:id/recu.pdf` | Paiements |
| POST | `/whatsapp/rappels/apercu`, `/whatsapp/rappels/envoyer`, `/whatsapp/annonce` | Messages |
| GET/POST | `/presences`, `/presences/stats` | Présences |
| GET/POST | `/notes`, `/notes/resultats`, `/notes/bulletin.pdf` | Notes |
| … | `/personnel`, `/salaires`, `/depenses`, `/finances/bilan`, `/emploi`, `/evenements` | |
| GET | `/exports/:liste.xlsx` · `/exports/:liste.pdf` | Exports |
| POST | `/cron/quotidien` (en-tête `x-cron-secret`) | Lancement externe des tâches |

## 6. Tâches planifiées

Chaque jour (heure configurable, 9 h par défaut) :
1. Si on est le **jour du rappel** (ex. le 25) → rappel de la mensualité du mois
   aux parents (tous, ou seulement ceux qui n'ont pas payé).
2. Si on est **N jours après la date limite** → second rappel aux impayés.
3. Les exécutions sont notées dans `rappels_executions` : pas de doublon même
   si le serveur redémarre.

Chaque nuit (2 h) : **sauvegarde** complète des données en JSON compressé dans
`sauvegardes/` (30 dernières conservées), téléchargeable depuis les paramètres.
