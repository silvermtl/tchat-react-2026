-- ============================================
-- RADIOXPLUS CHAT - SCRIPT D'INITIALISATION MySQL
-- ============================================
-- Exécuter ce script pour créer la base de données et les tables
-- mysql -u root -p < init-db.sql

-- Créer la base de données
CREATE DATABASE IF NOT EXISTS radioxplus
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE radioxplus;

-- ============================================
-- TABLE: users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  age INT DEFAULT NULL,
  gender ENUM('homme', 'femme', 'autre') DEFAULT NULL,
  role ENUM('utilisateur', 'moderator', 'admin') DEFAULT 'utilisateur',
  avatar VARCHAR(500) DEFAULT NULL,
  avatarUrl VARCHAR(500) DEFAULT NULL,
  color VARCHAR(20) DEFAULT '#ffffff',
  ipAddress VARCHAR(45) DEFAULT NULL,
  online TINYINT(1) DEFAULT 0,
  isBanned TINYINT(1) DEFAULT 0,
  banReason VARCHAR(255) DEFAULT NULL,
  banExpiry DATETIME DEFAULT NULL,
  kickExpiry DATETIME DEFAULT NULL,
  lastSeen DATETIME DEFAULT NULL,
  lastLogin DATETIME DEFAULT NULL,
  resetToken VARCHAR(64) DEFAULT NULL,
  resetTokenExpiry DATETIME DEFAULT NULL,
  textSize VARCHAR(20) DEFAULT 'medium',
  textColor VARCHAR(20) DEFAULT '#ffffff',
  avatarStyle VARCHAR(50) DEFAULT 'gradient-default',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_online (online),
  INDEX idx_reset_token (resetToken)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ALTER TABLE pour bases existantes
-- ============================================
-- Si la table users existe déjà, ajouter les nouvelles colonnes
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS resetToken VARCHAR(64) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS resetTokenExpiry DATETIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS banExpiry DATETIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS kickExpiry DATETIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lastLogin DATETIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS textSize VARCHAR(20) DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS textColor VARCHAR(20) DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS avatarStyle VARCHAR(50) DEFAULT 'gradient-default';

-- ============================================
-- TABLE: messages
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  username VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  type ENUM('text', 'image', 'gif', 'audio', 'video') DEFAULT 'text',
  room_id INT DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_room_id (room_id),
  INDEX idx_created (createdAt),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: private_messages
-- ============================================
CREATE TABLE IF NOT EXISTS private_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_user_id INT NOT NULL,
  to_user_id INT NOT NULL,
  content TEXT NOT NULL,
  type ENUM('text', 'image', 'gif', 'audio') DEFAULT 'text',
  isRead TINYINT(1) DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_from_user (from_user_id),
  INDEX idx_to_user (to_user_id),
  INDEX idx_conversation (from_user_id, to_user_id),
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: rooms
-- ============================================
CREATE TABLE IF NOT EXISTS rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT DEFAULT NULL,
  isPrivate TINYINT(1) DEFAULT 0,
  password VARCHAR(255) DEFAULT NULL,
  createdBy INT DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: room_users (relation many-to-many)
-- ============================================
CREATE TABLE IF NOT EXISTS room_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('member', 'moderator', 'admin') DEFAULT 'member',
  joinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_room_user (room_id, user_id),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DONNÉES INITIALES
-- ============================================

-- Créer un utilisateur admin par défaut (mot de passe: 1234)
INSERT INTO users (username, email, password, role, color, online)
VALUES ('silver', 'silver@radioxplus.com', '1234', 'admin', '#00d9c0', 0)
ON DUPLICATE KEY UPDATE username = username;

-- Créer quelques utilisateurs de test
INSERT INTO users (username, email, password, role, color, online)
VALUES
  ('john', 'john@example.com', '1234', 'utilisateur', '#ff6b6b', 0),
  ('marie', 'marie@example.com', '1234', 'utilisateur', '#4ecdc4', 0)
ON DUPLICATE KEY UPDATE username = username;

-- Créer le salon principal
INSERT INTO rooms (name, description, isPrivate, createdBy)
VALUES ('Général', 'Salon principal de RadioXPlus', 0, 1)
ON DUPLICATE KEY UPDATE name = name;

-- Message de bienvenue
INSERT INTO messages (user_id, username, content, type)
VALUES (1, 'silver', 'Bienvenue sur le tchat RadioXPlus!', 'text');

SELECT 'Base de données radioxplus initialisée avec succès!' AS status;
