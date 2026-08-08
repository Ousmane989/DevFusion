"""
Interface console de l'application.

Affiche un menu différent selon le rôle de l'utilisateur connecté
(UTILISATEUR, TECHNICIEN, ADMIN) et applique les règles métier.
"""

from dao.utilisateur_dao import UtilisateurDAO
from dao.incident_dao import IncidentDAO
from dao.intervention_dao import InterventionDAO
from dao.rapport_dao import RapportDAO
from models.utilisateur import Utilisateur, ROLES
from models.incident import (
    Incident, PRIORITES, STATUTS,
    STATUT_OUVERT, STATUT_EN_COURS, STATUT_RESOLU, STATUT_FERME,
    transition_valide,
)
from models.intervention import Intervention


# ----------------------------------------------------------------------
# Fonctions utilitaires de saisie
# ----------------------------------------------------------------------
def demander_texte(message, obligatoire=True):
    """Demande une chaîne de caractères à l'utilisateur."""
    while True:
        valeur = input(message).strip()
        if valeur or not obligatoire:
            return valeur
        print("  ! Ce champ est obligatoire.")


def demander_entier(message, minimum=None):
    """Demande un entier valide à l'utilisateur."""
    while True:
        try:
            valeur = int(input(message).strip())
            if minimum is not None and valeur < minimum:
                print(f"  ! La valeur doit être >= {minimum}.")
                continue
            return valeur
        except ValueError:
            print("  ! Veuillez saisir un nombre entier valide.")


def demander_choix(message, options):
    """Fait choisir une valeur dans une liste (renvoie l'option choisie)."""
    print(message)
    for i, option in enumerate(options, start=1):
        print(f"   {i}. {option}")
    while True:
        try:
            index = int(input("Votre choix : ").strip())
            if 1 <= index <= len(options):
                return options[index - 1]
        except ValueError:
            pass
        print("  ! Choix invalide.")


# ======================================================================
# CLASSE PRINCIPALE DE L'INTERFACE
# ======================================================================
class Interface:
    """Orchestre l'affichage des menus et les actions de l'utilisateur."""

    def __init__(self, utilisateur_connecte):
        self.utilisateur = utilisateur_connecte
        self.utilisateur_dao = UtilisateurDAO()
        self.incident_dao = IncidentDAO()
        self.intervention_dao = InterventionDAO()
        self.rapport_dao = RapportDAO()

    # ------------------------------------------------------------------
    # Point d'entrée : affiche le bon menu selon le rôle
    # ------------------------------------------------------------------
    def demarrer(self):
        if self.utilisateur.role == "UTILISATEUR":
            self.menu_utilisateur()
        elif self.utilisateur.role == "TECHNICIEN":
            self.menu_technicien()
        elif self.utilisateur.role == "ADMIN":
            self.menu_admin()

    # ==================================================================
    # MENU UTILISATEUR
    # ==================================================================
    def menu_utilisateur(self):
        while True:
            print("\n" + "-" * 50)
            print(f"   MENU UTILISATEUR - {self.utilisateur.login}")
            print("-" * 50)
            print("1. Créer un incident")
            print("2. Consulter mes incidents")
            print("3. Détail d'un de mes incidents")
            print("4. Filtrer mes incidents par statut")
            print("5. Filtrer mes incidents par priorité")
            print("0. Se déconnecter")

            choix = input("Votre choix : ").strip()
            if choix == "1":
                self.creer_incident()
            elif choix == "2":
                self.afficher_mes_incidents()
            elif choix == "3":
                self.detail_mon_incident()
            elif choix == "4":
                self.filtrer_mes_incidents("statut")
            elif choix == "5":
                self.filtrer_mes_incidents("priorite")
            elif choix == "0":
                break
            else:
                print("Choix invalide.")

    def creer_incident(self):
        print("\n--- Nouvel incident ---")
        titre = demander_texte("Titre : ")
        description = demander_texte("Description : ")
        priorite = demander_choix("Priorité :", PRIORITES)
        incident = Incident(
            titre=titre, description=description, priorite=priorite,
            statut=STATUT_OUVERT, utilisateur_id=self.utilisateur.id,
        )
        nouvel_id = self.incident_dao.ajouter(incident)
        if nouvel_id:
            print(f"Incident #{nouvel_id} créé avec succès.")
        else:
            print("Erreur lors de la création de l'incident.")

    def afficher_mes_incidents(self):
        incidents = self.incident_dao.get_by_utilisateur(self.utilisateur.id)
        self._lister_incidents(incidents)

    def detail_mon_incident(self):
        incident_id = demander_entier("Id de l'incident : ", minimum=1)
        incident = self.incident_dao.get_by_id(incident_id)
        # Règle : un utilisateur ne voit que ses propres incidents
        if not incident or incident.utilisateur_id != self.utilisateur.id:
            print("Incident introuvable ou accès refusé.")
            return
        self._afficher_detail_incident(incident)

    def filtrer_mes_incidents(self, critere):
        if critere == "statut":
            valeur = demander_choix("Statut :", STATUTS)
            incidents = self.incident_dao.get_par_statut_utilisateur(
                self.utilisateur.id, valeur)
        else:
            valeur = demander_choix("Priorité :", PRIORITES)
            incidents = self.incident_dao.get_par_priorite_utilisateur(
                self.utilisateur.id, valeur)
        self._lister_incidents(incidents)

    # ==================================================================
    # MENU TECHNICIEN
    # ==================================================================
    def menu_technicien(self):
        while True:
            print("\n" + "-" * 50)
            print(f"   MENU TECHNICIEN - {self.utilisateur.login}")
            print("-" * 50)
            print("1. Voir les incidents OUVERTS / EN_COURS")
            print("2. Prendre en charge un incident")
            print("3. Ajouter une intervention")
            print("4. Résoudre un incident")
            print("5. Fermer un incident résolu")
            print("6. Historique de mes interventions")
            print("0. Se déconnecter")

            choix = input("Votre choix : ").strip()
            if choix == "1":
                self.afficher_incidents_actifs()
            elif choix == "2":
                self.prendre_en_charge()
            elif choix == "3":
                self.ajouter_intervention()
            elif choix == "4":
                self.changer_statut_incident(STATUT_RESOLU)
            elif choix == "5":
                self.changer_statut_incident(STATUT_FERME)
            elif choix == "6":
                self.historique_interventions()
            elif choix == "0":
                break
            else:
                print("Choix invalide.")

    def afficher_incidents_actifs(self):
        incidents = self.incident_dao.get_ouverts_et_en_cours()
        self._lister_incidents(incidents)

    def prendre_en_charge(self):
        incident_id = demander_entier("Id de l'incident : ", minimum=1)
        incident = self.incident_dao.get_by_id(incident_id)
        if not incident:
            print("Incident introuvable.")
            return
        if not transition_valide(incident.statut, STATUT_EN_COURS):
            print(f"Transition impossible depuis le statut {incident.statut}.")
            return
        if self.incident_dao.changer_statut(incident_id, STATUT_EN_COURS):
            print("Incident pris en charge (EN_COURS).")

    def ajouter_intervention(self):
        incident_id = demander_entier("Id de l'incident : ", minimum=1)
        incident = self.incident_dao.get_by_id(incident_id)
        if not incident:
            print("Incident introuvable.")
            return
        # Règle : intervention possible seulement sur OUVERT ou EN_COURS
        if incident.statut not in (STATUT_OUVERT, STATUT_EN_COURS):
            print("On ne peut intervenir que sur un incident "
                  "OUVERT ou EN_COURS.")
            return
        commentaire = demander_texte("Commentaire : ")
        duree = demander_entier("Durée (minutes) : ", minimum=0)
        intervention = Intervention(
            commentaire=commentaire, duree_minutes=duree,
            incident_id=incident_id, technicien_id=self.utilisateur.id,
        )
        nouvel_id = self.intervention_dao.ajouter(intervention)
        if nouvel_id:
            print(f"Intervention #{nouvel_id} ajoutée.")
            # Prendre automatiquement en charge si encore OUVERT
            if incident.statut == STATUT_OUVERT:
                self.incident_dao.changer_statut(incident_id, STATUT_EN_COURS)
                print("L'incident passe automatiquement à EN_COURS.")
        else:
            print("Erreur lors de l'ajout de l'intervention.")

    def changer_statut_incident(self, nouveau_statut):
        incident_id = demander_entier("Id de l'incident : ", minimum=1)
        incident = self.incident_dao.get_by_id(incident_id)
        if not incident:
            print("Incident introuvable.")
            return
        if not transition_valide(incident.statut, nouveau_statut):
            print(f"Transition {incident.statut} -> {nouveau_statut} "
                  "interdite par le workflow.")
            return
        if self.incident_dao.changer_statut(incident_id, nouveau_statut):
            print(f"Incident #{incident_id} : statut -> {nouveau_statut}.")

    def historique_interventions(self):
        interventions = self.intervention_dao.get_by_technicien(
            self.utilisateur.id)
        if not interventions:
            print("Aucune intervention enregistrée.")
            return
        print(f"\n{len(interventions)} intervention(s) :")
        for inter in interventions:
            print(f"  {inter}")

    # ==================================================================
    # MENU ADMIN
    # ==================================================================
    def menu_admin(self):
        while True:
            print("\n" + "-" * 50)
            print(f"   MENU ADMIN - {self.utilisateur.login}")
            print("-" * 50)
            print("--- Utilisateurs ---")
            print("1. Ajouter un utilisateur")
            print("2. Lister les utilisateurs")
            print("3. Détail d'un utilisateur")
            print("4. Modifier un utilisateur")
            print("5. Supprimer un utilisateur")
            print("6. Rechercher un utilisateur")
            print("--- Incidents & interventions ---")
            print("7. Voir tous les incidents")
            print("8. Prendre en charge / intervenir / résoudre")
            print("--- Supervision ---")
            print("9. Rapports et statistiques")
            print("0. Se déconnecter")

            choix = input("Votre choix : ").strip()
            if choix == "1":
                self.ajouter_utilisateur()
            elif choix == "2":
                self.lister_utilisateurs()
            elif choix == "3":
                self.detail_utilisateur()
            elif choix == "4":
                self.modifier_utilisateur()
            elif choix == "5":
                self.supprimer_utilisateur()
            elif choix == "6":
                self.rechercher_utilisateur()
            elif choix == "7":
                self._lister_incidents(self.incident_dao.get_all())
            elif choix == "8":
                self.menu_technicien()  # l'admin a les droits du technicien
            elif choix == "9":
                self.afficher_rapports()
            elif choix == "0":
                break
            else:
                print("Choix invalide.")

    def ajouter_utilisateur(self):
        print("\n--- Nouvel utilisateur ---")
        login = demander_texte("Login : ")
        if self.utilisateur_dao.get_by_login(login):
            print("Ce login existe déjà.")
            return
        password = demander_texte("Mot de passe : ")
        nom = demander_texte("Nom : ")
        prenom = demander_texte("Prénom : ")
        email = demander_texte("Email : ")
        service = demander_texte("Service : ")
        role = demander_choix("Rôle :", ROLES)
        utilisateur = Utilisateur(
            login=login, password=password, nom=nom, prenom=prenom,
            email=email, role=role, service=service,
        )
        nouvel_id = self.utilisateur_dao.ajouter(utilisateur)
        if nouvel_id:
            print(f"Utilisateur #{nouvel_id} créé.")
        else:
            print("Erreur lors de la création.")

    def lister_utilisateurs(self):
        utilisateurs = self.utilisateur_dao.get_all()
        if not utilisateurs:
            print("Aucun utilisateur.")
            return
        print(f"\n{len(utilisateurs)} utilisateur(s) :")
        for u in utilisateurs:
            print(f"  {u}")

    def detail_utilisateur(self):
        identifiant = demander_entier("Id de l'utilisateur : ", minimum=1)
        u = self.utilisateur_dao.get_by_id(identifiant)
        if not u:
            print("Utilisateur introuvable.")
            return
        print(f"\n  ID       : {u.id}")
        print(f"  Login    : {u.login}")
        print(f"  Nom      : {u.prenom} {u.nom}")
        print(f"  Email    : {u.email}")
        print(f"  Rôle     : {u.role}")
        print(f"  Service  : {u.service}")
        print(f"  Créé le  : {u.date_creation}")

    def modifier_utilisateur(self):
        identifiant = demander_entier("Id de l'utilisateur : ", minimum=1)
        u = self.utilisateur_dao.get_by_id(identifiant)
        if not u:
            print("Utilisateur introuvable.")
            return
        print("(Laisser vide pour conserver la valeur actuelle)")
        u.nom = input(f"Nom [{u.nom}] : ").strip() or u.nom
        u.prenom = input(f"Prénom [{u.prenom}] : ").strip() or u.prenom
        u.email = input(f"Email [{u.email}] : ").strip() or u.email
        u.service = input(f"Service [{u.service}] : ").strip() or u.service
        if self.utilisateur_dao.modifier(u):
            print("Utilisateur mis à jour.")
        else:
            print("Erreur lors de la mise à jour.")

    def supprimer_utilisateur(self):
        identifiant = demander_entier("Id de l'utilisateur : ", minimum=1)
        u = self.utilisateur_dao.get_by_id(identifiant)
        if not u:
            print("Utilisateur introuvable.")
            return
        # Règle : suppression impossible s'il a incidents/interventions
        if self.utilisateur_dao.a_des_references(identifiant):
            print("Suppression impossible : cet utilisateur a des "
                  "incidents ou des interventions.")
            return
        if self.utilisateur_dao.delete_by_id(identifiant):
            print("Utilisateur supprimé.")

    def rechercher_utilisateur(self):
        terme = demander_texte("Recherche (nom, login ou service) : ")
        resultats = self.utilisateur_dao.rechercher(terme)
        if not resultats:
            print("Aucun résultat.")
            return
        print(f"\n{len(resultats)} résultat(s) :")
        for u in resultats:
            print(f"  {u}")

    def afficher_rapports(self):
        print("\n" + "=" * 50)
        print("   RAPPORTS ET STATISTIQUES")
        print("=" * 50)

        print("\n> Incidents par statut :")
        for statut, nombre in self.rapport_dao.incidents_par_statut():
            print(f"   {statut:<10} : {nombre}")

        print("\n> Incidents par priorité :")
        for priorite, nombre in self.rapport_dao.incidents_par_priorite():
            print(f"   {priorite:<10} : {nombre}")

        moyenne = self.rapport_dao.temps_moyen_resolution_heures()
        print(f"\n> Temps moyen de résolution : {round(moyenne, 2)} h")

        print("\n> Top 3 des techniciens les plus actifs :")
        for ligne in self.rapport_dao.top_techniciens(3):
            _, login, nom, prenom, nb = ligne
            print(f"   {login} ({prenom} {nom}) : {nb} intervention(s)")

        print("\n> Activité par technicien :")
        for login, nb_inc, moy in self.rapport_dao.activite_par_technicien():
            moy = round(moy, 1) if moy is not None else 0
            print(f"   {login} : {nb_inc} incident(s), "
                  f"{moy} min/intervention")

        taux = self.rapport_dao.taux_resolution_48h()
        print(f"\n> Taux de résolution en moins de 48h : {taux} %")

    # ==================================================================
    # MÉTHODES D'AFFICHAGE PARTAGÉES
    # ==================================================================
    def _lister_incidents(self, incidents):
        if not incidents:
            print("Aucun incident à afficher.")
            return
        print(f"\n{len(incidents)} incident(s) :")
        for incident in incidents:
            print(f"  {incident}")

    def _afficher_detail_incident(self, incident):
        print("\n" + "-" * 50)
        print(f"  Incident #{incident.id}")
        print("-" * 50)
        print(f"  Titre       : {incident.titre}")
        print(f"  Description : {incident.description}")
        print(f"  Priorité    : {incident.priorite}")
        print(f"  Statut      : {incident.statut}")
        print(f"  Créé le     : {incident.date_creation}")

        interventions = self.intervention_dao.get_by_incident(incident.id)
        if interventions:
            print(f"\n  Interventions ({len(interventions)}) :")
            for inter in interventions:
                print(f"    - {inter.commentaire} "
                      f"({inter.duree_minutes} min) "
                      f"le {inter.date_intervention}")
        else:
            print("\n  Aucune intervention pour le moment.")
