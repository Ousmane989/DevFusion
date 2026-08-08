"""Classe métier représentant une intervention sur un incident."""


class Intervention:
    """Représente une ligne de la table intervention."""

    def __init__(self, id=None, commentaire=None, duree_minutes=0,
                 date_intervention=None, incident_id=None,
                 technicien_id=None):
        self.id = id
        self.commentaire = commentaire
        self.duree_minutes = duree_minutes
        self.date_intervention = date_intervention
        self.incident_id = incident_id
        self.technicien_id = technicien_id

    def __str__(self):
        return (f"[{self.id}] Incident {self.incident_id} "
                f"| {self.duree_minutes} min | {self.commentaire}")
