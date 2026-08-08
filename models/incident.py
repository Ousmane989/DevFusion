"""Classe métier représentant un incident."""

# Priorités possibles
PRIORITES = ["BASSE", "MOYENNE", "HAUTE", "CRITIQUE"]

# Statuts possibles
STATUT_OUVERT = "OUVERT"
STATUT_EN_COURS = "EN_COURS"
STATUT_RESOLU = "RESOLU"
STATUT_FERME = "FERME"
STATUT_ANNULE = "ANNULE"
STATUTS = [STATUT_OUVERT, STATUT_EN_COURS, STATUT_RESOLU,
           STATUT_FERME, STATUT_ANNULE]

# Transitions de statut autorisées (workflow des incidents)
TRANSITIONS_AUTORISEES = {
    STATUT_OUVERT: [STATUT_EN_COURS, STATUT_ANNULE],
    STATUT_EN_COURS: [STATUT_RESOLU],
    STATUT_RESOLU: [STATUT_FERME],
    STATUT_FERME: [],
    STATUT_ANNULE: [],
}


def transition_valide(statut_actuel, nouveau_statut):
    """Vérifie qu'un changement de statut respecte le workflow."""
    return nouveau_statut in TRANSITIONS_AUTORISEES.get(statut_actuel, [])


class Incident:
    """Représente une ligne de la table incident."""

    def __init__(self, id=None, titre=None, description=None,
                 priorite="MOYENNE", statut=STATUT_OUVERT,
                 date_creation=None, utilisateur_id=None):
        self.id = id
        self.titre = titre
        self.description = description
        self.priorite = priorite
        self.statut = statut
        self.date_creation = date_creation
        self.utilisateur_id = utilisateur_id

    def __str__(self):
        return (f"[{self.id}] {self.titre} | Priorité: {self.priorite} "
                f"| Statut: {self.statut}")
