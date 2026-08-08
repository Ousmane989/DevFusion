"""
DAO dédié aux rapports et statistiques (réservés à l'ADMIN).

Ces requêtes agrègent les données des tables incident et intervention.
"""

from database.connexion import DatabaseConnection


class RapportDAO:
    """Fournit les statistiques demandées dans le cahier des charges."""

    def __init__(self):
        self.db = DatabaseConnection()

    def incidents_par_statut(self):
        """Nombre total d'incidents par statut."""
        sql = ("SELECT statut, COUNT(*) FROM incident "
               "GROUP BY statut ORDER BY statut")
        return self.db.fetch_all(sql)

    def incidents_par_priorite(self):
        """Nombre d'incidents par priorité."""
        sql = ("SELECT priorite, COUNT(*) FROM incident "
               "GROUP BY priorite ORDER BY priorite")
        return self.db.fetch_all(sql)

    def temps_moyen_resolution_heures(self):
        """
        Temps moyen (en heures) entre la création de l'incident et
        sa dernière intervention, pour les incidents résolus ou fermés.
        """
        sql = """
            SELECT AVG(TIMESTAMPDIFF(HOUR, i.date_creation, iv.date_intervention))
            FROM incident i
            JOIN intervention iv ON iv.incident_id = i.id
            WHERE i.statut IN ('RESOLU', 'FERME')
        """
        resultat = self.db.fetch_one(sql)
        return resultat[0] if resultat and resultat[0] is not None else 0

    def top_techniciens(self, limite=3):
        """Top des techniciens les plus actifs (nombre d'interventions)."""
        sql = """
            SELECT u.id, u.login, u.nom, u.prenom, COUNT(iv.id) AS nb
            FROM utilisateur u
            JOIN intervention iv ON iv.technicien_id = u.id
            GROUP BY u.id, u.login, u.nom, u.prenom
            ORDER BY nb DESC
            LIMIT %s
        """
        return self.db.fetch_all(sql, (limite,))

    def activite_par_technicien(self):
        """
        Pour chaque technicien : nombre d'incidents distincts traités
        et temps moyen (minutes) par intervention.
        """
        sql = """
            SELECT u.login,
                   COUNT(DISTINCT iv.incident_id) AS nb_incidents,
                   AVG(iv.duree_minutes) AS moyenne_minutes
            FROM utilisateur u
            JOIN intervention iv ON iv.technicien_id = u.id
            GROUP BY u.login
            ORDER BY nb_incidents DESC
        """
        return self.db.fetch_all(sql)

    def taux_resolution_48h(self):
        """
        Pourcentage d'incidents résolus/fermés dont la dernière
        intervention a eu lieu moins de 48h après la création.
        """
        sql = """
            SELECT
                SUM(CASE WHEN diff <= 48 THEN 1 ELSE 0 END) AS dans_48h,
                COUNT(*) AS total
            FROM (
                SELECT i.id,
                       TIMESTAMPDIFF(HOUR, i.date_creation,
                                     MAX(iv.date_intervention)) AS diff
                FROM incident i
                JOIN intervention iv ON iv.incident_id = i.id
                WHERE i.statut IN ('RESOLU', 'FERME')
                GROUP BY i.id, i.date_creation
            ) AS sous_requete
        """
        resultat = self.db.fetch_one(sql)
        if not resultat or not resultat[1]:
            return 0.0
        dans_48h = resultat[0] or 0
        total = resultat[1]
        return round((dans_48h / total) * 100, 2)
