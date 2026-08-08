"""DAO pour la table utilisateur : CRUD complet + authentification."""

from dao.base_dao import BaseDAO
from models.utilisateur import Utilisateur


class UtilisateurDAO(BaseDAO):
    """Accès aux données des utilisateurs."""

    def nom_table(self):
        return "utilisateur"

    def ligne_vers_objet(self, ligne):
        """Convertit une ligne SQL en objet Utilisateur.

        L'ordre des colonnes correspond à la définition de la table :
        id, login, password, nom, prenom, email, role, service, date_creation
        """
        return Utilisateur(
            id=ligne[0],
            login=ligne[1],
            password=ligne[2],
            nom=ligne[3],
            prenom=ligne[4],
            email=ligne[5],
            role=ligne[6],
            service=ligne[7],
            date_creation=ligne[8],
        )

    def ajouter(self, utilisateur):
        """Insère un nouvel utilisateur et retourne son id (ou None)."""
        sql = """
            INSERT INTO utilisateur
                (login, password, nom, prenom, email, role, service)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            utilisateur.login, utilisateur.password, utilisateur.nom,
            utilisateur.prenom, utilisateur.email, utilisateur.role,
            utilisateur.service,
        )
        if self.db.execute(sql, params):
            self.db.commit()
            return self.db.dernier_id()
        self.db.rollback()
        return None

    def modifier(self, utilisateur):
        """Met à jour les informations d'un utilisateur."""
        sql = """
            UPDATE utilisateur
            SET login = %s, password = %s, nom = %s, prenom = %s,
                email = %s, role = %s, service = %s
            WHERE id = %s
        """
        params = (
            utilisateur.login, utilisateur.password, utilisateur.nom,
            utilisateur.prenom, utilisateur.email, utilisateur.role,
            utilisateur.service, utilisateur.id,
        )
        if self.db.execute(sql, params):
            self.db.commit()
            return True
        self.db.rollback()
        return False

    def get_by_login(self, login):
        """Retourne l'utilisateur ayant ce login, ou None."""
        sql = "SELECT * FROM utilisateur WHERE login = %s"
        ligne = self.db.fetch_one(sql, (login,))
        return self.ligne_vers_objet(ligne) if ligne else None

    def authentifier(self, login, password):
        """Vérifie login + mot de passe. Retourne l'utilisateur ou None."""
        sql = "SELECT * FROM utilisateur WHERE login = %s AND password = %s"
        ligne = self.db.fetch_one(sql, (login, password))
        return self.ligne_vers_objet(ligne) if ligne else None

    def rechercher(self, terme):
        """Recherche par nom, login ou service (LIKE)."""
        motif = f"%{terme}%"
        sql = """
            SELECT * FROM utilisateur
            WHERE nom LIKE %s OR login LIKE %s OR service LIKE %s
            ORDER BY id
        """
        lignes = self.db.fetch_all(sql, (motif, motif, motif))
        return [self.ligne_vers_objet(ligne) for ligne in lignes]

    def a_des_references(self, utilisateur_id):
        """Retourne True si l'utilisateur a des incidents ou interventions."""
        sql_inc = "SELECT COUNT(*) FROM incident WHERE utilisateur_id = %s"
        sql_int = "SELECT COUNT(*) FROM intervention WHERE technicien_id = %s"
        nb_inc = self.db.fetch_one(sql_inc, (utilisateur_id,))[0]
        nb_int = self.db.fetch_one(sql_int, (utilisateur_id,))[0]
        return (nb_inc + nb_int) > 0
