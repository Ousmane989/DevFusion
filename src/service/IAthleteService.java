package service;

import model.Athlete;

import java.util.List;

public interface IAthleteService {
    boolean ajouter(Athlete a);

    boolean modifier(Athlete a);

    boolean supprimer(int id);

    Athlete rechercher(int id);

    List<Athlete> lister();
}
