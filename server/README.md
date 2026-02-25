# RadioXPlus Server

Serveur Socket.IO + Express pour le chat RadioXPlus.

## Installation

```bash
cd server
npm install
```

## Configuration

Créez un fichier `.env` avec les variables suivantes:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASS=votre_mot_de_passe
DB_NAME=radioxplus
DB_PORT=3306
JWT_SECRET=votre_secret_jwt
NODE_ENV=development
```

## Base de données MySQL

Créez les tables suivantes:

```sql
CREATE DATABASE radioxplus;
USE radioxplus;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'moderator', 'user') DEFAULT 'user',
  avatar TEXT,
  color VARCHAR(20) DEFAULT '#00d9c0',
  age INT,
  gender VARCHAR(20),
  avatarStyle VARCHAR(50),
  textSize VARCHAR(20) DEFAULT 'medium',
  textColor VARCHAR(20) DEFAULT '#ffffff',
  ipAddress VARCHAR(50),
  lastLogin DATETIME,
  online TINYINT DEFAULT 0,
  isBanned TINYINT DEFAULT 0,
  banReason TEXT,
  banExpiry DATETIME,
  kickExpiry DATETIME,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  username VARCHAR(50) NOT NULL,
  content TEXT,
  type VARCHAR(20) DEFAULT 'text',
  url TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted TINYINT DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE room_theme (
  id INT PRIMARY KEY DEFAULT 1,
  roomName VARCHAR(100) DEFAULT 'RadioXPlus Chat',
  messageLimit INT DEFAULT 100,
  maxFileSize INT DEFAULT 5242880,
  autoModeration TINYINT DEFAULT 0,
  bannedWords JSON,
  theme JSON,
  backgroundImage TEXT,
  backgroundOpacity DECIMAL(3,2) DEFAULT 1.00
);

-- Insert default room theme
INSERT INTO room_theme (id, roomName, messageLimit) VALUES (1, 'RadioXPlus Chat', 100);

-- Insert admin user (password: 1234)
INSERT INTO users (username, email, password, role) VALUES ('silver', 'silver@example.com', '1234', 'admin');
```

## Démarrage

```bash
# Développement
npm run dev

# Production
npm start
```

## API Endpoints

- `POST /auth` - Authentification
- `POST /login` - Connexion utilisateur
- `POST /api/register` - Inscription
- `GET /data` - Données du chat
- `POST /api/users/kick` - Kicker un utilisateur
- `POST /api/users/ban` - Bannir un utilisateur
- `POST /api/messages/clear` - Effacer les messages

## Socket.IO Events (Chat - namespace /)

### Client -> Server
- `user_login` - Connexion utilisateur
- `send_message` - Envoyer un message
- `typing` - Indicateur de frappe
- `kick_user` - Kicker
- `ban_user` - Bannir

### Server -> Client
- `new_message` - Nouveau message
- `user_join` - Utilisateur rejoint
- `user_leave` - Utilisateur quitte
- `user_typing` - Quelqu'un écrit
- `user_kicked` - Utilisateur kické
- `user_banned` - Utilisateur banni

## Mediasoup (WebRTC - namespace /media)

Mediasoup est un SFU (Selective Forwarding Unit) pour les appels vidéo/audio en temps réel.

### Configuration

Dans `.env`:
```env
MEDIASOUP_LISTEN_IP=0.0.0.0
MEDIASOUP_ANNOUNCED_IP=votre_ip_publique
MEDIASOUP_MIN_PORT=10000
MEDIASOUP_MAX_PORT=10100
```

**Important**: Ouvrez les ports UDP 10000-10100 sur votre firewall.

### Socket.IO Events (namespace /media)

#### Client -> Server
- `joinRoom` - Rejoindre une room vidéo
- `createTransport` - Créer un transport WebRTC
- `connectTransport` - Connecter le transport
- `produce` - Commencer à envoyer audio/vidéo
- `consume` - Recevoir audio/vidéo d'un autre peer
- `resumeConsumer` - Reprendre la réception
- `pauseProducer` - Mettre en pause l'envoi
- `resumeProducer` - Reprendre l'envoi
- `closeProducer` - Arrêter l'envoi
- `leaveRoom` - Quitter la room

#### Server -> Client
- `newPeer` - Nouveau participant
- `peerLeft` - Participant parti
- `newProducer` - Nouveau flux disponible
- `producerClosed` - Flux fermé
- `producerPaused` - Flux en pause
- `producerResumed` - Flux repris

### API Endpoint
- `GET /api/mediasoup/stats` - Statistiques mediasoup
