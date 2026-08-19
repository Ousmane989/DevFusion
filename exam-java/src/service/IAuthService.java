package service;

import model.Utilisateur;

public interface IAuthService {
    Utilisateur connexion(String login, String password);

    Utilisateur getConnecte();

    void deconnexion();
}
