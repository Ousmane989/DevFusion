package dao;

import model.Discipline;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class DisciplineDAO {

    public boolean ajouter(Discipline d) {
        String sql = "INSERT INTO discipline (nom_discipline, description) VALUES (?, ?)";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ps.setString(1, d.getNomDiscipline());
            ps.setString(2, d.getDescription());
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.out.println("Erreur ajout discipline : " + e.getMessage());
            return false;
        }
    }

    public boolean modifier(Discipline d) {
        String sql = "UPDATE discipline SET nom_discipline = ?, description = ? WHERE id = ?";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ps.setString(1, d.getNomDiscipline());
            ps.setString(2, d.getDescription());
            ps.setInt(3, d.getId());
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.out.println("Erreur modification discipline : " + e.getMessage());
            return false;
        }
    }

    public boolean supprimer(int id) {
        String sql = "DELETE FROM discipline WHERE id = ?";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ps.setInt(1, id);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.out.println("Erreur suppression discipline : " + e.getMessage());
            return false;
        }
    }

    public Discipline rechercher(int id) {
        String sql = "SELECT * FROM discipline WHERE id = ?";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ps.setInt(1, id);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return mapper(rs);
            }
        } catch (SQLException e) {
            System.out.println("Erreur recherche discipline : " + e.getMessage());
        }
        return null;
    }

    public List<Discipline> lister() {
        List<Discipline> liste = new ArrayList<>();
        String sql = "SELECT * FROM discipline ORDER BY nom_discipline";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                liste.add(mapper(rs));
            }
        } catch (SQLException e) {
            System.out.println("Erreur liste disciplines : " + e.getMessage());
        }
        return liste;
    }

    public int compter() {
        String sql = "SELECT COUNT(*) FROM discipline";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return rs.getInt(1);
            }
        } catch (SQLException e) {
            System.out.println("Erreur comptage disciplines : " + e.getMessage());
        }
        return 0;
    }

    private Discipline mapper(ResultSet rs) throws SQLException {
        return new Discipline(
                rs.getInt("id"),
                rs.getString("nom_discipline"),
                rs.getString("description"));
    }
}
