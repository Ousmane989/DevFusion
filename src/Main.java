import dao.Database;
import service.IMenu;
import service.IMenuImple;

public class Main {
    public static void main(String[] args) {
        IMenu menu = new IMenuImple();
        menu.demarrer();
        Database.fermer();
    }
}
