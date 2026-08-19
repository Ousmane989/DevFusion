package dao;

import model.Athlete;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class AthleteDAO {

    public boolean ajouter(Athlete a) {
        String sql = "INSERT INTO athlete (nom, prenom, sexe, date_naissance, id_pays, id_discipline) VALUES (?, ?, ?, ?, ?, ?)";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ps.setString(1, a.getNom());
            ps.setString(2, a.getPrenom());
            ps.setString(3, a.getSexe());
            ps.setString(4, a.getDateNaissance());
            ps.setInt(5, a.getIdPays());
            ps.setInt(6, a.getIdDiscipline());
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.out.println("Erreur ajout athlete : " + e.getMessage());
            return false;
        }
    }

    public boolean modifier(Athlete a) {
        String sql = "UPDATE athlete SET nom = ?, prenom = ?, sexe = ?, date_naissance = ?, id_pays = ?, id_discipline = ? WHERE id = ?";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ps.setString(1, a.getNom());
            ps.setString(2, a.getPrenom());
            ps.setString(3, a.getSexe());
            ps.setString(4, a.getDateNaissance());
            ps.setInt(5, a.getIdPays());
            ps.setInt(6, a.getIdDiscipline());
            ps.setInt(7, a.getId());
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.out.println("Erreur modification athlete : " + e.getMessage());
            return false;
        }
    }

    public boolean supprimer(int id) {
        String sql = "DELETE FROM athlete WHERE id = ?";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ps.setInt(1, id);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.out.println("Erreur suppression athlete : " + e.getMessage());
            return false;
        }
    }

    public Athlete rechercher(int id) {
        String sql = "SELECT a.*, p.nom_pays, d.nom_discipline FROM athlete a "
                + "LEFT JOIN pays p ON a.id_pays = p.id "
                + "LEFT JOIN discipline d ON a.id_discipline = d.id WHERE a.id = ?";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ps.setInt(1, id);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return mapper(rs);
            }
        } catch (SQLException e) {
            System.out.println("Erreur recherche athlete : " + e.getMessage());
        }
        return null;
    }

    public List<Athlete> lister() {
        List<Athlete> liste = new ArrayList<>();
        String sql = "SELECT a.*, p.nom_pays, d.nom_discipline FROM athlete a "
                + "LEFT JOIN pays p ON a.id_pays = p.id "
                + "LEFT JOIN discipline d ON a.id_discipline = d.id ORDER BY a.nom";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                liste.add(mapper(rs));
            }
        } catch (SQLException e) {
            System.out.println("Erreur liste athletes : " + e.getMessage());
        }
        return liste;
    }

    public int compter() {
        String sql = "SELECT COUNT(*) FROM athlete";
        try {
            Connection cn = Database.getConnection();
            PreparedStatement ps = cn.prepareStatement(sql);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return rs.getInt(1);
            }
        } catch (SQLException e) {
            System.out.println("Erreur comptage athletes : " + e.getMessage());
        }
        return 0;
    }

    private Athlete mapper(ResultSet rs) throws SQLException {
        Athlete a = new Athlete(
                rs.getInt("id"),
                rs.getString("nom"),
                rs.getString("prenom"),
                rs.getString("sexe"),
                rs.getString("date_naissance"),
                rs.getInt("id_pays"),
                rs.getInt("id_discipline"));
        a.setNomPays(rs.getString("nom_pays"));
        a.setNomDiscipline(rs.getString("nom_discipline"));
        return a;
    }
}
