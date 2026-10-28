-- =====================================================================
--  Keur Xaleyi — schéma de la base de données (PostgreSQL / Supabase)
--  Le script est idempotent : il peut être relancé sans perte de données.
--  Montants : NUMERIC(12,2) dans la devise choisie (FCFA au Sénégal, MRU en Mauritanie).
-- =====================================================================

-- Le script entier s'exécute en une transaction ; ce verrou fait passer les
-- démarrages simultanés (plusieurs instances serverless) l'un après l'autre,
-- au lieu de se bloquer mutuellement (deadlock).
SELECT pg_advisory_xact_lock(4242);

-- ---------- Paramètres de l'école (une seule ligne, id = 1) ----------
CREATE TABLE IF NOT EXISTS parametres (
  id                      INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nom_ecole               TEXT    NOT NULL DEFAULT 'Keur Xaleyi',
  slogan                  TEXT             DEFAULT 'École maternelle et primaire',
  logo                    TEXT,                       -- image en data URL
  adresse                 TEXT,
  telephone               TEXT,
  email                   TEXT,
  devise                  TEXT    NOT NULL DEFAULT 'FCFA' CHECK (devise IN ('MRU','FCFA')),
  indicatif_defaut        TEXT    NOT NULL DEFAULT '+221' CHECK (indicatif_defaut ~ '^\+[1-9][0-9]{0,3}$'), -- indicatif de n'importe quel pays
  -- Rappels WhatsApp
  rappel_auto             BOOLEAN NOT NULL DEFAULT TRUE,
  rappel_jour             INTEGER NOT NULL DEFAULT 25 CHECK (rappel_jour BETWEEN 1 AND 28),
  rappel_heure            INTEGER NOT NULL DEFAULT 9  CHECK (rappel_heure BETWEEN 0 AND 23),
  rappel_impayes_seulement BOOLEAN NOT NULL DEFAULT TRUE,
  date_limite_jour        INTEGER NOT NULL DEFAULT 5  CHECK (date_limite_jour BETWEEN 1 AND 28), -- à payer avant ce jour du mois concerné
  second_rappel_actif     BOOLEAN NOT NULL DEFAULT TRUE,
  second_rappel_delai     INTEGER NOT NULL DEFAULT 3  CHECK (second_rappel_delai BETWEEN 1 AND 20), -- jours après la date limite
  modele_rappel           TEXT    NOT NULL DEFAULT 'Bonjour {nom_parent}, l''école {ecole} vous rappelle que la mensualité de {mois} pour {nom_eleve} ({classe}) d''un montant de {montant} est à régler avant le {date_limite}. Merci de votre confiance.',
  modele_second_rappel    TEXT    NOT NULL DEFAULT 'Bonjour {nom_parent}, sauf erreur de notre part, la mensualité de {mois} pour {nom_eleve} ({classe}) reste à régler (reste dû : {montant}). La date limite était le {date_limite}. Merci de passer au secrétariat. École {ecole}.',
  modele_absence          TEXT    NOT NULL DEFAULT 'Bonjour {nom_parent}, nous vous informons que {nom_eleve} ({classe}) a été noté(e) {statut} aujourd''hui, {date}. Merci de nous contacter si besoin. École {ecole}.',
  modele_recu             TEXT    NOT NULL DEFAULT 'Bonjour {nom_parent}, nous confirmons la réception de {montant} pour {nom_eleve} ({classe}) — {objet}. Reçu n° {numero}. Merci ! École {ecole}.',
  modele_bulletin         TEXT    NOT NULL DEFAULT 'Bonjour {nom_parent}, voici les résultats de {nom_eleve} ({classe}) pour le {periode} : moyenne {moyenne}, rang {rang}/{effectif}. École {ecole}.',
  notif_absence_auto      BOOLEAN NOT NULL DEFAULT FALSE,
  nb_periodes             INTEGER NOT NULL DEFAULT 3 CHECK (nb_periodes BETWEEN 1 AND 6),
  libelle_periode         TEXT    NOT NULL DEFAULT 'Trimestre',
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO parametres (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ---------- Années scolaires (octobre → juillet par défaut) ----------
CREATE TABLE IF NOT EXISTS annees_scolaires (
  id          SERIAL PRIMARY KEY,
  libelle     TEXT    NOT NULL UNIQUE,                -- ex. « 2026-2027 »
  date_debut  DATE    NOT NULL,                       -- ex. 2026-10-01
  date_fin    DATE    NOT NULL,                       -- ex. 2027-07-31
  active      BOOLEAN NOT NULL DEFAULT FALSE,
  cloturee    BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (date_fin > date_debut)
);
-- Une seule année active à la fois.
CREATE UNIQUE INDEX IF NOT EXISTS annees_une_active ON annees_scolaires (active) WHERE active;

-- ---------- Niveaux prédéfinis (PS, MS, GS, CI, CP → CM2) et tarifs par défaut ----------
CREATE TABLE IF NOT EXISTS niveaux (
  id                SERIAL PRIMARY KEY,
  code              TEXT    NOT NULL UNIQUE,          -- PS, MS, GS, CI, CP, CE1…
  nom               TEXT    NOT NULL,
  ordre             INTEGER NOT NULL UNIQUE,          -- sert au passage en classe supérieure
  cycle             TEXT    NOT NULL CHECK (cycle IN ('maternelle','primaire')),
  frais_inscription NUMERIC(12,2) NOT NULL DEFAULT 0,
  mensualite        NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- ---------- Personnel (enseignants et employés) ----------
CREATE TABLE IF NOT EXISTS personnel (
  id            SERIAL PRIMARY KEY,
  nom           TEXT NOT NULL,
  prenom        TEXT NOT NULL,
  sexe          TEXT CHECK (sexe IN ('M','F')),
  telephone     TEXT,
  poste         TEXT NOT NULL DEFAULT 'Enseignant',    -- Enseignant, Gardien, Secrétaire…
  salaire_base  NUMERIC(12,2) NOT NULL DEFAULT 0,
  date_embauche DATE,
  actif         BOOLEAN NOT NULL DEFAULT TRUE,
  remarques     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Comptes utilisateurs ----------
CREATE TABLE IF NOT EXISTS utilisateurs (
  id                 SERIAL PRIMARY KEY,
  identifiant        TEXT NOT NULL UNIQUE,
  mot_de_passe       TEXT NOT NULL,                     -- hachage bcrypt
  nom_complet        TEXT NOT NULL,
  role               TEXT NOT NULL CHECK (role IN ('directeur','secretaire','enseignant')),
  personnel_id       INTEGER REFERENCES personnel(id) ON DELETE SET NULL, -- lien pour les enseignants
  actif              BOOLEAN NOT NULL DEFAULT TRUE,
  derniere_connexion TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Classes (groupes par niveau et par année) ----------
CREATE TABLE IF NOT EXISTS classes (
  id                SERIAL PRIMARY KEY,
  annee_id          INTEGER NOT NULL REFERENCES annees_scolaires(id) ON DELETE CASCADE,
  niveau_id         INTEGER NOT NULL REFERENCES niveaux(id),
  groupe            TEXT    NOT NULL DEFAULT '',        -- '', 'A', 'B'…
  nom               TEXT    NOT NULL,                    -- « CE1 A »
  enseignant_id     INTEGER REFERENCES personnel(id) ON DELETE SET NULL, -- titulaire
  salle             TEXT,
  frais_inscription NUMERIC(12,2),                       -- NULL = tarif du niveau
  mensualite        NUMERIC(12,2),                       -- NULL = tarif du niveau
  UNIQUE (annee_id, nom)
);

-- ---------- Élèves (identité permanente) ----------
CREATE TABLE IF NOT EXISTS eleves (
  id               SERIAL PRIMARY KEY,
  matricule        TEXT NOT NULL UNIQUE,                 -- généré : KX26-0001
  nom              TEXT NOT NULL,
  prenom           TEXT NOT NULL,
  sexe             TEXT NOT NULL CHECK (sexe IN ('M','F')),
  date_naissance   DATE,
  lieu_naissance   TEXT,
  photo            TEXT,                                 -- image en data URL (réduite côté navigateur)
  pere_nom         TEXT,
  mere_nom         TEXT,
  tuteur_nom       TEXT,
  whatsapp         TEXT NOT NULL CHECK (whatsapp ~ '^\+[1-9][0-9]{6,14}$'), -- format international, tous pays
  telephone2       TEXT,
  adresse          TEXT,
  remarques        TEXT,                                 -- allergies, infos importantes
  statut           TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif','archive')),
  date_sortie      DATE,
  motif_sortie     TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS eleves_nom_idx ON eleves (lower(nom), lower(prenom));

-- ---------- Inscriptions : un élève dans une classe pour une année ----------
-- Permet la réinscription et le passage en classe supérieure sans perdre
-- l'historique. Les montants sont copiés au moment de l'inscription
-- (modifiables), la réduction mensuelle s'applique à chaque mois.
CREATE TABLE IF NOT EXISTS inscriptions (
  id                SERIAL PRIMARY KEY,
  eleve_id          INTEGER NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
  annee_id          INTEGER NOT NULL REFERENCES annees_scolaires(id) ON DELETE CASCADE,
  classe_id         INTEGER NOT NULL REFERENCES classes(id),
  date_inscription  DATE    NOT NULL DEFAULT CURRENT_DATE,
  frais_inscription NUMERIC(12,2) NOT NULL DEFAULT 0,
  mensualite        NUMERIC(12,2) NOT NULL DEFAULT 0,
  reduction         NUMERIC(12,2) NOT NULL DEFAULT 0,    -- montant retiré de chaque mensualité
  reduction_motif   TEXT,                                -- fratrie, cas social…
  decision          TEXT NOT NULL DEFAULT 'en_cours'
                    CHECK (decision IN ('en_cours','admis','redouble','parti')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (eleve_id, annee_id),
  CHECK (reduction >= 0 AND reduction <= mensualite)
);
CREATE INDEX IF NOT EXISTS inscriptions_classe_idx ON inscriptions (classe_id);

-- ---------- Paiements (mensualités, frais d'inscription, autres) ----------
CREATE TABLE IF NOT EXISTS paiements (
  id              SERIAL PRIMARY KEY,
  inscription_id  INTEGER NOT NULL REFERENCES inscriptions(id) ON DELETE CASCADE,
  type            TEXT NOT NULL DEFAULT 'mensualite' CHECK (type IN ('mensualite','inscription','autre')),
  mois            DATE,                                  -- 1er jour du mois concerné (mensualité)
  montant         NUMERIC(12,2) NOT NULL CHECK (montant > 0),
  date_paiement   DATE NOT NULL DEFAULT CURRENT_DATE,
  mode            TEXT NOT NULL,                         -- voir MODES_PAIEMENT (src/utils.js)
  reference       TEXT,                                  -- n° de transaction mobile
  numero_recu     TEXT NOT NULL,                         -- R2610-00001 (un reçu peut couvrir plusieurs mois)
  remarque        TEXT,
  encaisse_par    INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
  annule          BOOLEAN NOT NULL DEFAULT FALSE,
  motif_annulation TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (type <> 'mensualite' OR mois IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS paiements_insc_mois_idx ON paiements (inscription_id, mois);
CREATE INDEX IF NOT EXISTS paiements_date_idx ON paiements (date_paiement);
CREATE INDEX IF NOT EXISTS paiements_recu_idx ON paiements (numero_recu);

-- ---------- Messages WhatsApp (historique de tous les envois) ----------
CREATE TABLE IF NOT EXISTS messages (
  id            SERIAL PRIMARY KEY,
  lot           TEXT,                                    -- regroupe un envoi groupé
  type          TEXT NOT NULL CHECK (type IN ('rappel','second_rappel','annonce','absence','bulletin','recu','test')),
  eleve_id      INTEGER REFERENCES eleves(id) ON DELETE SET NULL,
  destinataire  TEXT,                                    -- nom du parent
  telephone     TEXT NOT NULL,
  contenu       TEXT NOT NULL,
  canal         TEXT NOT NULL CHECK (canal IN ('meta','twilio','manuel')),
  statut        TEXT NOT NULL CHECK (statut IN ('envoye','echec','a_envoyer','ouvert')),
  erreur        TEXT,
  id_externe    TEXT,                                    -- identifiant renvoyé par l'API
  mois          DATE,                                    -- pour les rappels
  envoye_par    INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL, -- NULL = automatique
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_date_idx ON messages (created_at DESC);

-- Trace des rappels automatiques déjà exécutés (évite les doublons).
CREATE TABLE IF NOT EXISTS rappels_executions (
  mois        DATE NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('rappel','second_rappel')),
  execute_le  TIMESTAMPTZ NOT NULL DEFAULT now(),
  nb_messages INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (mois, type)
);
-- Envoi en plusieurs fois : « termine » passe à vrai quand tous les parents ont reçu
-- le rappel ; « verrou » empêche deux envois simultanés de la même tâche.
ALTER TABLE rappels_executions ADD COLUMN IF NOT EXISTS termine BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE rappels_executions ADD COLUMN IF NOT EXISTS verrou TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS messages_rappel_idx ON messages (type, mois, eleve_id);

-- ---------- Présences ----------
CREATE TABLE IF NOT EXISTS presences (
  id          SERIAL PRIMARY KEY,
  inscription_id INTEGER NOT NULL REFERENCES inscriptions(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  statut      TEXT NOT NULL CHECK (statut IN ('present','absent','retard')),
  remarque    TEXT,
  notifie     BOOLEAN NOT NULL DEFAULT FALSE,
  saisi_par   INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
  UNIQUE (inscription_id, date)
);
CREATE INDEX IF NOT EXISTS presences_date_idx ON presences (date);

-- ---------- Notes (primaire) ----------
CREATE TABLE IF NOT EXISTS matieres (
  id          SERIAL PRIMARY KEY,
  nom         TEXT NOT NULL,
  coefficient NUMERIC(4,2) NOT NULL DEFAULT 1 CHECK (coefficient > 0),
  bareme      INTEGER NOT NULL DEFAULT 10 CHECK (bareme IN (10,20)),
  niveaux     TEXT[] NOT NULL DEFAULT ARRAY['CI','CP','CE1','CE2','CM1','CM2'], -- codes des niveaux concernés
  ordre       INTEGER NOT NULL DEFAULT 0,
  UNIQUE (nom)
);

CREATE TABLE IF NOT EXISTS notes (
  id             SERIAL PRIMARY KEY,
  inscription_id INTEGER NOT NULL REFERENCES inscriptions(id) ON DELETE CASCADE,
  matiere_id     INTEGER NOT NULL REFERENCES matieres(id) ON DELETE CASCADE,
  periode        INTEGER NOT NULL CHECK (periode BETWEEN 1 AND 6),
  note           NUMERIC(5,2) CHECK (note >= 0),
  saisi_par      INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (inscription_id, matiere_id, periode)
);

-- ---------- Appréciations par compétence (maternelle) ----------
CREATE TABLE IF NOT EXISTS competences (
  id       SERIAL PRIMARY KEY,
  domaine  TEXT NOT NULL,                                -- Langage, Motricité…
  libelle  TEXT NOT NULL,
  ordre    INTEGER NOT NULL DEFAULT 0,
  UNIQUE (domaine, libelle)
);

CREATE TABLE IF NOT EXISTS appreciations (
  id             SERIAL PRIMARY KEY,
  inscription_id INTEGER NOT NULL REFERENCES inscriptions(id) ON DELETE CASCADE,
  competence_id  INTEGER NOT NULL REFERENCES competences(id) ON DELETE CASCADE,
  periode        INTEGER NOT NULL CHECK (periode BETWEEN 1 AND 6),
  niveau         TEXT NOT NULL CHECK (niveau IN ('A','EC','NA')), -- Acquis / En cours / Non acquis
  saisi_par      INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (inscription_id, competence_id, periode)
);

-- Observation générale de l'enseignant sur le bulletin.
CREATE TABLE IF NOT EXISTS observations (
  inscription_id INTEGER NOT NULL REFERENCES inscriptions(id) ON DELETE CASCADE,
  periode        INTEGER NOT NULL CHECK (periode BETWEEN 1 AND 6),
  texte          TEXT NOT NULL,
  PRIMARY KEY (inscription_id, periode)
);

-- ---------- Salaires versés ----------
CREATE TABLE IF NOT EXISTS salaires (
  id            SERIAL PRIMARY KEY,
  personnel_id  INTEGER NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
  mois          DATE NOT NULL,                           -- 1er jour du mois
  montant       NUMERIC(12,2) NOT NULL CHECK (montant > 0),
  date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
  mode          TEXT NOT NULL DEFAULT 'especes',
  remarque      TEXT,
  saisi_par     INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Dépenses de l'école (hors salaires, comptés à part) ----------
CREATE TABLE IF NOT EXISTS depenses (
  id          SERIAL PRIMARY KEY,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  categorie   TEXT NOT NULL,                             -- Loyer, Électricité, Fournitures…
  libelle     TEXT NOT NULL,
  montant     NUMERIC(12,2) NOT NULL CHECK (montant > 0),
  mode        TEXT NOT NULL DEFAULT 'especes',
  saisi_par   INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS depenses_date_idx ON depenses (date);

-- ---------- Emploi du temps ----------
CREATE TABLE IF NOT EXISTS emploi_du_temps (
  id           SERIAL PRIMARY KEY,
  classe_id    INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  jour         INTEGER NOT NULL CHECK (jour BETWEEN 1 AND 6), -- 1 = lundi … 6 = samedi
  heure_debut  TIME NOT NULL,
  heure_fin    TIME NOT NULL,
  matiere      TEXT NOT NULL,
  intervenant  TEXT,
  CHECK (heure_fin > heure_debut)
);

-- ---------- Calendrier scolaire ----------
CREATE TABLE IF NOT EXISTS evenements (
  id          SERIAL PRIMARY KEY,
  titre       TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('vacances','examen','evenement','ferie','reunion')),
  date_debut  DATE NOT NULL,
  date_fin    DATE NOT NULL,
  description TEXT,
  CHECK (date_fin >= date_debut)
);

-- ---------- Journal des sauvegardes automatiques ----------
CREATE TABLE IF NOT EXISTS sauvegardes (
  id         SERIAL PRIMARY KEY,
  fichier    TEXT NOT NULL,
  taille     INTEGER NOT NULL,
  auto       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Contenu de la sauvegarde (JSON compressé) gardé dans la base : sur un hébergement
-- serverless (Vercel), le disque est effacé à chaque redémarrage.
ALTER TABLE sauvegardes ADD COLUMN IF NOT EXISTS donnees BYTEA;

-- ---------- Tentatives de connexion échouées (anti-essais en série) ----------
-- Gardées en base : sur un hébergement serverless, la mémoire du serveur est
-- perdue à chaque redémarrage et n'est pas partagée entre instances.
CREATE TABLE IF NOT EXISTS echecs_connexion (
  identifiant TEXT NOT NULL,
  ip          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS echecs_connexion_idx ON echecs_connexion (identifiant, created_at);

-- ---------- Compteurs (matricules et numéros de reçus) ----------
CREATE SEQUENCE IF NOT EXISTS seq_matricule;
CREATE SEQUENCE IF NOT EXISTS seq_recu;

-- ---------- Modes de paiement acceptés (Sénégal et Mauritanie) ----------
-- Reconstruite seulement si elle n'accepte pas encore « carte » (évite de verrouiller
-- et revérifier la table des paiements à chaque démarrage).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'paiements_mode_check'
                   AND conrelid = 'paiements'::regclass AND pg_get_constraintdef(oid) LIKE '%carte%') THEN
    ALTER TABLE paiements DROP CONSTRAINT IF EXISTS paiements_mode_check;
    ALTER TABLE paiements ADD CONSTRAINT paiements_mode_check CHECK (mode IN
      ('especes','wave','orange_money','free_money','mobile_money','carte','virement','cheque','bankily','masrvi','sedad'));
  END IF;
END $$;

-- ---------- Numéro WhatsApp du parent facultatif ----------
-- Élèves saisis depuis un registre papier sans numéro : « à compléter » ; les envois
-- (rappels, annonces, reçus…) passent simplement ces élèves.
ALTER TABLE eleves ALTER COLUMN whatsapp DROP NOT NULL;

-- ---------- Numéro d'ordre de l'élève dans sa classe (ordre du registre) ----------
-- Attribué automatiquement (dernier numéro de la classe + 1) à l'inscription et au
-- changement de classe ; les listes de classe sont triées par ce numéro.
ALTER TABLE inscriptions ADD COLUMN IF NOT EXISTS numero INTEGER;
CREATE OR REPLACE FUNCTION numeroter_inscription() RETURNS trigger AS $f$
BEGIN
  IF NEW.numero IS NULL OR (TG_OP = 'UPDATE' AND NEW.classe_id IS DISTINCT FROM OLD.classe_id AND NEW.numero IS NOT DISTINCT FROM OLD.numero) THEN
    NEW.numero := COALESCE((SELECT max(numero) FROM inscriptions WHERE classe_id = NEW.classe_id AND id IS DISTINCT FROM NEW.id), 0) + 1;
  END IF;
  RETURN NEW;
END $f$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS inscriptions_numero ON inscriptions;
CREATE TRIGGER inscriptions_numero BEFORE INSERT OR UPDATE OF classe_id ON inscriptions
  FOR EACH ROW EXECUTE FUNCTION numeroter_inscription();
-- Inscriptions existantes sans numéro : ordre d'enregistrement (matricule).
UPDATE inscriptions i SET numero = x.rang
  FROM (SELECT i2.id, row_number() OVER (PARTITION BY i2.classe_id ORDER BY e.matricule) AS rang
          FROM inscriptions i2 JOIN eleves e ON e.id = i2.eleve_id) x
 WHERE x.id = i.id AND i.numero IS NULL AND NOT EXISTS (SELECT 1 FROM inscriptions i3 WHERE i3.classe_id = i.classe_id AND i3.numero IS NOT NULL);

-- ---------- Autres frais : reliquat, fournitures, uniforme, blouson ----------
-- Tarifs par niveau (fournitures, uniforme) ; montants dus par inscription (modifiables
-- par élève) ; le reliquat (reste d'une année précédente) se saisit élève par élève.
ALTER TABLE niveaux ADD COLUMN IF NOT EXISTS fournitures NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE niveaux ADD COLUMN IF NOT EXISTS uniforme NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE inscriptions ADD COLUMN IF NOT EXISTS reliquat NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE inscriptions ADD COLUMN IF NOT EXISTS fournitures NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE inscriptions ADD COLUMN IF NOT EXISTS uniforme NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE niveaux ADD COLUMN IF NOT EXISTS blouson NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE inscriptions ADD COLUMN IF NOT EXISTS blouson NUMERIC(12,2) NOT NULL DEFAULT 0;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'paiements_type_check'
                   AND conrelid = 'paiements'::regclass AND pg_get_constraintdef(oid) LIKE '%blouson%') THEN
    ALTER TABLE paiements DROP CONSTRAINT IF EXISTS paiements_type_check;
    ALTER TABLE paiements ADD CONSTRAINT paiements_type_check
      CHECK (type IN ('mensualite','inscription','reliquat','fournitures','uniforme','blouson','autre'));
  END IF;
END $$;

-- ---------- Historique des modifications d'un élève (avec motif) ----------
CREATE TABLE IF NOT EXISTS modifications_eleves (
  id             SERIAL PRIMARY KEY,
  eleve_id       INTEGER NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
  utilisateur_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
  changements    JSONB NOT NULL,          -- [{ champ, avant, apres }]
  motif          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS modifications_eleves_idx ON modifications_eleves (eleve_id, created_at DESC);

-- ---------- Indicatifs de tous les pays (plus seulement Sénégal / Mauritanie) ----------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'parametres_indicatif_defaut_check'
               AND pg_get_constraintdef(oid) LIKE '%+222%') THEN
    ALTER TABLE parametres DROP CONSTRAINT parametres_indicatif_defaut_check;
    ALTER TABLE parametres ADD CONSTRAINT parametres_indicatif_defaut_check CHECK (indicatif_defaut ~ '^\+[1-9][0-9]{0,3}$');
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'eleves_whatsapp_check'
               AND pg_get_constraintdef(oid) LIKE '%222|221%') THEN
    ALTER TABLE eleves DROP CONSTRAINT eleves_whatsapp_check;
    ALTER TABLE eleves ADD CONSTRAINT eleves_whatsapp_check CHECK (whatsapp ~ '^\+[1-9][0-9]{6,14}$');
  END IF;
END $$;

-- ---------- Comptes enseignants créés par les enseignants eux-mêmes ----------
-- L'enseignant s'inscrit depuis l'Espace Enseignants en choisissant sa classe ;
-- le compte reste « en attente » tant que la directrice ne l'a pas validé.
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS en_attente BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS classe_demandee INTEGER REFERENCES classes(id) ON DELETE SET NULL;

-- ---------- Certificats de scolarité ----------
ALTER TABLE parametres ADD COLUMN IF NOT EXISTS directrice_nom TEXT NOT NULL DEFAULT '';      -- « Madame … »
ALTER TABLE parametres ADD COLUMN IF NOT EXISTS ville TEXT NOT NULL DEFAULT '';               -- « Fait à … le »
ALTER TABLE parametres ADD COLUMN IF NOT EXISTS entete_certificat TEXT NOT NULL DEFAULT '';   -- lignes en haut à gauche
