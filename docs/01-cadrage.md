# Section 1 — Document de cadrage

> Plateforme de vente en ligne hybride (boutiques vendeurs + place de marché unifiée)
> Marché de lancement : **Mauritanie** (Nouakchott, Nouadhibou) — extension **Sénégal** en phase 2.
> Statut : **brouillon en attente de validation** · Version 0.1

---

## 0. Paramètres de cadrage retenus

| Paramètre | Valeur | Conséquence sur le produit |
|---|---|---|
| Équipe | Petite équipe seed (3-5) | MVP solide réaliste ; parallélisation limitée (2 devs back/front, 1 ops terrain). On évite le sur-engineering. |
| Échéance | Flexible / non fixée | Priorisation **par valeur et par risque**, pas par date. On livre par lots utilisables. |
| Catégories | Généraliste (électronique, mode, alimentaire, artisanat, autres) | Catalogue polyvalent (variantes, unités, périssable). **Recommandation** : ancrer le lancement sur 1-2 catégories (voir §6). |
| Entité juridique RIM | **Aucune pour l'instant** | ⚠️ Bloquant pour le **séquestre des fonds** et la contractualisation avec les wallets. Montage intérimaire requis (§5). |
| Nom / domaine | Non défini | Placeholder `[Plateforme]` / `boutique.[domaine]` dans tous les livrables (question ouverte §6). |

---

## 1. Personas

### Côté offre (vendeurs & terrain)

**P1 — Le revendeur urbain « débrouille »** (persona vendeur principal)
- Ex. : revendeur d'électronique/accessoires au Marché Capitale à Nouakchott.
- Équipement : smartphone Android entrée de gamme (2-3 Go RAM), forfait data limité, réseau 3G intermittent.
- Langue : arabe + français, aisé à l'oral, littératie numérique moyenne.
- Vend déjà via WhatsApp/Facebook. Frein : pas de vitrine crédible, gestion des commandes au cahier.
- Attente : **s'inscrire et vendre entièrement depuis son téléphone**, être payé de façon fiable.

**P2 — L'artisane / commerçante mode** (persona vendeur secondaire)
- Ex. : couturière, vendeuse de tissus/melhfa, artisanat local.
- Vend via WhatsApp catalogue. Forte dimension photo, faible stock, pièces parfois uniques.
- Frein : confiance de l'acheteur à distance, gestion des variantes (taille/couleur).
- Attente : belle vitrine, contact direct WhatsApp, mise en avant.

**P3 — Le coursier indépendant** (persona livreur)
- Moto/tricycle, connaît les moughataa de Nouakchott.
- Équipement : Android entrée de gamme.
- Attente : liste de courses claire, montant à encaisser (COD) affiché, **preuve de livraison simple** (photo + code), suivi de son cash à reverser.

### Côté demande (acheteurs)

**P4 — Le jeune acheteur urbain connecté**
- 18-35 ans, Nouakchott, smartphone, actif sur WhatsApp.
- Méfiant vis-à-vis du paiement en ligne : veut **payer à la livraison**, vérifier avant de payer.
- Attente : trouver vite, prix clair en MRU, pouvoir écrire au vendeur, suivi par SMS/WhatsApp.

**P5 — L'acheteuse arabophone, faible littératie numérique**
- Interface en **arabe (RTL)**, gros boutons, peu de texte, repères visuels.
- Commande avec **numéro de téléphone seul**, pas d'email.
- Attente : réassurance (notes, retours possibles), aide humaine accessible.

### Côté plateforme

**P6 — L'opérateur back-office**
- Valide les vendeurs (KYC), modère les produits, gère commissions et versements, paramètre le pays.
- Attente : file de validation efficace, traçabilité (journal d'audit), outils de réconciliation cash.

---

## 2. Parcours utilisateurs principaux (happy paths)

**PU1 — Onboarding vendeur 100 % mobile**
Inscription (téléphone + OTP) → dépôt pièce d'identité (+ RC si entreprise) → création boutique (nom, logo, sous-domaine) → 1er produit (photo, prix MRU, stock) → **statut « en attente de validation »** → validation back-office → boutique en ligne.

**PU2 — Achat en COD avec téléphone seul**
Recherche (tolérante aux fautes, arabe) → fiche produit → ajout panier → checkout 3 étapes (adresse/zone → mode paiement (COD ou wallet) → confirmation) → commande créée avec **numéro de téléphone** → notifications SMS + WhatsApp.

**PU3 — Livraison, preuve & encaissement cash**
Commande assignée au coursier → il voit l'adresse + **montant COD à encaisser** → livraison → **preuve (photo + code de confirmation communiqué à l'acheteur)** → statut « livré » → cash marqué « collecté par livreur ».

**PU4 — Séquestre & versement vendeur** *(sous réserve entité juridique — §5)*
Fonds retenus jusqu'à confirmation de réception (ou délai automatique) → déduction commission → **solde à percevoir** crédité au vendeur → versement (wallet) → réconciliation.

**PU5 — Validation & modération back-office**
Nouveau vendeur / nouveau produit → file de modération → contrôle KYC / conformité → approbation ou rejet motivé → journal d'audit.

**PU6 — Gestion d'un refus à la livraison** *(cas non-nominal critique en COD)*
Acheteur absent/refuse → coursier marque « échec » (motif) → règle de re-présentation / annulation → réajustement stock + éventuels frais → réconciliation cash inchangée (rien encaissé).

---

## 3. Périmètre MVP — **CE QUI EST DEDANS** (Phase 1, Mauritanie)

### Espace vendeur
- Inscription + **vérification d'identité** (pièce d'identité ; RC si entreprise) — dépôt photo depuis mobile.
- Création de boutique : nom, logo, description, **sous-domaine `boutique.[domaine]`**.
- Catalogue : produits, variantes, stock, **prix en MRU**, photos (compression auto WebP/AVIF).
- Commandes : liste, statuts, **impression/génération de bon de livraison**.
- Tableau de bord basique : ventes, produits populaires, **solde à percevoir**.

### Espace acheteur
- Recherche & navigation par catégorie, **tolérante aux fautes et en arabe** (normalisation arabe, translittération).
- Fiche produit, panier, **tunnel de commande en 3 étapes max**.
- **Commande avec numéro de téléphone seul** (email optionnel).
- Suivi de commande + historique.
- **Notifications SMS et WhatsApp** (email non requis).

### Back-office plateforme
- Validation vendeurs, modération produits.
- Gestion des commissions et des versements.
- **Paramétrage par pays** : devise, langue, zones, moyens de paiement, taxes.

### Paiement
- **COD = citoyen de première classe** : gestion du cash collecté par livreur, **réconciliation**, gestion du **refus à la livraison**.
- Au moins **un wallet mobile** branché via interface abstraite `PaymentProvider` — **Bankily (BPM) recommandé en premier** (à confirmer selon accès API).
- Interface `PaymentProvider` conçue pour brancher Masrvi / Sedad / Click puis (phase 2) les agrégateurs XOF sans refonte.

### Logistique
- **Zones Nouakchott par moughataa** + Nouadhibou, avec **grille tarifaire par zone**.
- Modèle : coursiers indépendants + partenaires locaux.
- **Interface livreur simple** : liste des courses, preuve de livraison (photo + code).

### Transverse (non négociable dès le MVP)
- **i18n complet bidirectionnel FR + AR (RTL natif)** — pas une traduction plaquée.
- **Multi-pays par configuration** : le pays est une dimension (devise, langue, wallets, zones, taxes), jamais codé en dur.
- **Multi-tenant** : isolation des données par boutique.
- **Backend API-first**.
- **PWA + offline partiel** : consultation du catalogue déjà vu et du panier sans réseau.
- **Performance 3G** : budget de poids par page, images WebP/AVIF, lazy-loading, SSR.
- **Confiance** : vérification vendeur, notation, politique de retour claire, **contact WhatsApp direct**, **séquestre** (sous réserve §5).
- **Journal d'audit, RBAC (rôles/permissions), sauvegardes & reprise après incident** dès le départ.

---

## 4. Périmètre MVP — **CE QUI EST EXPLICITEMENT REPORTÉ**

| Reporté | Phase visée | Pourquoi pas maintenant |
|---|---|---|
| **Sénégal** : XOF, wolof, Wave/Orange Money/Free/Wizall, agrégateur, villes Dakar/Thiès/Saint-Louis/Touba | Phase 2 | L'**architecture** est multi-pays dès J1, mais l'**activation** Sénégal ne doit pas dicter la phase 1. |
| **Application mobile native** | Phase 2+ | Backend API-first d'abord ; la PWA couvre le MVP. |
| **Wolof (interface)** et **Hassaniya audio** (support) | Phase 2 / nice-to-have | FR + AR RTL suffisent au lancement RIM. |
| **Personnalisation avancée des thèmes vendeur** | Post-MVP | MVP = quelques thèmes prédéfinis + logo/couleurs. |
| **Publicité / mise en avant payante** | Fast-follow post-MVP | Dépend d'un volume de trafic ; modélisé mais pas construit au MVP. |
| **Agrégateur de paiement multi-opérateurs** | Phase 2 (surtout Sénégal) | RIM : intégration directe wallet + COD d'abord. |
| **Recommandations / ML, fidélité, coupons avancés** | Ultérieur | Pas de valeur avant la traction. |
| **Intégrations comptables / ERP / export avancé** | Ultérieur | Un export CSV basique suffit au MVP. |
| **Multi-devise dans un même checkout** | Phase 2 | Un pays = une devise au checkout en phase 1. |

---

## 5. Point d'attention structurant : l'absence d'entité juridique

Ce n'est pas un détail de conformité, cela **conditionne le cœur du produit** :

- **Séquestre des fonds** : retenir l'argent d'un acheteur jusqu'à confirmation suppose un compte et un statut permettant de détenir des fonds de tiers. Sans entité RIM, la plateforme ne peut légalement ni encaisser ni séquestrer.
- **Contrats wallets** (Bankily/Masrvi/…) : un compte marchand exige généralement une entité enregistrée.
- **Contrats vendeurs & livreurs** : responsabilité, fiscalité, commissions.

**Montage intérimaire proposé (à valider en §6)** — permet de démarrer le développement et un pilote sans bloquer :
1. **Modèle « facilitateur »** au départ : la plateforme met en relation, **le vendeur encaisse** (COD géré par un livreur mandaté par le vendeur), la commission est **facturée séparément** au vendeur. Pas de détention de fonds de tiers par la plateforme → séquestre « logique » (statut affiché) plutôt que séquestre financier réel, tant que l'entité n'existe pas.
2. **Construire dès maintenant** les briques techniques du vrai séquestre (comptes vendeurs, retenue, réconciliation) pour bascule immédiate dès l'entité créée.
3. **Lancer la constitution de l'entité en parallèle** (chemin critique du plan de dev).

Ce point remonte en tête de la **liste des risques** (Section 5 des livrables).

---

## 6. Questions ouvertes issues du cadrage (pour la Section 6 finale, mais utiles à trancher tôt)

1. **Catégorie d'ancrage au lancement** : généraliste dès J1 dilue la confiance et la logistique. Je recommande d'**ancrer sur 1-2 catégories** (p. ex. électronique/accessoires pour le panier moyen élevé, ou mode/artisanat pour la marge et la différenciation) tout en gardant le catalogue polyvalent. → **Ton choix ?**
2. **Nom de la plateforme et domaine** (`boutique.[domaine]`) — non défini.
3. **Entité juridique** : valides-tu le **montage intérimaire « facilitateur »** ci-dessus le temps de constituer la société ?
4. **Bankily** comme premier wallet : as-tu déjà un contact/accès API, ou faut-il prévoir COD-only au tout premier jalon ?
5. **Canal WhatsApp** : usage du numéro personnel du vendeur (lien `wa.me`) au MVP, ou API WhatsApp Business (coût, vérification Meta) ?
6. **Souveraineté des données** : y a-t-il une exigence (contractuelle/réglementaire) d'héberger en RIM/région, ou un cloud régional (proche latence Nouakchott) est-il acceptable ?

---

### Décision demandée
Merci de **valider ou amender la Section 1**. Dès accord, je passe à la **Section 2 — Schéma de base de données complet et commenté** (avec la dimension multi-pays visible), au format prêt à implémenter (PostgreSQL).
