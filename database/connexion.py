"""
Connexion à la base de données selon le pattern Singleton.

Une seule instance de connexion est partagée dans toute l'application :
peu importe le nombre d'appels à DatabaseConnection(), c'est toujours
le même objet (et donc la même connexion) qui est renvoyé.
"""

from database import config


class DatabaseConnection:
    """Gère une connexion unique à la base de données (Singleton)."""

    # Instance unique partagée (pattern Singleton)
    _instance = None

    def __new__(cls):
        """Crée l'instance une seule fois, puis la réutilise."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.connexion = None
            cls._instance.curseur = None
        return cls._instance

    def connect(self, avec_bd=True):
        """
        Ouvre la connexion à la base de données.

        Le paramètre avec_bd, si False, permet de se connecter au serveur
        sans sélectionner la base (utile pour la créer).
        Retourne True si la connexion réussit, False sinon.
        """
        try:
            if config.TYPE_BD == "mysql":
                import mysql.connector
                params = {
                    "host": config.HOTE,
                    "port": config.PORT,
                    "user": config.UTILISATEUR,
                    "password": config.MOT_DE_PASSE,
                }
                if avec_bd:
                    params["database"] = config.NOM_BD
                self.connexion = mysql.connector.connect(**params)

            elif config.TYPE_BD == "postgres":
                import psycopg2
                self.connexion = psycopg2.connect(
                    host=config.HOTE,
                    port=config.PORT,
                    user=config.UTILISATEUR,
                    password=config.MOT_DE_PASSE,
                    dbname=config.NOM_BD if avec_bd else "postgres",
                )
            else:
                print(f"Type de base de données inconnu : {config.TYPE_BD}")
                return False

            self.curseur = self.connexion.cursor()
            return True

        except Exception as e:
            print(f"Erreur de connexion : {e}")
            return False

    def execute(self, sql, params=None):
        """
        Exécute une requête SQL paramétrée (INSERT, UPDATE, DELETE, DDL).

        Retourne True si l'exécution réussit, False sinon.
        """
        try:
            self.curseur.execute(sql, params or ())
            return True
        except Exception as e:
            print(f"Erreur SQL : {e}")
            return False

    def fetch_all(self, sql, params=None):
        """Exécute un SELECT et retourne toutes les lignes."""
        try:
            self.curseur.execute(sql, params or ())
            return self.curseur.fetchall()
        except Exception as e:
            print(f"Erreur SQL (fetch_all) : {e}")
            return []

    def fetch_one(self, sql, params=None):
        """Exécute un SELECT et retourne une seule ligne."""
        try:
            self.curseur.execute(sql, params or ())
            return self.curseur.fetchone()
        except Exception as e:
            print(f"Erreur SQL (fetch_one) : {e}")
            return None

    def dernier_id(self):
        """Retourne l'identifiant de la dernière ligne insérée."""
        return self.curseur.lastrowid

    def commit(self):
        """Valide les modifications en cours."""
        if self.connexion:
            self.connexion.commit()

    def rollback(self):
        """Annule les modifications en cours."""
        if self.connexion:
            self.connexion.rollback()

    def disconnect(self):
        """Ferme le curseur et la connexion."""
        if self.curseur:
            self.curseur.close()
            self.curseur = None
        if self.connexion:
            self.connexion.close()
            self.connexion = None
