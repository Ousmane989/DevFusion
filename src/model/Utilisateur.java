package model;

public class Utilisateur {
    private int id;
    private String nomComplet;
    private String login;
    private String password;
    private String role;

    public Utilisateur() {
    }

    public Utilisateur(int id, String nomComplet, String login, String password, String role) {
        this.id = id;
        this.nomComplet = nomComplet;
        this.login = login;
        this.password = password;
        this.role = role;
    }

    public Utilisateur(String nomComplet, String login, String password, String role) {
        this.nomComplet = nomComplet;
        this.login = login;
        this.password = password;
        this.role = role;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getNomComplet() {
        return nomComplet;
    }

    public void setNomComplet(String nomComplet) {
        this.nomComplet = nomComplet;
    }

    public String getLogin() {
        return login;
    }

    public void setLogin(String login) {
        this.login = login;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public boolean estAdmin() {
        return role != null && role.equalsIgnoreCase("ADMIN");
    }

    @Override
    public String toString() {
        return id + " | " + nomComplet + " | " + login + " | " + role;
    }
}
