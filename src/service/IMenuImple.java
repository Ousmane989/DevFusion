package service;

import dao.CompetitionDAO;
import dao.DisciplineDAO;
import dao.PaysDAO;
import dao.ResultatDAO;
import dao.UtilisateurDAO;
import model.Athlete;
import model.Competition;
import model.Discipline;
import model.Pays;
import model.Resultat;
import model.Utilisateur;

import java.util.List;
import java.util.Scanner;

public class IMenuImple implements IMenu {
    private final Scanner sc = new Scanner(System.in);

    private final IAuthService authService = new IAuthServiceImple();
    private final IAthleteService athleteService = new IAthleteServiceImple();
    private final IStatistiqueService statistiqueService = new IStatistiqueServiceImple();

    private final UtilisateurDAO utilisateurDAO = new UtilisateurDAO();
    private final PaysDAO paysDAO = new PaysDAO();
    private final DisciplineDAO disciplineDAO = new DisciplineDAO();
    private final CompetitionDAO competitionDAO = new CompetitionDAO();
    private final ResultatDAO resultatDAO = new ResultatDAO();

    @Override
    public void demarrer() {
        boolean actif = true;
        while (actif) {
            Utilisateur u = ecranConnexion();
            if (u == null) {
                actif = false;
                continue;
            }
            actif = menuPrincipal();
        }
        System.out.println("Fermeture de l'application. A bientot.");
    }

    private Utilisateur ecranConnexion() {
        while (true) {
            System.out.println();
            System.out.println("===================================");
            System.out.println("        CONNEXION AU SYSTEME        ");
            System.out.println("===================================");
            System.out.print("Login (0 pour quitter) : ");
            String login = sc.nextLine().trim();
            if (login.equals("0")) {
                return null;
            }
            System.out.print("Mot de passe : ");
            String password = sc.nextLine().trim();

            Utilisateur u = authService.connexion(login, password);
            if (u != null) {
                System.out.println("Bienvenue " + u.getNomComplet() + " (" + u.getRole() + ")");
                return u;
            }
            System.out.println("Login ou mot de passe incorrect. Reessayez.");
        }
    }

    private boolean menuPrincipal() {
        while (true) {
            System.out.println();
            System.out.println("===================================");
            System.out.println("JEUX OLYMPIQUES DE LA JEUNESSE 2026");
            System.out.println("===================================");
            System.out.println("1. Gestion des utilisateurs");
            System.out.println("2. Gestion des pays");
            System.out.println("3. Gestion des disciplines");
            System.out.println("4. Gestion des athletes");
            System.out.println("5. Gestion des competitions");
            System.out.println("6. Gestion des resultats");
            System.out.println("7. Statistiques");
            System.out.println("8. Deconnexion");
            System.out.println("9. Quitter");
            System.out.print("Votre choix : ");
            String choix = sc.nextLine().trim();

            switch (choix) {
                case "1":
                    menuUtilisateurs();
                    break;
                case "2":
                    menuPays();
                    break;
                case "3":
                    menuDisciplines();
                    break;
                case "4":
                    menuAthletes();
                    break;
                case "5":
                    menuCompetitions();
                    break;
                case "6":
                    menuResultats();
                    break;
                case "7":
                    menuStatistiques();
                    break;
                case "8":
                    authService.deconnexion();
                    System.out.println("Vous etes deconnecte.");
                    return true;
                case "9":
                    authService.deconnexion();
                    return false;
                default:
                    System.out.println("Choix invalide.");
            }
        }
    }

    private void menuUtilisateurs() {
        if (!authService.getConnecte().estAdmin()) {
            System.out.println("Acces reserve a l'administrateur.");
            return;
        }
        while (true) {
            System.out.println();
            System.out.println("--- Gestion des utilisateurs ---");
            System.out.println("1. Ajouter utilisateur");
            System.out.println("2. Modifier utilisateur");
            System.out.println("3. Supprimer utilisateur");
            System.out.println("4. Rechercher utilisateur");
            System.out.println("5. Afficher utilisateurs");
            System.out.println("6. Retour");
            System.out.print("Votre choix : ");
            String choix = sc.nextLine().trim();
            switch (choix) {
                case "1":
                    ajouterUtilisateur();
                    break;
                case "2":
                    modifierUtilisateur();
                    break;
                case "3":
                    supprimerUtilisateur();
                    break;
                case "4":
                    rechercherUtilisateur();
                    break;
                case "5":
                    afficherUtilisateurs();
                    break;
                case "6":
                    return;
                default:
                    System.out.println("Choix invalide.");
            }
        }
    }

    private void ajouterUtilisateur() {
        System.out.print("Nom complet : ");
        String nom = sc.nextLine().trim();
        System.out.print("Login : ");
        String login = sc.nextLine().trim();
        System.out.print("Mot de passe : ");
        String pass = sc.nextLine().trim();
        System.out.print("Role (ADMIN / GESTIONNAIRE) : ");
        String role = sc.nextLine().trim();
        Utilisateur u = new Utilisateur(nom, login, pass, role);
        afficherResultat(utilisateurDAO.ajouter(u));
    }

    private void modifierUtilisateur() {
        int id = lireEntier("Id de l'utilisateur a modifier : ");
        Utilisateur u = utilisateurDAO.rechercher(id);
        if (u == null) {
            System.out.println("Utilisateur introuvable.");
            return;
        }
        System.out.print("Nouveau nom complet (" + u.getNomComplet() + ") : ");
        u.setNomComplet(valeurOuDefaut(sc.nextLine().trim(), u.getNomComplet()));
        System.out.print("Nouveau login (" + u.getLogin() + ") : ");
        u.setLogin(valeurOuDefaut(sc.nextLine().trim(), u.getLogin()));
        System.out.print("Nouveau mot de passe (" + u.getPassword() + ") : ");
        u.setPassword(valeurOuDefaut(sc.nextLine().trim(), u.getPassword()));
        System.out.print("Nouveau role (" + u.getRole() + ") : ");
        u.setRole(valeurOuDefaut(sc.nextLine().trim(), u.getRole()));
        afficherResultat(utilisateurDAO.modifier(u));
    }

    private void supprimerUtilisateur() {
        int id = lireEntier("Id de l'utilisateur a supprimer : ");
        afficherResultat(utilisateurDAO.supprimer(id));
    }

    private void rechercherUtilisateur() {
        int id = lireEntier("Id de l'utilisateur : ");
        Utilisateur u = utilisateurDAO.rechercher(id);
        System.out.println(u == null ? "Utilisateur introuvable." : u.toString());
    }

    private void afficherUtilisateurs() {
        List<Utilisateur> liste = utilisateurDAO.lister();
        if (liste.isEmpty()) {
            System.out.println("Aucun utilisateur enregistre.");
            return;
        }
        System.out.println("Id | Nom complet | Login | Role");
        for (Utilisateur u : liste) {
            System.out.println(u);
        }
    }

    private void menuPays() {
        while (true) {
            System.out.println();
            System.out.println("--- Gestion des pays ---");
            System.out.println("1. Ajouter pays");
            System.out.println("2. Modifier pays");
            System.out.println("3. Supprimer pays");
            System.out.println("4. Rechercher pays");
            System.out.println("5. Liste des pays");
            System.out.println("6. Retour");
            System.out.print("Votre choix : ");
            String choix = sc.nextLine().trim();
            switch (choix) {
                case "1":
                    ajouterPays();
                    break;
                case "2":
                    modifierPays();
                    break;
                case "3":
                    afficherResultat(paysDAO.supprimer(lireEntier("Id du pays a supprimer : ")));
                    break;
                case "4":
                    Pays p = paysDAO.rechercher(lireEntier("Id du pays : "));
                    System.out.println(p == null ? "Pays introuvable." : p.toString());
                    break;
                case "5":
                    afficherPays();
                    break;
                case "6":
                    return;
                default:
                    System.out.println("Choix invalide.");
            }
        }
    }

    private void ajouterPays() {
        System.out.print("Nom du pays : ");
        String nom = sc.nextLine().trim();
        System.out.print("Continent : ");
        String continent = sc.nextLine().trim();
        afficherResultat(paysDAO.ajouter(new Pays(nom, continent)));
    }

    private void modifierPays() {
        int id = lireEntier("Id du pays a modifier : ");
        Pays p = paysDAO.rechercher(id);
        if (p == null) {
            System.out.println("Pays introuvable.");
            return;
        }
        System.out.print("Nouveau nom (" + p.getNomPays() + ") : ");
        p.setNomPays(valeurOuDefaut(sc.nextLine().trim(), p.getNomPays()));
        System.out.print("Nouveau continent (" + p.getContinent() + ") : ");
        p.setContinent(valeurOuDefaut(sc.nextLine().trim(), p.getContinent()));
        afficherResultat(paysDAO.modifier(p));
    }

    private void afficherPays() {
        List<Pays> liste = paysDAO.lister();
        if (liste.isEmpty()) {
            System.out.println("Aucun pays enregistre.");
            return;
        }
        System.out.println("Id | Pays | Continent");
        for (Pays p : liste) {
            System.out.println(p);
        }
    }

    private void menuDisciplines() {
        while (true) {
            System.out.println();
            System.out.println("--- Gestion des disciplines ---");
            System.out.println("1. Ajouter discipline");
            System.out.println("2. Modifier discipline");
            System.out.println("3. Supprimer discipline");
            System.out.println("4. Rechercher discipline");
            System.out.println("5. Afficher disciplines");
            System.out.println("6. Retour");
            System.out.print("Votre choix : ");
            String choix = sc.nextLine().trim();
            switch (choix) {
                case "1":
                    ajouterDiscipline();
                    break;
                case "2":
                    modifierDiscipline();
                    break;
                case "3":
                    afficherResultat(disciplineDAO.supprimer(lireEntier("Id de la discipline a supprimer : ")));
                    break;
                case "4":
                    Discipline d = disciplineDAO.rechercher(lireEntier("Id de la discipline : "));
                    System.out.println(d == null ? "Discipline introuvable." : d.toString());
                    break;
                case "5":
                    afficherDisciplines();
                    break;
                case "6":
                    return;
                default:
                    System.out.println("Choix invalide.");
            }
        }
    }

    private void ajouterDiscipline() {
        System.out.print("Nom de la discipline : ");
        String nom = sc.nextLine().trim();
        System.out.print("Description : ");
        String desc = sc.nextLine().trim();
        afficherResultat(disciplineDAO.ajouter(new Discipline(nom, desc)));
    }

    private void modifierDiscipline() {
        int id = lireEntier("Id de la discipline a modifier : ");
        Discipline d = disciplineDAO.rechercher(id);
        if (d == null) {
            System.out.println("Discipline introuvable.");
            return;
        }
        System.out.print("Nouveau nom (" + d.getNomDiscipline() + ") : ");
        d.setNomDiscipline(valeurOuDefaut(sc.nextLine().trim(), d.getNomDiscipline()));
        System.out.print("Nouvelle description (" + d.getDescription() + ") : ");
        d.setDescription(valeurOuDefaut(sc.nextLine().trim(), d.getDescription()));
        afficherResultat(disciplineDAO.modifier(d));
    }

    private void afficherDisciplines() {
        List<Discipline> liste = disciplineDAO.lister();
        if (liste.isEmpty()) {
            System.out.println("Aucune discipline enregistree.");
            return;
        }
        System.out.println("Id | Discipline | Description");
        for (Discipline d : liste) {
            System.out.println(d);
        }
    }

    private void menuAthletes() {
        while (true) {
            System.out.println();
            System.out.println("--- Gestion des athletes ---");
            System.out.println("1. Ajouter athlete");
            System.out.println("2. Modifier athlete");
            System.out.println("3. Supprimer athlete");
            System.out.println("4. Rechercher athlete");
            System.out.println("5. Afficher athletes");
            System.out.println("6. Retour");
            System.out.print("Votre choix : ");
            String choix = sc.nextLine().trim();
            switch (choix) {
                case "1":
                    ajouterAthlete();
                    break;
                case "2":
                    modifierAthlete();
                    break;
                case "3":
                    afficherResultat(athleteService.supprimer(lireEntier("Id de l'athlete a supprimer : ")));
                    break;
                case "4":
                    Athlete a = athleteService.rechercher(lireEntier("Id de l'athlete : "));
                    System.out.println(a == null ? "Athlete introuvable." : a.toString());
                    break;
                case "5":
                    afficherAthletes();
                    break;
                case "6":
                    return;
                default:
                    System.out.println("Choix invalide.");
            }
        }
    }

    private void ajouterAthlete() {
        System.out.print("Nom : ");
        String nom = sc.nextLine().trim();
        System.out.print("Prenom : ");
        String prenom = sc.nextLine().trim();
        System.out.print("Sexe (M/F) : ");
        String sexe = sc.nextLine().trim();
        System.out.print("Date de naissance (AAAA-MM-JJ) : ");
        String date = sc.nextLine().trim();
        afficherPays();
        int idPays = lireEntier("Id du pays : ");
        afficherDisciplines();
        int idDiscipline = lireEntier("Id de la discipline : ");
        afficherResultat(athleteService.ajouter(new Athlete(nom, prenom, sexe, date, idPays, idDiscipline)));
    }

    private void modifierAthlete() {
        int id = lireEntier("Id de l'athlete a modifier : ");
        Athlete a = athleteService.rechercher(id);
        if (a == null) {
            System.out.println("Athlete introuvable.");
            return;
        }
        System.out.print("Nouveau nom (" + a.getNom() + ") : ");
        a.setNom(valeurOuDefaut(sc.nextLine().trim(), a.getNom()));
        System.out.print("Nouveau prenom (" + a.getPrenom() + ") : ");
        a.setPrenom(valeurOuDefaut(sc.nextLine().trim(), a.getPrenom()));
        System.out.print("Nouveau sexe (" + a.getSexe() + ") : ");
        a.setSexe(valeurOuDefaut(sc.nextLine().trim(), a.getSexe()));
        System.out.print("Nouvelle date de naissance (" + a.getDateNaissance() + ") : ");
        a.setDateNaissance(valeurOuDefaut(sc.nextLine().trim(), a.getDateNaissance()));
        System.out.print("Nouvel id pays (" + a.getIdPays() + ") : ");
        a.setIdPays(entierOuDefaut(sc.nextLine().trim(), a.getIdPays()));
        System.out.print("Nouvel id discipline (" + a.getIdDiscipline() + ") : ");
        a.setIdDiscipline(entierOuDefaut(sc.nextLine().trim(), a.getIdDiscipline()));
        afficherResultat(athleteService.modifier(a));
    }

    private void afficherAthletes() {
        List<Athlete> liste = athleteService.lister();
        if (liste.isEmpty()) {
            System.out.println("Aucun athlete enregistre.");
            return;
        }
        System.out.println("Id | Nom Prenom | Sexe | Naissance | Pays | Discipline");
        for (Athlete a : liste) {
            System.out.println(a);
        }
    }

    private void menuCompetitions() {
        while (true) {
            System.out.println();
            System.out.println("--- Gestion des competitions ---");
            System.out.println("1. Ajouter competition");
            System.out.println("2. Modifier competition");
            System.out.println("3. Supprimer competition");
            System.out.println("4. Rechercher competition");
            System.out.println("5. Afficher competitions");
            System.out.println("6. Retour");
            System.out.print("Votre choix : ");
            String choix = sc.nextLine().trim();
            switch (choix) {
                case "1":
                    ajouterCompetition();
                    break;
                case "2":
                    modifierCompetition();
                    break;
                case "3":
                    afficherResultat(competitionDAO.supprimer(lireEntier("Id de la competition a supprimer : ")));
                    break;
                case "4":
                    Competition c = competitionDAO.rechercher(lireEntier("Id de la competition : "));
                    System.out.println(c == null ? "Competition introuvable." : c.toString());
                    break;
                case "5":
                    afficherCompetitions();
                    break;
                case "6":
                    return;
                default:
                    System.out.println("Choix invalide.");
            }
        }
    }

    private void ajouterCompetition() {
        System.out.print("Nom de la competition : ");
        String nom = sc.nextLine().trim();
        System.out.print("Date (AAAA-MM-JJ) : ");
        String date = sc.nextLine().trim();
        String lieu = choisirLieu();
        afficherDisciplines();
        int idDiscipline = lireEntier("Id de la discipline : ");
        afficherResultat(competitionDAO.ajouter(new Competition(nom, date, lieu, idDiscipline)));
    }

    private void modifierCompetition() {
        int id = lireEntier("Id de la competition a modifier : ");
        Competition c = competitionDAO.rechercher(id);
        if (c == null) {
            System.out.println("Competition introuvable.");
            return;
        }
        System.out.print("Nouveau nom (" + c.getNomCompetition() + ") : ");
        c.setNomCompetition(valeurOuDefaut(sc.nextLine().trim(), c.getNomCompetition()));
        System.out.print("Nouvelle date (" + c.getDateCompetition() + ") : ");
        c.setDateCompetition(valeurOuDefaut(sc.nextLine().trim(), c.getDateCompetition()));
        System.out.print("Nouveau lieu (" + c.getLieu() + ") : ");
        c.setLieu(valeurOuDefaut(sc.nextLine().trim(), c.getLieu()));
        System.out.print("Nouvel id discipline (" + c.getIdDiscipline() + ") : ");
        c.setIdDiscipline(entierOuDefaut(sc.nextLine().trim(), c.getIdDiscipline()));
        afficherResultat(competitionDAO.modifier(c));
    }

    private String choisirLieu() {
        while (true) {
            System.out.println("Lieux disponibles : 1. Dakar  2. Diamniadio  3. Saly");
            System.out.print("Votre choix : ");
            String choix = sc.nextLine().trim();
            switch (choix) {
                case "1":
                    return "Dakar";
                case "2":
                    return "Diamniadio";
                case "3":
                    return "Saly";
                default:
                    System.out.println("Lieu invalide.");
            }
        }
    }

    private void afficherCompetitions() {
        List<Competition> liste = competitionDAO.lister();
        if (liste.isEmpty()) {
            System.out.println("Aucune competition enregistree.");
            return;
        }
        System.out.println("Id | Nom | Date | Lieu | Discipline");
        for (Competition c : liste) {
            System.out.println(c);
        }
    }

    private void menuResultats() {
        while (true) {
            System.out.println();
            System.out.println("--- Gestion des resultats ---");
            System.out.println("1. Enregistrer resultat");
            System.out.println("2. Modifier resultat");
            System.out.println("3. Supprimer resultat");
            System.out.println("4. Classement competition");
            System.out.println("5. Afficher resultats");
            System.out.println("6. Tableau des medailles");
            System.out.println("7. Retour");
            System.out.print("Votre choix : ");
            String choix = sc.nextLine().trim();
            switch (choix) {
                case "1":
                    enregistrerResultat();
                    break;
                case "2":
                    modifierResultat();
                    break;
                case "3":
                    afficherResultat(resultatDAO.supprimer(lireEntier("Id du resultat a supprimer : ")));
                    break;
                case "4":
                    classementCompetition();
                    break;
                case "5":
                    afficherResultats();
                    break;
                case "6":
                    tableauMedailles();
                    break;
                case "7":
                    return;
                default:
                    System.out.println("Choix invalide.");
            }
        }
    }

    private void enregistrerResultat() {
        afficherAthletes();
        int idAthlete = lireEntier("Id de l'athlete : ");
        afficherCompetitions();
        int idCompetition = lireEntier("Id de la competition : ");
        double score = lireReel("Score : ");
        int rang = lireEntier("Rang : ");
        afficherResultat(resultatDAO.ajouter(new Resultat(idAthlete, idCompetition, score, rang)));
    }

    private void modifierResultat() {
        int id = lireEntier("Id du resultat a modifier : ");
        int idAthlete = lireEntier("Nouvel id athlete : ");
        int idCompetition = lireEntier("Nouvel id competition : ");
        double score = lireReel("Nouveau score : ");
        int rang = lireEntier("Nouveau rang : ");
        Resultat r = new Resultat(idAthlete, idCompetition, score, rang);
        r.setId(id);
        afficherResultat(resultatDAO.modifier(r));
    }

    private void classementCompetition() {
        afficherCompetitions();
        int id = lireEntier("Id de la competition : ");
        List<Resultat> liste = resultatDAO.classement(id);
        if (liste.isEmpty()) {
            System.out.println("Aucun resultat pour cette competition.");
            return;
        }
        System.out.println("Rang | Athlete | Score | Medaille");
        for (Resultat r : liste) {
            System.out.println(r.getRang() + " | " + r.getNomAthlete() + " | " + r.getScore() + " | " + r.medaille());
        }
    }

    private void afficherResultats() {
        List<Resultat> liste = resultatDAO.lister();
        if (liste.isEmpty()) {
            System.out.println("Aucun resultat enregistre.");
            return;
        }
        System.out.println("Id | Athlete | Competition | Score | Rang | Medaille");
        for (Resultat r : liste) {
            System.out.println(r);
        }
    }

    private void tableauMedailles() {
        List<String[]> tableau = statistiqueService.tableauMedailles();
        if (tableau.isEmpty()) {
            System.out.println("Aucune medaille attribuee pour le moment.");
            return;
        }
        System.out.printf("%-15s %-5s %-7s %-7s %-6s%n", "Pays", "Or", "Argent", "Bronze", "Total");
        for (String[] ligne : tableau) {
            System.out.printf("%-15s %-5s %-7s %-7s %-6s%n",
                    ligne[0], ligne[1], ligne[2], ligne[3], ligne[4]);
        }
    }

    private void menuStatistiques() {
        System.out.println();
        System.out.println("--- Statistiques ---");
        System.out.println("Nombre de pays        : " + statistiqueService.nombrePays());
        System.out.println("Nombre d'athletes     : " + statistiqueService.nombreAthletes());
        System.out.println("Nombre de disciplines : " + statistiqueService.nombreDisciplines());
        System.out.println("Nombre de competitions: " + statistiqueService.nombreCompetitions());
        System.out.println("Nombre de resultats   : " + statistiqueService.nombreResultats());
    }

    private int lireEntier(String message) {
        while (true) {
            System.out.print(message);
            String saisie = sc.nextLine().trim();
            try {
                return Integer.parseInt(saisie);
            } catch (NumberFormatException e) {
                System.out.println("Veuillez saisir un nombre entier.");
            }
        }
    }

    private double lireReel(String message) {
        while (true) {
            System.out.print(message);
            String saisie = sc.nextLine().trim().replace(",", ".");
            try {
                return Double.parseDouble(saisie);
            } catch (NumberFormatException e) {
                System.out.println("Veuillez saisir un nombre.");
            }
        }
    }

    private String valeurOuDefaut(String saisie, String defaut) {
        return saisie.isEmpty() ? defaut : saisie;
    }

    private int entierOuDefaut(String saisie, int defaut) {
        if (saisie.isEmpty()) {
            return defaut;
        }
        try {
            return Integer.parseInt(saisie);
        } catch (NumberFormatException e) {
            return defaut;
        }
    }

    private void afficherResultat(boolean ok) {
        System.out.println(ok ? "Operation reussie." : "Operation echouee.");
    }
}
