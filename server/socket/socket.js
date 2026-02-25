import { connect } from "socket.io-client";

export default function initSocket({ io, data, Connected, userModel, messageModel }) {

  // ✅ Mémoire serveur: qui a la webcam ON (userId en string)
  const usersWithWebcam = new Set();

  io.on('connection', (socket) => {
    console.log('👤 New user connected:', socket.id);
    console.log(Connected)
    socket.on('user_login', async (userId) => {
      //informe user qui entre qui a une cam ouverte 
      socket.emit('webcam_users', Array.from(usersWithWebcam));

      console.log('User login:', userId);
      const user = await userModel.getUserById(userId);
      if (!user) return;

      console.log('User found:', user.username);
      user.online = true;
      user.socket = socket.id;
      socket.idDb = user.id;

      // Éviter doublon
      Connected.splice(0, Connected.length, ...Connected.filter(u => u?.id != user?.id));
      Connected.push(user);

      await userModel.updateUser(user.id, { online: 1 });
      const message = await messageModel.getLastMessages();
     // console.log(message)
      socket.emit('all_messages', message);

      if (data.currentSong) {
        socket.emit('song_update', {
          title: data.currentSong.title || '',
          artist: data.currentSong.artist || '',
          timestamp: new Date().toISOString()
        });
      }

      // ✅ IMPORTANT: snapshot des webcams déjà ON (pour le nouvel arrivant)
      socket.emit('webcam_users', Array.from(usersWithWebcam));

      io.emit('user_join', Connected);
      io.emit('user_join_message', user);
      io.emit('system_message', {
        type: 'join',
        username: user.username,
        timestamp: new Date().toISOString()
      });

      console.log(`✅ User ${user.username} logged in`);
    });

    socket.on('send_message', async (message) => {
      console.log('Message received:', message);

      if (!message?.userId || !message?.username || !message?.content) return;

      // 🔥 Extraction du contenu
      let contentText = null;
      let toUserId = null;
      let toUsername = null;
      let finalType = "text";

      if (typeof message.content === "object") {
        contentText = message.content.text || null;
        toUserId = message.content.toUserId || null;
        toUsername = message.content.toUsername || null;
        finalType = message.content.type || "text";
      } else {
        contentText = message.content;
      }

      const newMessage = {
        id: Date.now(),
        user_id: message.userId,
        username: message.username,
        content: contentText,
        type: finalType,
        avatar: message.avatar,
        color: message.color,
        to_user_id: toUserId,
        to_username: toUsername,
        timestamp: new Date().toISOString()
      };

      // 🔥 Sauvegarde en mémoire
      data.messages.push(newMessage);

      if (data.messages.length > (data.config?.messageLimit || 100)) {
        data.messages.splice(
          0,
          data.messages.length,
          ...data.messages.slice(-(data.config?.messageLimit || 100))
        );
      }

      // 🔥 Sauvegarde DB
      try {
        await messageModel.addMessage({
          user_id: message.userId,
          username: message.username,
          content: {
            text: contentText,
            toUserId,
            toUsername,
            type: finalType
          }
        });
      } catch (err) {
        console.error('Error saving message:', err.message);
      }

      // ===========================
      // 🔒 LOGIQUE MESSAGE PRIVÉ
      // ===========================

      for (const [id, s] of io.sockets.sockets) {
        console.log({
          socketId: id,
          handshake: s.handshake,
          rooms: Array.from(s.rooms),
          userId: s.userId,
          username: s.username
        });
      }


      if (toUserId) {


        // Trouver le socket du destinataire
        const targetSocket = Array.from(io.sockets.sockets.values())
          .find(s => Number(s.idDb) === Number(toUserId));
        if (targetSocket) {
          targetSocket.emit('new_message', newMessage);
        }

        // renvoyer aussi au sender
        socket.emit('new_message', newMessage);

      } else {
        // 🌍 message public
        io.emit('new_message', newMessage);
      }
    });


    socket.on('send_media', async (mediaData) => {
      const newMessage = {
        id: Date.now(),
        userId: mediaData.userId,
        username: mediaData.username,
        type: mediaData.type,
        url: mediaData.url,
        timestamp: new Date().toISOString()
      };

      data.messages.push(newMessage);

      if (data.messages.length > (data.config?.messageLimit || 100)) {
        data.messages.splice(0, data.messages.length, ...data.messages.slice(-(data.config?.messageLimit || 100)));
      }

      try {
        await messageModel.addMessage({
          user_id: mediaData.userId,
          username: mediaData.username,
          content: mediaData.url,
          type: mediaData.type
        });
      } catch (err) {
        console.error('Error saving media:', err.message);
      }

      io.emit('new_message', newMessage);
    });

    socket.on('clear_chat', async (userId) => {
      const user = await userModel.getUserById(userId);
      if (!user || (user.role !== 'admin' && user.role !== 'moderator')) return;

      data.messages.splice(0, data.messages.length);
      await messageModel.clearMessages?.();

      io.emit('chat_cleared');
    });

    socket.on("typing", (payload = {}) => {
      socket.broadcast.emit("user_typing", payload);
    });

    socket.on("stop_typing", (payload = {}) => {
      socket.broadcast.emit("stop_typing", payload);
    });

    // ============================================
    // WEBCAM EVENTS
    // ============================================
    socket.on('webcam_start', (payload) => {
      if (!payload?.userId) return;

      usersWithWebcam.add(String(payload.userId));

      socket.broadcast.emit('webcam_started', {
        userId: String(payload.userId),
        username: payload.username,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('webcam_stop', (payload) => {
      if (!payload?.userId) return;

      usersWithWebcam.delete(String(payload.userId));

      socket.broadcast.emit('webcam_stopped', {
        userId: String(payload.userId),
        username: payload.username,
        timestamp: new Date().toISOString()
      });
    });
    socket.on('update_song', (songData) => {
      data.currentSong = {
        title: songData.title || '',
        artist: songData.artist || ''
      };

      io.emit('song_update', {
        title: data.currentSong.title,
        artist: data.currentSong.artist,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('kick_user', async ({ userId, reason }) => {
      const user = await userModel.getUserById(userId);
      if (user) {
        io.emit('user_kicked', { userId, username: user.username, reason, timestamp: new Date().toISOString() });
        Connected.splice(0, Connected.length, ...Connected.filter(u => u?.id != userId));

        // ✅ si kick -> webcam off aussi
        usersWithWebcam.delete(String(userId));

        io.emit('users_updated', Connected);
      }
    });

    socket.on('ban_user', async ({ userId, reason }) => {
      const user = await userModel.getUserById(userId);
      if (user) {
        await userModel.updateUser(userId, { isBanned: 1, banReason: reason });
        io.emit('user_banned', { userId, username: user.username, reason, timestamp: new Date().toISOString() });
        Connected.splice(0, Connected.length, ...Connected.filter(u => u?.id != userId));

        // ✅ si ban -> webcam off aussi
        usersWithWebcam.delete(String(userId));

        io.emit('users_updated', Connected);
      }
    });

    // ============================================
    // PRIVATE MESSAGE EVENTS
    // ============================================
    socket.on('private_message', async (payload) => {
      console.log('📩 Private message:', payload);
      const { toUserId, content, type = 'text' } = payload;

      if (!socket.idDb || !toUserId || !content) return;

      const fromUser = await userModel.getUserById(socket.idDb);
      if (!fromUser) return;

      const toUser = Connected.find(u => String(u?.id) === String(toUserId));

      const privateMsg = {
        id: `pm-${Date.now()}`,
        fromUserId: socket.idDb,
        fromUsername: fromUser.username,
        fromAvatar: fromUser.avatar,
        toUserId: toUserId,
        content: content,
        type: type,
        timestamp: new Date().toISOString()
      };

      // Send to recipient if online
      if (toUser && toUser.socket) {
        io.to(toUser.socket).emit('private_message_received', privateMsg);
      }

      // Confirm to sender
      socket.emit('private_message_sent', privateMsg);

      console.log(`💬 Private message from ${fromUser.username} to user ${toUserId}`);
    });

    socket.on('private_typing', (payload) => {
      const { toUserId } = payload;
      const toUser = Connected.find(u => String(u.id) === String(toUserId));
      if (toUser && toUser.socket) {
        io.to(toUser.socket).emit('private_typing', {
          fromUserId: socket.idDb,
          fromUsername: payload.fromUsername
        });
      }
    });

    socket.on('private_stop_typing', (payload) => {
      const { toUserId } = payload;
      const toUser = Connected.find(u => String(u?.id) === String(toUserId));
      if (toUser && toUser.socket) {
        io.to(toUser.socket).emit('private_stop_typing', {
          fromUserId: socket.idDb
        });
      }
    });

    socket.on('disconnect', async () => {
      try {
        const userId = socket.idDb;
        console.log('User disconnecting:', userId);
        if (!userId) return;

        // Retire de Connected
        Connected.splice(0, Connected.length, ...Connected.filter(u => u?.id != userId));

        // ✅ Webcam off + broadcast si elle était ON
        const wasWebcamOn = usersWithWebcam.has(String(userId));
        usersWithWebcam.delete(String(userId));

        await userModel.updateUser(userId, { online: 0 });

        const userDb = await userModel.getUserById(userId);

        // ✅ Important : avertir les autres si webcam était ON
        if (wasWebcamOn) {
          socket.broadcast.emit('webcam_stopped', {
            userId: String(userId),
            username: userDb?.username || '',
            timestamp: new Date().toISOString()
          });
        }

        if (userDb) {
          io.emit('system_message', {
            type: 'leave',
            username: userDb.username,
            timestamp: new Date().toISOString()
          });

          io.emit('user_leave', {
            id: userDb.id,
            username: userDb.username,
            timestamp: new Date().toISOString()
          });
        }

        io.emit('users_updated', Connected);
        console.log(`👋 User disconnected id=${userId}`);
      } catch (err) {
        console.error("Disconnect error:", err);
      }
    });


  });
};
