"""
Script d'insertion de données de test.

Crée quelques utilisateurs (admin, techniciens, utilisateurs),
des incidents et des interventions pour pouvoir tester rapidement
l'application et les statistiques.
"""

from dao.utilisateur_dao import UtilisateurDAO
from dao.incident_dao import IncidentDAO
from dao.intervention_dao import InterventionDAO
from models.utilisateur import Utilisateur
from models.incident import Incident, STATUT_EN_COURS, STATUT_RESOLU
from models.intervention import Intervention


def inserer_donnees():
    utilisateur_dao = UtilisateurDAO()
    incident_dao = IncidentDAO()
    intervention_dao = InterventionDAO()

    print("→ Insertion des utilisateurs...")
    utilisateurs = [
        Utilisateur(login="admin", password="admin123", nom="Diop",
                    prenom="Awa", email="admin@entreprise.sn",
                    role="ADMIN", service="Informatique"),
        Utilisateur(login="tech1", password="tech123", nom="Ndiaye",
                    prenom="Modou", email="modou@entreprise.sn",
                    role="TECHNICIEN", service="Informatique"),
        Utilisateur(login="tech2", password="tech123", nom="Fall",
                    prenom="Fatou", email="fatou@entreprise.sn",
                    role="TECHNICIEN", service="Informatique"),
        Utilisateur(login="user1", password="user123", nom="Sow",
                    prenom="Ousmane", email="ousmane@entreprise.sn",
                    role="UTILISATEUR", service="Comptabilité"),
        Utilisateur(login="user2", password="user123", nom="Ba",
                    prenom="Aminata", email="aminata@entreprise.sn",
                    role="UTILISATEUR", service="RH"),
    ]

    ids = {}
    for u in utilisateurs:
        # On évite les doublons si le script est relancé
        existant = utilisateur_dao.get_by_login(u.login)
        if existant:
            ids[u.login] = existant.id
        else:
            ids[u.login] = utilisateur_dao.ajouter(u)

    print("→ Insertion des incidents...")
    inc1 = incident_dao.ajouter(Incident(
        titre="Imprimante en panne", description="L'imprimante RH ne "
        "répond plus", priorite="MOYENNE", utilisateur_id=ids["user2"]))
    inc2 = incident_dao.ajouter(Incident(
        titre="Accès messagerie impossible", description="Erreur de mot "
        "de passe Outlook", priorite="HAUTE", utilisateur_id=ids["user1"]))
    inc3 = incident_dao.ajouter(Incident(
        titre="Écran bleu au démarrage", description="PC comptabilité "
        "plante au boot", priorite="CRITIQUE", utilisateur_id=ids["user1"]))

    print("→ Insertion des interventions...")
    intervention_dao.ajouter(Intervention(
        commentaire="Redémarrage et changement de câble", duree_minutes=20,
        incident_id=inc1, technicien_id=ids["tech1"]))
    incident_dao.changer_statut(inc1, STATUT_EN_COURS)

    intervention_dao.ajouter(Intervention(
        commentaire="Réinitialisation du mot de passe", duree_minutes=15,
        incident_id=inc2, technicien_id=ids["tech2"]))
    incident_dao.changer_statut(inc2, STATUT_EN_COURS)
    intervention_dao.ajouter(Intervention(
        commentaire="Vérification finale, problème résolu", duree_minutes=10,
        incident_id=inc2, technicien_id=ids["tech2"]))
    incident_dao.changer_statut(inc2, STATUT_RESOLU)

    print("\nDonnées de test insérées avec succès !")
    print("Comptes de connexion :")
    print("   admin / admin123   (ADMIN)")
    print("   tech1 / tech123    (TECHNICIEN)")
    print("   user1 / user123    (UTILISATEUR)")


if __name__ == "__main__":
    inserer_donnees()
