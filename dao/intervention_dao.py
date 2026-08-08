"""DAO pour la table intervention : CRUD + recherches ciblées."""

from dao.base_dao import BaseDAO
from models.intervention import Intervention


class InterventionDAO(BaseDAO):
    """Accès aux données des interventions."""

    def nom_table(self):
        return "intervention"

    def ligne_vers_objet(self, ligne):
        """Ordre des colonnes :
        id, commentaire, duree_minutes, date_intervention,
        incident_id, technicien_id
        """
        return Intervention(
            id=ligne[0],
            commentaire=ligne[1],
            duree_minutes=ligne[2],
            date_intervention=ligne[3],
            incident_id=ligne[4],
            technicien_id=ligne[5],
        )

    def ajouter(self, intervention):
        """Insère une nouvelle intervention et retourne son id (ou None)."""
        sql = """
            INSERT INTO intervention
                (commentaire, duree_minutes, incident_id, technicien_id)
            VALUES (%s, %s, %s, %s)
        """
        params = (
            intervention.commentaire, intervention.duree_minutes,
            intervention.incident_id, intervention.technicien_id,
        )
        if self.db.execute(sql, params):
            self.db.commit()
            return self.db.dernier_id()
        self.db.rollback()
        return None

    def get_by_incident(self, incident_id):
        """Retourne les interventions liées à un incident."""
        sql = ("SELECT * FROM intervention WHERE incident_id = %s "
               "ORDER BY id")
        lignes = self.db.fetch_all(sql, (incident_id,))
        return [self.ligne_vers_objet(ligne) for ligne in lignes]

    def get_by_technicien(self, technicien_id):
        """Retourne les interventions réalisées par un technicien."""
        sql = ("SELECT * FROM intervention WHERE technicien_id = %s "
               "ORDER BY id DESC")
        lignes = self.db.fetch_all(sql, (technicien_id,))
        return [self.ligne_vers_objet(ligne) for ligne in lignes]
