"""
Point d'entrée principal de l'application de gestion des incidents.

Enchaînement :
    1. Connexion à la base de données
    2. Authentification de l'utilisateur
    3. Affichage du menu correspondant à son rôle
"""

from database.connexion import DatabaseConnection
from menu.auth import se_connecter
from menu.interface import Interface


def main():
    print("\n" + "=" * 50)
    print("   GESTION DES TICKETS D'INCIDENTS - HELP DESK")
    print("=" * 50)

    # 1. Connexion à la base de données
    db = DatabaseConnection()
    if not db.connect():
        print("\nImpossible de se connecter à la base de données.")
        print("Vérifiez que MySQL (XAMPP) est démarré et que la base")
        print("a bien été créée avec 'python create_tables.py'.")
        return

    try:
        # 2. Authentification
        utilisateur = se_connecter()
        if not utilisateur:
            return

        # 3. Menu selon le rôle
        interface = Interface(utilisateur)
        interface.demarrer()

        print("\nÀ bientôt !")

    finally:
        db.disconnect()


if __name__ == "__main__":
    main()
