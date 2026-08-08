# Gestion des Tickets d'Incidents (Help Desk)

Application console en **Python (POO)** connectée à une base de données
**MySQL** (via XAMPP), permettant de gérer les incidents informatiques
d'une entreprise : signalement, prise en charge, résolution et supervision.

Projet réalisé dans le cadre du cours de **Programmation Orientée Objet &
Base de données** — Licence 2 Génie Logiciel.

---

## Fonctionnalités

L'application propose **3 rôles** avec des menus différents :

- **UTILISATEUR** : signaler des incidents, consulter et filtrer ses
  propres incidents.
- **TECHNICIEN** : voir les incidents ouverts, les prendre en charge,
  ajouter des interventions, résoudre et fermer les incidents.
- **ADMIN** : tout ce que fait le technicien + gestion complète des
  utilisateurs (CRUD) + rapports et statistiques.

### Workflow des statuts d'un incident

```
OUVERT ──> EN_COURS ──> RESOLU ──> FERME
   │
   └────> ANNULE
```

Un statut ne peut jamais reculer (ex : `RESOLU → EN_COURS` est interdit).

---

## Architecture du projet

```
gestion_incidents/
├── database/
│   ├── config.py          # Configuration BD (hôte, utilisateur, mot de passe)
│   └── connexion.py       # Connexion à la BD (pattern Singleton)
├── models/
│   ├── utilisateur.py     # Classe Utilisateur
│   ├── incident.py        # Classe Incident + workflow des statuts
│   └── intervention.py    # Classe Intervention
├── dao/
│   ├── base_dao.py        # Classe abstraite BaseDAO (get_all, get_by_id...)
│   ├── utilisateur_dao.py # CRUD Utilisateur + authentification
│   ├── incident_dao.py    # CRUD Incident + filtres
│   ├── intervention_dao.py# CRUD Intervention
│   └── rapport_dao.py     # Requêtes de statistiques
├── menu/
│   ├── auth.py            # Authentification (login / mot de passe)
│   └── interface.py       # Menus console selon le rôle
├── create_tables.py      # Création de la base et des tables
├── insert_test_data.py   # Jeu de données de test
├── test_connexion.py     # Test rapide de la connexion BD
├── main.py               # Point d'entrée de l'application
├── schema.sql            # Script SQL des tables
├── requirements.txt      # Dépendances Python
└── README.md
```

### Choix techniques imposés

- **Singleton** : `DatabaseConnection` ne crée qu'une seule instance de
  connexion partagée par toute l'application.
- **Héritage** : tous les DAO héritent de la classe abstraite `BaseDAO`.
- **SQL paramétré** : toutes les requêtes utilisent `%s` (protection contre
  les injections SQL).
- **Transactions** : `commit()` / `rollback()` pour garantir l'intégrité.
- **Gestion des erreurs** : blocs `try/except` sur les opérations sensibles.

---

## Installation

### 1. Prérequis

- [Python 3.10+](https://www.python.org/)
- [XAMPP](https://www.apachefriends.org/) (fournit MySQL) — démarrer le
  module **MySQL** depuis le panneau de contrôle XAMPP.
- [PyCharm](https://www.jetbrains.com/pycharm/)

### 2. Récupérer le projet

```bash
git clone https://github.com/Ousmane989/DevFusion.git
cd DevFusion
```

### 3. Installer les dépendances

```bash
pip install -r requirements.txt
```

### 4. Configurer la base de données

Ouvrir `database/config.py` et vérifier les paramètres (valeurs par défaut
de XAMPP) :

```python
TYPE_BD = "mysql"
HOTE = "localhost"
PORT = 3306
UTILISATEUR = "root"
MOT_DE_PASSE = ""      # vide par défaut sous XAMPP
NOM_BD = "gestion_incidents"
```

### 5. Créer les tables

```bash
python create_tables.py
```

### 6. (Optionnel) Insérer des données de test

```bash
python insert_test_data.py
```

Comptes créés :

| Login | Mot de passe | Rôle        |
|-------|--------------|-------------|
| admin | admin123     | ADMIN       |
| tech1 | tech123      | TECHNICIEN  |
| user1 | user123      | UTILISATEUR |

---

## Utilisation

```bash
python main.py
```

L'application demande un **login** et un **mot de passe**, puis affiche le
menu correspondant au rôle de l'utilisateur.

---

## Auteurs

Projet réalisé par le groupe **DevFusion**.
