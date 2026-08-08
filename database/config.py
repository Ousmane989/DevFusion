"""
Configuration de la connexion à la base de données.

Modifie ces valeurs selon ton installation (XAMPP, WAMP, PostgreSQL...).
Sous XAMPP, MySQL tourne par défaut sur le port 3306, utilisateur "root"
et mot de passe vide.
"""

# Type de base de données utilisé : "mysql" ou "postgres"
TYPE_BD = "mysql"

# Paramètres de connexion
HOTE = "localhost"
PORT = 3306              # 3306 pour MySQL (XAMPP), 5432 pour PostgreSQL
UTILISATEUR = "root"     # Utilisateur par défaut sous XAMPP
MOT_DE_PASSE = ""        # Mot de passe vide par défaut sous XAMPP
NOM_BD = "gestion_incidents"
