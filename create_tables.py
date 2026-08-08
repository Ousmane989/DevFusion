"""
Script de création de la base de données et des 3 tables :
    utilisateur, incident, intervention.

À exécuter UNE SEULE FOIS avant d'utiliser l'application.
Compatible MySQL (XAMPP) et PostgreSQL selon database/config.py.
"""

from database.config import TYPE_BD, NOM_BD
from database.connexion import DatabaseConnection


def creer_base():
    """Crée la base de données si elle n'existe pas (MySQL uniquement)."""
    if TYPE_BD != "mysql":
        # Sous PostgreSQL, créez la base au préalable via pgAdmin ou psql.
        return True

    db = DatabaseConnection()
    # Connexion au serveur sans sélectionner de base
    if not db.connect(avec_bd=False):
        print("Impossible de se connecter au serveur MySQL.")
        return False

    db.execute(f"CREATE DATABASE IF NOT EXISTS {NOM_BD} "
               f"CHARACTER SET utf8mb4")
    db.commit()
    db.disconnect()
    print(f"→ Base de données '{NOM_BD}' prête.")
    return True


def create_tables():
    """Création des tables utilisateur, incident, intervention."""

    if not creer_base():
        return False

    db = DatabaseConnection()
    if not db.connect():
        print("Connexion échouée")
        return False

    try:
        # ================== TABLE UTILISATEUR ==================
        sql_utilisateur = """
        CREATE TABLE IF NOT EXISTS utilisateur (
            id SERIAL PRIMARY KEY,
            login VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(100) NOT NULL,
            nom VARCHAR(100) NOT NULL,
            prenom VARCHAR(100) NOT NULL,
            email VARCHAR(150) NOT NULL,
            role VARCHAR(20) NOT NULL DEFAULT 'UTILISATEUR',
            service VARCHAR(100),
            date_creation DATE DEFAULT CURRENT_DATE
        )
        """ if TYPE_BD == "postgres" else """
        CREATE TABLE IF NOT EXISTS utilisateur (
            id INT AUTO_INCREMENT PRIMARY KEY,
            login VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(100) NOT NULL,
            nom VARCHAR(100) NOT NULL,
            prenom VARCHAR(100) NOT NULL,
            email VARCHAR(150) NOT NULL,
            role VARCHAR(20) NOT NULL DEFAULT 'UTILISATEUR',
            service VARCHAR(100),
            date_creation DATE DEFAULT (CURRENT_DATE)
        ) ENGINE=InnoDB
        """

        # ================== TABLE INCIDENT ==================
        sql_incident = """
        CREATE TABLE IF NOT EXISTS incident (
            id SERIAL PRIMARY KEY,
            titre VARCHAR(200) NOT NULL,
            description TEXT NOT NULL,
            priorite VARCHAR(20) NOT NULL DEFAULT 'MOYENNE',
            statut VARCHAR(20) NOT NULL DEFAULT 'OUVERT',
            date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            utilisateur_id INTEGER REFERENCES utilisateur(id)
        )
        """ if TYPE_BD == "postgres" else """
        CREATE TABLE IF NOT EXISTS incident (
            id INT AUTO_INCREMENT PRIMARY KEY,
            titre VARCHAR(200) NOT NULL,
            description TEXT NOT NULL,
            priorite VARCHAR(20) NOT NULL DEFAULT 'MOYENNE',
            statut VARCHAR(20) NOT NULL DEFAULT 'OUVERT',
            date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
            utilisateur_id INT,
            CONSTRAINT fk_incident_utilisateur FOREIGN KEY (utilisateur_id)
                REFERENCES utilisateur(id)
        ) ENGINE=InnoDB
        """

        # ================== TABLE INTERVENTION ==================
        sql_intervention = """
        CREATE TABLE IF NOT EXISTS intervention (
            id SERIAL PRIMARY KEY,
            commentaire TEXT NOT NULL,
            duree_minutes INTEGER NOT NULL DEFAULT 0,
            date_intervention TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            incident_id INTEGER REFERENCES incident(id) ON DELETE CASCADE,
            technicien_id INTEGER REFERENCES utilisateur(id)
        )
        """ if TYPE_BD == "postgres" else """
        CREATE TABLE IF NOT EXISTS intervention (
            id INT AUTO_INCREMENT PRIMARY KEY,
            commentaire TEXT NOT NULL,
            duree_minutes INT NOT NULL DEFAULT 0,
            date_intervention DATETIME DEFAULT CURRENT_TIMESTAMP,
            incident_id INT,
            technicien_id INT,
            CONSTRAINT fk_intervention_incident FOREIGN KEY (incident_id)
                REFERENCES incident(id) ON DELETE CASCADE,
            CONSTRAINT fk_intervention_technicien FOREIGN KEY (technicien_id)
                REFERENCES utilisateur(id)
        ) ENGINE=InnoDB
        """

        tables = [
            ("utilisateur", sql_utilisateur),
            ("incident", sql_incident),
            ("intervention", sql_intervention),
        ]

        for nom, sql in tables:
            print(f"→ Création table {nom} ...")
            if not db.execute(sql):
                raise Exception(f"Erreur création table {nom}")

        db.commit()
        print("\nToutes les tables ont été créées avec succès !")
        return True

    except Exception as e:
        print(f"Erreur globale : {e}")
        db.rollback()
        return False

    finally:
        db.disconnect()


if __name__ == "__main__":
    create_tables()
