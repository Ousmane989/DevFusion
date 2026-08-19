# Systeme de Gestion des JOJ Dakar 2026

Application console Java utilisant JDBC et MySQL pour gerer les activites des
Jeux Olympiques de la Jeunesse Dakar 2026 : delegations (pays), athletes,
disciplines, competitions, resultats, tableau des medailles et statistiques.

## Technologies

- Java (console)
- JDBC avec requetes parametrees (PreparedStatement)
- MySQL
- Architecture en couches : model / dao / service

## Base de donnees

Nom : `joj_dakar2026`

Importer le script fourni :

```
mysql -u root -p < joj_dakar2026.sql
```

Le script cree la base, les tables et insere des donnees de demonstration.

## Configuration de la connexion

La connexion est definie dans `src/dao/Database.java` :

```
URL      : jdbc:mysql://localhost:3306/joj_dakar2026
UTILISATEUR : root
MOT DE PASSE : (vide par defaut)
```

Adapter l'utilisateur et le mot de passe a votre installation MySQL.

## Comptes de demonstration

| Login   | Mot de passe | Role         |
|---------|--------------|--------------|
| admin   | admin123     | ADMIN        |
| ousmane | passer       | GESTIONNAIRE |

Le module de gestion des utilisateurs est reserve au role ADMIN.

## Ouvrir dans IntelliJ IDEA

1. Ouvrir le dossier `exam-java` comme projet.
2. Verifier que la bibliotheque `lib/mysql-connector-j-8.4.0.jar` est bien
   ajoutee aux dependances du module (elle est deja referencee dans le
   fichier `.iml`).
3. Lancer la classe `Main`.

## Compilation et execution en ligne de commande

```
javac -cp "lib/mysql-connector-j-8.4.0.jar" -d out $(find src -name "*.java")
java -cp "out:lib/mysql-connector-j-8.4.0.jar" Main
```

## Fonctionnalites

- Authentification (connexion / deconnexion)
- Gestion des utilisateurs (ADMIN)
- Gestion des pays
- Gestion des disciplines
- Gestion des athletes
- Gestion des competitions
- Gestion des resultats et classement par competition
- Tableau des medailles (Or / Argent / Bronze / Total)
- Statistiques globales
