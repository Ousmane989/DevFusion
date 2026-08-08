"""DAO pour la table incident : CRUD + filtres + changement de statut."""

from dao.base_dao import BaseDAO
from models.incident import Incident


class IncidentDAO(BaseDAO):
    """Accès aux données des incidents."""

    def nom_table(self):
        return "incident"

    def ligne_vers_objet(self, ligne):
        """Ordre des colonnes :
        id, titre, description, priorite, statut, date_creation, utilisateur_id
        """
        return Incident(
            id=ligne[0],
            titre=ligne[1],
            description=ligne[2],
            priorite=ligne[3],
            statut=ligne[4],
            date_creation=ligne[5],
            utilisateur_id=ligne[6],
        )

    def ajouter(self, incident):
        """Insère un nouvel incident et retourne son id (ou None)."""
        sql = """
            INSERT INTO incident
                (titre, description, priorite, statut, utilisateur_id)
            VALUES (%s, %s, %s, %s, %s)
        """
        params = (
            incident.titre, incident.description, incident.priorite,
            incident.statut, incident.utilisateur_id,
        )
        if self.db.execute(sql, params):
            self.db.commit()
            return self.db.dernier_id()
        self.db.rollback()
        return None

    def changer_statut(self, incident_id, nouveau_statut):
        """Met à jour le statut d'un incident."""
        sql = "UPDATE incident SET statut = %s WHERE id = %s"
        if self.db.execute(sql, (nouveau_statut, incident_id)):
            self.db.commit()
            return True
        self.db.rollback()
        return False

    def get_by_utilisateur(self, utilisateur_id):
        """Retourne les incidents créés par un utilisateur donné."""
        sql = ("SELECT * FROM incident WHERE utilisateur_id = %s "
               "ORDER BY id DESC")
        lignes = self.db.fetch_all(sql, (utilisateur_id,))
        return [self.ligne_vers_objet(ligne) for ligne in lignes]

    def get_par_statut_utilisateur(self, utilisateur_id, statut):
        """Filtre les incidents d'un utilisateur par statut."""
        sql = ("SELECT * FROM incident WHERE utilisateur_id = %s "
               "AND statut = %s ORDER BY id DESC")
        lignes = self.db.fetch_all(sql, (utilisateur_id, statut))
        return [self.ligne_vers_objet(ligne) for ligne in lignes]

    def get_par_priorite_utilisateur(self, utilisateur_id, priorite):
        """Filtre les incidents d'un utilisateur par priorité."""
        sql = ("SELECT * FROM incident WHERE utilisateur_id = %s "
               "AND priorite = %s ORDER BY id DESC")
        lignes = self.db.fetch_all(sql, (utilisateur_id, priorite))
        return [self.ligne_vers_objet(ligne) for ligne in lignes]

    def get_ouverts_et_en_cours(self):
        """Retourne les incidents OUVERT ou EN_COURS (vue technicien)."""
        sql = ("SELECT * FROM incident "
               "WHERE statut IN ('OUVERT', 'EN_COURS') ORDER BY id")
        lignes = self.db.fetch_all(sql)
        return [self.ligne_vers_objet(ligne) for ligne in lignes]

    def a_des_interventions(self, incident_id):
        """Retourne True si l'incident possède des interventions."""
        sql = "SELECT COUNT(*) FROM intervention WHERE incident_id = %s"
        return self.db.fetch_one(sql, (incident_id,))[0] > 0
