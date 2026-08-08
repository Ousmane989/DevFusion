"""
Script de test pour vérifier la connexion à la base de données.
À lancer après avoir démarré MySQL (XAMPP) et créé les tables.
"""

from database.connexion import DatabaseConnection
from database.config import TYPE_BD


def test_connexion():
    """Teste la connexion à la base de données."""
    print("\n" + "=" * 50)
    print("   TEST DE CONNEXION À LA BASE DE DONNÉES")
    print("=" * 50)

    db = DatabaseConnection()

    print(f"\n1. Tentative de connexion à {TYPE_BD}...")
    if db.connect():
        print("   CONNEXION RÉUSSIE !")
        print(f"\n   Informations :")
        print(f"   - Type : {TYPE_BD}")
        db.disconnect()
        return True
    else:
        print("   ÉCHEC DE LA CONNEXION !")
        print("\n   Vérifiez :")
        print("   - Le service MySQL (XAMPP) est démarré")
        print("   - Les identifiants dans database/config.py sont corrects")
        print("   - La base 'gestion_incidents' existe (create_tables.py)")
        return False


def main():
    """Fonction principale de test."""
    if not test_connexion():
        print("\nArrêt des tests - Connexion échouée")
        return


if __name__ == "__main__":
    main()
