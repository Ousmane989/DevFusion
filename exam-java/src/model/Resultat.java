package model;

public class Resultat {
    private int id;
    private int idAthlete;
    private int idCompetition;
    private double score;
    private int rang;
    private String nomAthlete;
    private String nomCompetition;

    public Resultat() {
    }

    public Resultat(int id, int idAthlete, int idCompetition, double score, int rang) {
        this.id = id;
        this.idAthlete = idAthlete;
        this.idCompetition = idCompetition;
        this.score = score;
        this.rang = rang;
    }

    public Resultat(int idAthlete, int idCompetition, double score, int rang) {
        this.idAthlete = idAthlete;
        this.idCompetition = idCompetition;
        this.score = score;
        this.rang = rang;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public int getIdAthlete() {
        return idAthlete;
    }

    public void setIdAthlete(int idAthlete) {
        this.idAthlete = idAthlete;
    }

    public int getIdCompetition() {
        return idCompetition;
    }

    public void setIdCompetition(int idCompetition) {
        this.idCompetition = idCompetition;
    }

    public double getScore() {
        return score;
    }

    public void setScore(double score) {
        this.score = score;
    }

    public int getRang() {
        return rang;
    }

    public void setRang(int rang) {
        this.rang = rang;
    }

    public String getNomAthlete() {
        return nomAthlete;
    }

    public void setNomAthlete(String nomAthlete) {
        this.nomAthlete = nomAthlete;
    }

    public String getNomCompetition() {
        return nomCompetition;
    }

    public void setNomCompetition(String nomCompetition) {
        this.nomCompetition = nomCompetition;
    }

    public String medaille() {
        if (rang == 1) {
            return "Or";
        }
        if (rang == 2) {
            return "Argent";
        }
        if (rang == 3) {
            return "Bronze";
        }
        return "-";
    }

    @Override
    public String toString() {
        return id + " | " + (nomAthlete == null ? idAthlete : nomAthlete)
                + " | " + (nomCompetition == null ? idCompetition : nomCompetition)
                + " | score=" + score + " | rang=" + rang + " | " + medaille();
    }
}
