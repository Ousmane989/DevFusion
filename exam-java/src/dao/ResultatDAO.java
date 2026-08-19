package dao;

import model.Resultat;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class ResultatDAO {

    public boolean ajouter(Resultat r) {
        String sql = "INSERT INTO resultat (id_athlete, id_competition, score, rang) VALUES (?, ?, ?, ?)";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ps.setInt(1, r.getIdAthlete());
            ps.setInt(2, r.getIdCompetition());
            ps.setDouble(3, r.getScore());
            ps.setInt(4, r.getRang());
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.out.println("Erreur enregistrement resultat : " + e.getMessage());
            return false;
        }
    }

    public boolean modifier(Resultat r) {
        String sql = "UPDATE resultat SET id_athlete = ?, id_competition = ?, score = ?, rang = ? WHERE id = ?";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ps.setInt(1, r.getIdAthlete());
            ps.setInt(2, r.getIdCompetition());
            ps.setDouble(3, r.getScore());
            ps.setInt(4, r.getRang());
            ps.setInt(5, r.getId());
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.out.println("Erreur modification resultat : " + e.getMessage());
            return false;
        }
    }

    public boolean supprimer(int id) {
        String sql = "DELETE FROM resultat WHERE id = ?";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ps.setInt(1, id);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.out.println("Erreur suppression resultat : " + e.getMessage());
            return false;
        }
    }

    public List<Resultat> lister() {
        List<Resultat> liste = new ArrayList<>();
        String sql = "SELECT r.*, CONCAT(a.nom, ' ', a.prenom) AS nom_athlete, c.nom_competition "
                + "FROM resultat r "
                + "LEFT JOIN athlete a ON r.id_athlete = a.id "
                + "LEFT JOIN competition c ON r.id_competition = c.id ORDER BY r.id";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                liste.add(mapper(rs));
            }
        } catch (SQLException e) {
            System.out.println("Erreur liste resultats : " + e.getMessage());
        }
        return liste;
    }

    public List<Resultat> classement(int idCompetition) {
        List<Resultat> liste = new ArrayList<>();
        String sql = "SELECT r.*, CONCAT(a.nom, ' ', a.prenom) AS nom_athlete, c.nom_competition "
                + "FROM resultat r "
                + "LEFT JOIN athlete a ON r.id_athlete = a.id "
                + "LEFT JOIN competition c ON r.id_competition = c.id "
                + "WHERE r.id_competition = ? ORDER BY r.rang";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ps.setInt(1, idCompetition);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                liste.add(mapper(rs));
            }
        } catch (SQLException e) {
            System.out.println("Erreur classement : " + e.getMessage());
        }
        return liste;
    }

    public int compter() {
        String sql = "SELECT COUNT(*) FROM resultat";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return rs.getInt(1);
            }
        } catch (SQLException e) {
            System.out.println("Erreur comptage resultats : " + e.getMessage());
        }
        return 0;
    }

    private Resultat mapper(ResultSet rs) throws SQLException {
        Resultat r = new Resultat(
                rs.getInt("id"),
                rs.getInt("id_athlete"),
                rs.getInt("id_competition"),
                rs.getDouble("score"),
                rs.getInt("rang"));
        r.setNomAthlete(rs.getString("nom_athlete"));
        r.setNomCompetition(rs.getString("nom_competition"));
        return r;
    }
}
