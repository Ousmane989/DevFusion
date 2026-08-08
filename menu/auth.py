"""Gestion de l'authentification au lancement de l'application."""

from getpass import getpass

from dao.utilisateur_dao import UtilisateurDAO


def se_connecter():
    """
    Demande login et mot de passe et vérifie les identifiants.

    :return: l'objet Utilisateur connecté, ou None après 3 échecs.
    """
    utilisateur_dao = UtilisateurDAO()

    print("\n" + "=" * 50)
    print("   CONNEXION - GESTION DES INCIDENTS")
    print("=" * 50)

    for tentative in range(1, 4):
        login = input("\nLogin : ").strip()
        # getpass masque la saisie ; input() est utilisé en secours
        # si le terminal ne supporte pas le masquage.
        try:
            mot_de_passe = getpass("Mot de passe : ")
        except Exception:
            mot_de_passe = input("Mot de passe : ")

        utilisateur = utilisateur_dao.authentifier(login, mot_de_passe)

        if utilisateur:
            print(f"\nBienvenue {utilisateur.prenom} {utilisateur.nom} "
                  f"({utilisateur.role}) !")
            return utilisateur

        restant = 3 - tentative
        print(f"Identifiants incorrects. Tentatives restantes : {restant}")

    print("\nÉchec de l'authentification. Fermeture de l'application.")
    return None
