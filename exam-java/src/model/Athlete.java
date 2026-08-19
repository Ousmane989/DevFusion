package model;

public class Athlete {
    private int id;
    private String nom;
    private String prenom;
    private String sexe;
    private String dateNaissance;
    private int idPays;
    private int idDiscipline;
    private String nomPays;
    private String nomDiscipline;

    public Athlete() {
    }

    public Athlete(int id, String nom, String prenom, String sexe, String dateNaissance, int idPays, int idDiscipline) {
        this.id = id;
        this.nom = nom;
        this.prenom = prenom;
        this.sexe = sexe;
        this.dateNaissance = dateNaissance;
        this.idPays = idPays;
        this.idDiscipline = idDiscipline;
    }

    public Athlete(String nom, String prenom, String sexe, String dateNaissance, int idPays, int idDiscipline) {
        this.nom = nom;
        this.prenom = prenom;
        this.sexe = sexe;
        this.dateNaissance = dateNaissance;
        this.idPays = idPays;
        this.idDiscipline = idDiscipline;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public String getPrenom() {
        return prenom;
    }

    public void setPrenom(String prenom) {
        this.prenom = prenom;
    }

    public String getSexe() {
        return sexe;
    }

    public void setSexe(String sexe) {
        this.sexe = sexe;
    }

    public String getDateNaissance() {
        return dateNaissance;
    }

    public void setDateNaissance(String dateNaissance) {
        this.dateNaissance = dateNaissance;
    }

    public int getIdPays() {
        return idPays;
    }

    public void setIdPays(int idPays) {
        this.idPays = idPays;
    }

    public int getIdDiscipline() {
        return idDiscipline;
    }

    public void setIdDiscipline(int idDiscipline) {
        this.idDiscipline = idDiscipline;
    }

    public String getNomPays() {
        return nomPays;
    }

    public void setNomPays(String nomPays) {
        this.nomPays = nomPays;
    }

    public String getNomDiscipline() {
        return nomDiscipline;
    }

    public void setNomDiscipline(String nomDiscipline) {
        this.nomDiscipline = nomDiscipline;
    }

    @Override
    public String toString() {
        return id + " | " + nom + " " + prenom + " | " + sexe + " | " + dateNaissance
                + " | " + (nomPays == null ? idPays : nomPays)
                + " | " + (nomDiscipline == null ? idDiscipline : nomDiscipline);
    }
}
