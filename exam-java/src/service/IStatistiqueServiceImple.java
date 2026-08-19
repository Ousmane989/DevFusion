package service;

import dao.AthleteDAO;
import dao.CompetitionDAO;
import dao.Database;
import dao.DisciplineDAO;
import dao.PaysDAO;
import dao.ResultatDAO;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class IStatistiqueServiceImple implements IStatistiqueService {
    private final PaysDAO paysDAO = new PaysDAO();
    private final AthleteDAO athleteDAO = new AthleteDAO();
    private final DisciplineDAO disciplineDAO = new DisciplineDAO();
    private final CompetitionDAO competitionDAO = new CompetitionDAO();
    private final ResultatDAO resultatDAO = new ResultatDAO();

    @Override
    public int nombrePays() {
        return paysDAO.compter();
    }

    @Override
    public int nombreAthletes() {
        return athleteDAO.compter();
    }

    @Override
    public int nombreDisciplines() {
        return disciplineDAO.compter();
    }

    @Override
    public int nombreCompetitions() {
        return competitionDAO.compter();
    }

    @Override
    public int nombreResultats() {
        return resultatDAO.compter();
    }

    @Override
    public List<String[]> tableauMedailles() {
        List<String[]> tableau = new ArrayList<>();
        String sql = "SELECT p.nom_pays, "
                + "SUM(CASE WHEN r.rang = 1 THEN 1 ELSE 0 END) AS orr, "
                + "SUM(CASE WHEN r.rang = 2 THEN 1 ELSE 0 END) AS argent, "
                + "SUM(CASE WHEN r.rang = 3 THEN 1 ELSE 0 END) AS bronze "
                + "FROM resultat r "
                + "JOIN athlete a ON r.id_athlete = a.id "
                + "JOIN pays p ON a.id_pays = p.id "
                + "GROUP BY p.id, p.nom_pays "
                + "HAVING orr + argent + bronze > 0 "
                + "ORDER BY orr DESC, argent DESC, bronze DESC";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                int or = rs.getInt("orr");
                int argent = rs.getInt("argent");
                int bronze = rs.getInt("bronze");
                int total = or + argent + bronze;
                tableau.add(new String[]{
                        rs.getString("nom_pays"),
                        String.valueOf(or),
                        String.valueOf(argent),
                        String.valueOf(bronze),
                        String.valueOf(total)
                });
            }
        } catch (SQLException e) {
            System.out.println("Erreur tableau des medailles : " + e.getMessage());
        }
        return tableau;
    }
}
