"""Classe métier représentant un utilisateur de l'application."""

# Rôles possibles pour un utilisateur
ROLE_UTILISATEUR = "UTILISATEUR"
ROLE_TECHNICIEN = "TECHNICIEN"
ROLE_ADMIN = "ADMIN"
ROLES = [ROLE_UTILISATEUR, ROLE_TECHNICIEN, ROLE_ADMIN]


class Utilisateur:
    """Représente une ligne de la table utilisateur."""

    def __init__(self, id=None, login=None, password=None, nom=None,
                 prenom=None, email=None, role=ROLE_UTILISATEUR,
                 service=None, date_creation=None):
        self.id = id
        self.login = login
        self.password = password
        self.nom = nom
        self.prenom = prenom
        self.email = email
        self.role = role
        self.service = service
        self.date_creation = date_creation

    def est_technicien(self):
        """Retourne True si l'utilisateur est technicien ou admin."""
        return self.role in (ROLE_TECHNICIEN, ROLE_ADMIN)

    def est_admin(self):
        """Retourne True si l'utilisateur est administrateur."""
        return self.role == ROLE_ADMIN

    def __str__(self):
        return (f"[{self.id}] {self.login} - {self.prenom} {self.nom} "
                f"({self.role}) - {self.service}")
