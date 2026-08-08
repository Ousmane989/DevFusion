"""
Classe abstraite BaseDAO.

Elle contient les opérations CRUD génériques (get_all, get_by_id,
delete_by_id) partagées par tous les DAO. Chaque DAO concret doit
hériter de cette classe et implémenter :
    - nom_table()       : le nom de la table SQL
    - ligne_vers_objet() : la conversion d'une ligne SQL en objet métier
"""

from abc import ABC, abstractmethod

from database.connexion import DatabaseConnection


class BaseDAO(ABC):
    """Classe mère abstraite fournissant les méthodes CRUD génériques."""

    def __init__(self):
        # Grâce au Singleton, tous les DAO partagent la même connexion
        self.db = DatabaseConnection()

    @abstractmethod
    def nom_table(self):
        """Retourne le nom de la table gérée par le DAO."""
        raise NotImplementedError

    @abstractmethod
    def ligne_vers_objet(self, ligne):
        """Convertit une ligne SQL (tuple) en objet métier."""
        raise NotImplementedError

    def get_all(self):
        """Retourne tous les enregistrements de la table."""
        sql = f"SELECT * FROM {self.nom_table()} ORDER BY id"
        lignes = self.db.fetch_all(sql)
        return [self.ligne_vers_objet(ligne) for ligne in lignes]

    def get_by_id(self, identifiant):
        """Retourne l'enregistrement correspondant à l'id, ou None."""
        sql = f"SELECT * FROM {self.nom_table()} WHERE id = %s"
        ligne = self.db.fetch_one(sql, (identifiant,))
        return self.ligne_vers_objet(ligne) if ligne else None

    def delete_by_id(self, identifiant):
        """Supprime l'enregistrement correspondant à l'id."""
        sql = f"DELETE FROM {self.nom_table()} WHERE id = %s"
        if self.db.execute(sql, (identifiant,)):
            self.db.commit()
            return True
        self.db.rollback()
        return False
