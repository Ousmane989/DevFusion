package service;

import dao.AthleteDAO;
import model.Athlete;

import java.util.List;

public class IAthleteServiceImple implements IAthleteService {
    private final AthleteDAO athleteDAO = new AthleteDAO();

    @Override
    public boolean ajouter(Athlete a) {
        return athleteDAO.ajouter(a);
    }

    @Override
    public boolean modifier(Athlete a) {
        return athleteDAO.modifier(a);
    }

    @Override
    public boolean supprimer(int id) {
        return athleteDAO.supprimer(id);
    }

    @Override
    public Athlete rechercher(int id) {
        return athleteDAO.rechercher(id);
    }

    @Override
    public List<Athlete> lister() {
        return athleteDAO.lister();
    }
}
