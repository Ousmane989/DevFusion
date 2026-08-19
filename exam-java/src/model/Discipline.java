package model;

public class Discipline {
    private int id;
    private String nomDiscipline;
    private String description;

    public Discipline() {
    }

    public Discipline(int id, String nomDiscipline, String description) {
        this.id = id;
        this.nomDiscipline = nomDiscipline;
        this.description = description;
    }

    public Discipline(String nomDiscipline, String description) {
        this.nomDiscipline = nomDiscipline;
        this.description = description;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getNomDiscipline() {
        return nomDiscipline;
    }

    public void setNomDiscipline(String nomDiscipline) {
        this.nomDiscipline = nomDiscipline;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    @Override
    public String toString() {
        return id + " | " + nomDiscipline + " | " + description;
    }
}
