package dao;

import model.Competition;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class CompetitionDAO {

    public boolean ajouter(Competition c) {
        String sql = "INSERT INTO competition (nom_competition, date_competition, lieu, id_discipline) VALUES (?, ?, ?, ?)";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ps.setString(1, c.getNomCompetition());
            ps.setString(2, c.getDateCompetition());
            ps.setString(3, c.getLieu());
            ps.setInt(4, c.getIdDiscipline());
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.out.println("Erreur ajout competition : " + e.getMessage());
            return false;
        }
    }

    public boolean modifier(Competition c) {
        String sql = "UPDATE competition SET nom_competition = ?, date_competition = ?, lieu = ?, id_discipline = ? WHERE id = ?";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ps.setString(1, c.getNomCompetition());
            ps.setString(2, c.getDateCompetition());
            ps.setString(3, c.getLieu());
            ps.setInt(4, c.getIdDiscipline());
            ps.setInt(5, c.getId());
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.out.println("Erreur modification competition : " + e.getMessage());
            return false;
        }
    }

    public boolean supprimer(int id) {
        String sql = "DELETE FROM competition WHERE id = ?";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ps.setInt(1, id);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.out.println("Erreur suppression competition : " + e.getMessage());
            return false;
        }
    }

    public Competition rechercher(int id) {
        String sql = "SELECT c.*, d.nom_discipline FROM competition c "
                + "LEFT JOIN discipline d ON c.id_discipline = d.id WHERE c.id = ?";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ps.setInt(1, id);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return mapper(rs);
            }
        } catch (SQLException e) {
            System.out.println("Erreur recherche competition : " + e.getMessage());
        }
        return null;
    }

    public List<Competition> lister() {
        List<Competition> liste = new ArrayList<>();
        String sql = "SELECT c.*, d.nom_discipline FROM competition c "
                + "LEFT JOIN discipline d ON c.id_discipline = d.id ORDER BY c.date_competition";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                liste.add(mapper(rs));
            }
        } catch (SQLException e) {
            System.out.println("Erreur liste competitions : " + e.getMessage());
        }
        return liste;
    }

    public int compter() {
        String sql = "SELECT COUNT(*) FROM competition";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return rs.getInt(1);
            }
        } catch (SQLException e) {
            System.out.println("Erreur comptage competitions : " + e.getMessage());
        }
        return 0;
    }

    private Competition mapper(ResultSet rs) throws SQLException {
        Competition c = new Competition(
                rs.getInt("id"),
                rs.getString("nom_competition"),
                rs.getString("date_competition"),
                rs.getString("lieu"),
                rs.getInt("id_discipline"));
        c.setNomDiscipline(rs.getString("nom_discipline"));
        return c;
    }
}
