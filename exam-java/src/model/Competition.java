package model;

public class Competition {
    private int id;
    private String nomCompetition;
    private String dateCompetition;
    private String lieu;
    private int idDiscipline;
    private String nomDiscipline;

    public Competition() {
    }

    public Competition(int id, String nomCompetition, String dateCompetition, String lieu, int idDiscipline) {
        this.id = id;
        this.nomCompetition = nomCompetition;
        this.dateCompetition = dateCompetition;
        this.lieu = lieu;
        this.idDiscipline = idDiscipline;
    }

    public Competition(String nomCompetition, String dateCompetition, String lieu, int idDiscipline) {
        this.nomCompetition = nomCompetition;
        this.dateCompetition = dateCompetition;
        this.lieu = lieu;
        this.idDiscipline = idDiscipline;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getNomCompetition() {
        return nomCompetition;
    }

    public void setNomCompetition(String nomCompetition) {
        this.nomCompetition = nomCompetition;
    }

    public String getDateCompetition() {
        return dateCompetition;
    }

    public void setDateCompetition(String dateCompetition) {
        this.dateCompetition = dateCompetition;
    }

    public String getLieu() {
        return lieu;
    }

    public void setLieu(String lieu) {
        this.lieu = lieu;
    }

    public int getIdDiscipline() {
        return idDiscipline;
    }

    public void setIdDiscipline(int idDiscipline) {
        this.idDiscipline = idDiscipline;
    }

    public String getNomDiscipline() {
        return nomDiscipline;
    }

    public void setNomDiscipline(String nomDiscipline) {
        this.nomDiscipline = nomDiscipline;
    }

    @Override
    public String toString() {
        return id + " | " + nomCompetition + " | " + dateCompetition + " | " + lieu
                + " | " + (nomDiscipline == null ? idDiscipline : nomDiscipline);
    }
}
