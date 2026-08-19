package dao;

import model.Pays;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class PaysDAO {

    public boolean ajouter(Pays p) {
        String sql = "INSERT INTO pays (nom_pays, continent) VALUES (?, ?)";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ps.setString(1, p.getNomPays());
            ps.setString(2, p.getContinent());
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.out.println("Erreur ajout pays : " + e.getMessage());
            return false;
        }
    }

    public boolean modifier(Pays p) {
        String sql = "UPDATE pays SET nom_pays = ?, continent = ? WHERE id = ?";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ps.setString(1, p.getNomPays());
            ps.setString(2, p.getContinent());
            ps.setInt(3, p.getId());
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.out.println("Erreur modification pays : " + e.getMessage());
            return false;
        }
    }

    public boolean supprimer(int id) {
        String sql = "DELETE FROM pays WHERE id = ?";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ps.setInt(1, id);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.out.println("Erreur suppression pays : " + e.getMessage());
            return false;
        }
    }

    public Pays rechercher(int id) {
        String sql = "SELECT * FROM pays WHERE id = ?";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ps.setInt(1, id);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return mapper(rs);
            }
        } catch (SQLException e) {
            System.out.println("Erreur recherche pays : " + e.getMessage());
        }
        return null;
    }

    public List<Pays> lister() {
        List<Pays> liste = new ArrayList<>();
        String sql = "SELECT * FROM pays ORDER BY nom_pays";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                liste.add(mapper(rs));
            }
        } catch (SQLException e) {
            System.out.println("Erreur liste pays : " + e.getMessage());
        }
        return liste;
    }

    public int compter() {
        String sql = "SELECT COUNT(*) FROM pays";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return rs.getInt(1);
            }
        } catch (SQLException e) {
            System.out.println("Erreur comptage pays : " + e.getMessage());
        }
        return 0;
    }

    private Pays mapper(ResultSet rs) throws SQLException {
        return new Pays(
                rs.getInt("id"),
                rs.getString("nom_pays"),
                rs.getString("continent"));
    }
}
