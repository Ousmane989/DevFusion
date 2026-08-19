package model;

public class Pays {
    private int id;
    private String nomPays;
    private String continent;

    public Pays() {
    }

    public Pays(int id, String nomPays, String continent) {
        this.id = id;
        this.nomPays = nomPays;
        this.continent = continent;
    }

    public Pays(String nomPays, String continent) {
        this.nomPays = nomPays;
        this.continent = continent;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getNomPays() {
        return nomPays;
    }

    public void setNomPays(String nomPays) {
        this.nomPays = nomPays;
    }

    public String getContinent() {
        return continent;
    }

    public void setContinent(String continent) {
        this.continent = continent;
    }

    @Override
    public String toString() {
        return id + " | " + nomPays + " | " + continent;
    }
}
