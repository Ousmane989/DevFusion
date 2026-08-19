package service;

import dao.UtilisateurDAO;
import model.Utilisateur;

public class IAuthServiceImple implements IAuthService {
    private final UtilisateurDAO utilisateurDAO = new UtilisateurDAO();
    private Utilisateur connecte;

    @Override
    public Utilisateur connexion(String login, String password) {
        Utilisateur u = utilisateurDAO.authentifier(login, password);
        if (u != null) {
            connecte = u;
        }
        return u;
    }

    @Override
    public Utilisateur getConnecte() {
        return connecte;
    }

    @Override
    public void deconnexion() {
        connecte = null;
    }
}
