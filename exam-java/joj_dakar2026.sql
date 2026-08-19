CREATE DATABASE IF NOT EXISTS joj_dakar2026 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE joj_dakar2026;

DROP TABLE IF EXISTS resultat;
DROP TABLE IF EXISTS competition;
DROP TABLE IF EXISTS athlete;
DROP TABLE IF EXISTS discipline;
DROP TABLE IF EXISTS pays;
DROP TABLE IF EXISTS utilisateur;

CREATE TABLE utilisateur (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom_complet VARCHAR(100) NOT NULL,
    login VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL
);

CREATE TABLE pays (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom_pays VARCHAR(80) NOT NULL,
    continent VARCHAR(50) NOT NULL
);

CREATE TABLE discipline (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom_discipline VARCHAR(80) NOT NULL,
    description VARCHAR(255)
);

CREATE TABLE athlete (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(60) NOT NULL,
    prenom VARCHAR(60) NOT NULL,
    sexe VARCHAR(10) NOT NULL,
    date_naissance DATE,
    id_pays INT,
    id_discipline INT,
    FOREIGN KEY (id_pays) REFERENCES pays(id) ON DELETE SET NULL,
    FOREIGN KEY (id_discipline) REFERENCES discipline(id) ON DELETE SET NULL
);

CREATE TABLE competition (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom_competition VARCHAR(100) NOT NULL,
    date_competition DATE,
    lieu VARCHAR(50) NOT NULL,
    id_discipline INT,
    FOREIGN KEY (id_discipline) REFERENCES discipline(id) ON DELETE SET NULL
);

CREATE TABLE resultat (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_athlete INT,
    id_competition INT,
    score DOUBLE NOT NULL,
    rang INT NOT NULL,
    FOREIGN KEY (id_athlete) REFERENCES athlete(id) ON DELETE CASCADE,
    FOREIGN KEY (id_competition) REFERENCES competition(id) ON DELETE CASCADE
);

INSERT INTO utilisateur (nom_complet, login, password, role) VALUES
('Administrateur Principal', 'admin', 'admin123', 'ADMIN'),
('Ousmane Ndiaye', 'ousmane', 'passer', 'GESTIONNAIRE');

INSERT INTO pays (nom_pays, continent) VALUES
('Senegal', 'Afrique'),
('France', 'Europe'),
('Maroc', 'Afrique'),
('Bresil', 'Amerique'),
('Japon', 'Asie');

INSERT INTO discipline (nom_discipline, description) VALUES
('Athletisme', 'Courses, sauts et lancers'),
('Natation', 'Epreuves en bassin'),
('Judo', 'Art martial de combat'),
('Basketball', 'Sport collectif de ballon');

INSERT INTO athlete (nom, prenom, sexe, date_naissance, id_pays, id_discipline) VALUES
('Diop', 'Fatou', 'F', '2007-05-12', 1, 1),
('Sarr', 'Moussa', 'M', '2006-11-03', 1, 3),
('Martin', 'Lucas', 'M', '2007-02-20', 2, 2),
('Alaoui', 'Salma', 'F', '2008-07-15', 3, 1),
('Souza', 'Pedro', 'M', '2006-09-30', 4, 4);

INSERT INTO competition (nom_competition, date_competition, lieu, id_discipline) VALUES
('Finale 100m', '2026-08-20', 'Dakar', 1),
('Finale 50m Nage Libre', '2026-08-21', 'Diamniadio', 2),
('Tournoi Judo -60kg', '2026-08-22', 'Saly', 3);

INSERT INTO resultat (id_athlete, id_competition, score, rang) VALUES
(1, 1, 11.24, 1),
(4, 1, 11.58, 2),
(3, 2, 23.10, 1),
(2, 3, 100.0, 1);
