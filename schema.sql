-- ---------------------------------------------------------------
-- Script SQL de création des tables (MySQL / XAMPP)
-- Projet : Gestion des Tickets d'Incidents (Help Desk)
-- ---------------------------------------------------------------

CREATE DATABASE IF NOT EXISTS gestion_incidents CHARACTER SET utf8mb4;
USE gestion_incidents;

-- ===================== TABLE UTILISATEUR =====================
CREATE TABLE IF NOT EXISTS utilisateur (
    id INT AUTO_INCREMENT PRIMARY KEY,
    login VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'UTILISATEUR',
    service VARCHAR(100),
    date_creation DATE DEFAULT (CURRENT_DATE)
) ENGINE=InnoDB;

-- ===================== TABLE INCIDENT =====================
CREATE TABLE IF NOT EXISTS incident (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titre VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priorite VARCHAR(20) NOT NULL DEFAULT 'MOYENNE',
    statut VARCHAR(20) NOT NULL DEFAULT 'OUVERT',
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    utilisateur_id INT,
    CONSTRAINT fk_incident_utilisateur FOREIGN KEY (utilisateur_id)
        REFERENCES utilisateur(id)
) ENGINE=InnoDB;

-- ===================== TABLE INTERVENTION =====================
CREATE TABLE IF NOT EXISTS intervention (
    id INT AUTO_INCREMENT PRIMARY KEY,
    commentaire TEXT NOT NULL,
    duree_minutes INT NOT NULL DEFAULT 0,
    date_intervention DATETIME DEFAULT CURRENT_TIMESTAMP,
    incident_id INT,
    technicien_id INT,
    CONSTRAINT fk_intervention_incident FOREIGN KEY (incident_id)
        REFERENCES incident(id) ON DELETE CASCADE,
    CONSTRAINT fk_intervention_technicien FOREIGN KEY (technicien_id)
        REFERENCES utilisateur(id)
) ENGINE=InnoDB;
