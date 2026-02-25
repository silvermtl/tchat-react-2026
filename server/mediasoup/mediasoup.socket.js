// ============================================
// MEDIASOUP SOCKET HANDLER
// Gestion des événements Socket.IO pour WebRTC
// ============================================

import mediasoupService from "./mediasoup.service.js";


// Safe callback wrapper
const safeCallback = (callback, data) => {
  if (typeof callback === 'function') {
    callback(data);
  }
};

export default function initMediasoupSocket(io) {
  // Namespace for mediasoup
  const mediaNamespace = io.of('/media');

  mediaNamespace.on('connection', (socket) => {
    console.log('🎥 Media socket connected:', socket.id);

    let peerId = null;
    let roomId = null;

    // ============================================
    // JOIN ROOM
    // ============================================
    socket.on('joinRoom', async (data, callback) => {
      try {
        peerId = data.peerId || socket.id;
        roomId = data.roomId || 'default-room';

        const result = await mediasoupService.joinRoom(roomId, peerId, socket.id);

        socket.join(roomId);

        // Notify others in the room
        socket.to(roomId).emit('newPeer', { peerId });

        // Get existing producers in the room
        const existingProducers = mediasoupService.getRoomProducers(roomId, peerId);

        safeCallback(callback, {
          success: true,
          rtpCapabilities: result.rtpCapabilities,
          existingProducers,
        });

        console.log(`✅ Peer ${peerId} joined media room ${roomId}`);
      } catch (error) {
        console.error('joinRoom error:', error);
        safeCallback(callback, { success: false, error: error.message });
      }
    });

    // ============================================
    // CREATE TRANSPORT
    // ============================================
    socket.on('createTransport', async (data, callback) => {
      try {
        if (!peerId) throw new Error('Not joined to a room');

        const transport = await mediasoupService.createWebRtcTransport(peerId);

        safeCallback(callback, {
          success: true,
          ...transport,
        });
      } catch (error) {
        console.error('createTransport error:', error);
        safeCallback(callback, { success: false, error: error.message });
      }
    });

    // ============================================
    // CONNECT TRANSPORT
    // ============================================
    socket.on('connectTransport', async (data, callback) => {
      try {
        if (!peerId) throw new Error('Not joined to a room');

        await mediasoupService.connectTransport(
          peerId,
          data.transportId,
          data.dtlsParameters
        );

        safeCallback(callback, { success: true });
      } catch (error) {
        console.error('connectTransport error:', error);
        safeCallback(callback, { success: false, error: error.message });
      }
    });

    // ============================================
    // PRODUCE (Start sending media)
    // ============================================
    socket.on('produce', async (data, callback) => {
      try {
        if (!peerId) throw new Error('Not joined to a room');

        const producer = await mediasoupService.produce(
          peerId,
          data.transportId,
          data.kind,
          data.rtpParameters,
          data.appData || {}
        );

        // Notify others about new producer
        socket.to(roomId).emit('newProducer', {
          producerId: producer.id,
          peerId,
          kind: data.kind,
          appData: data.appData,
        });

        safeCallback(callback, {
          success: true,
          producerId: producer.id,
        });

        console.log(`📤 Peer ${peerId} started producing ${data.kind}`);
      } catch (error) {
        console.error('produce error:', error);
        safeCallback(callback, { success: false, error: error.message });
      }
    });

    // ============================================
    // CONSUME (Start receiving media)
    // ============================================
    socket.on('consume', async (data, callback) => {
      try {
        if (!peerId) throw new Error('Not joined to a room');

        const consumer = await mediasoupService.consume(
          peerId,
          data.producerId,
          data.rtpCapabilities
        );

        safeCallback(callback, {
          success: true,
          ...consumer,
        });

        console.log(`📥 Peer ${peerId} consuming producer ${data.producerId}`);
      } catch (error) {
        console.error('consume error:', error);
        safeCallback(callback, { success: false, error: error.message });
      }
    });

    // ============================================
    // RESUME CONSUMER
    // ============================================
    socket.on('resumeConsumer', async (data, callback) => {
      try {
        if (!peerId) throw new Error('Not joined to a room');

        await mediasoupService.resumeConsumer(peerId, data.consumerId);

        safeCallback(callback, { success: true });
      } catch (error) {
        console.error('resumeConsumer error:', error);
        safeCallback(callback, { success: false, error: error.message });
      }
    });

    // ============================================
    // PAUSE CONSUMER
    // ============================================
    socket.on('pauseConsumer', async (data, callback) => {
      try {
        if (!peerId) throw new Error('Not joined to a room');

        await mediasoupService.pauseConsumer(peerId, data.consumerId);

        safeCallback(callback, { success: true });
      } catch (error) {
        console.error('pauseConsumer error:', error);
        safeCallback(callback, { success: false, error: error.message });
      }
    });

    // ============================================
    // PAUSE/RESUME PRODUCER
    // ============================================
    socket.on('pauseProducer', async (data, callback) => {
      try {
        if (!peerId) throw new Error('Not joined to a room');

        await mediasoupService.pauseProducer(peerId, data.producerId);

        socket.to(roomId).emit('producerPaused', {
          producerId: data.producerId,
          peerId,
        });

        safeCallback(callback, { success: true });
      } catch (error) {
        console.error('pauseProducer error:', error);
        safeCallback(callback, { success: false, error: error.message });
      }
    });

    socket.on('resumeProducer', async (data, callback) => {
      try {
        if (!peerId) throw new Error('Not joined to a room');

        await mediasoupService.resumeProducer(peerId, data.producerId);

        socket.to(roomId).emit('producerResumed', {
          producerId: data.producerId,
          peerId,
        });

        safeCallback(callback, { success: true });
      } catch (error) {
        console.error('resumeProducer error:', error);
        safeCallback(callback, { success: false, error: error.message });
      }
    });

    // ============================================
    // CLOSE PRODUCER
    // ============================================
    socket.on('closeProducer', async (data, callback) => {
      try {
        if (!peerId) throw new Error('Not joined to a room');

        await mediasoupService.closeProducer(peerId, data.producerId);

        socket.to(roomId).emit('producerClosed', {
          producerId: data.producerId,
          peerId,
        });

        safeCallback(callback, { success: true });
        console.log(`🔇 Peer ${peerId} closed producer ${data.producerId}`);
      } catch (error) {
        console.error('closeProducer error:', error);
        safeCallback(callback, { success: false, error: error.message });
      }
    });

    // ============================================
    // GET ROOM PEERS
    // ============================================
    socket.on('getRoomPeers', (data, callback) => {
      try {
        const peers = mediasoupService.getRoomPeers(roomId || data?.roomId);
        safeCallback(callback, { success: true, peers });
      } catch (error) {
        safeCallback(callback, { success: false, error: error.message });
      }
    });

    // ============================================
    // GET ROOM PRODUCERS
    // ============================================
    socket.on('getRoomProducers', (data, callback) => {
      try {
        const producers = mediasoupService.getRoomProducers(
          roomId || data?.roomId,
          peerId
        );
        safeCallback(callback, { success: true, producers });
      } catch (error) {
        safeCallback(callback, { success: false, error: error.message });
      }
    });

    // ============================================
    // GET PEER PRODUCERS (for on-demand consumption)
    // ============================================
    socket.on('getPeerProducers', (data, callback) => {
      try {
        const targetPeerId = data?.peerId;
        if (!targetPeerId) {
          throw new Error('peerId is required');
        }

        const producers = mediasoupService.getPeerProducers(targetPeerId);

        // Format producers with peerId
        const formattedProducers = producers.map(p => ({
          producerId: p.id,
          peerId: targetPeerId,
          kind: p.kind,
          appData: p.appData,
        }));

        console.log(`📹 getPeerProducers for ${targetPeerId}:`, formattedProducers.length, 'producers');

        safeCallback(callback, { success: true, producers: formattedProducers });
      } catch (error) {
        console.error('getPeerProducers error:', error);
        safeCallback(callback, { success: false, error: error.message });
      }
    });

    // ============================================
    // GET ROUTER RTP CAPABILITIES
    // ============================================
    socket.on('getRouterRtpCapabilities', (data, callback) => {
      try {
        const room = mediasoupService.getRoom(roomId || data?.roomId);
        if (!room) {
          throw new Error('Room not found');
        }
        safeCallback(callback, {
          success: true,
          rtpCapabilities: room.router.rtpCapabilities
        });
      } catch (error) {
        safeCallback(callback, { success: false, error: error.message });
      }
    });

    // ============================================
    // DISCONNECT
    // ============================================
    socket.on('disconnect', () => {
      console.log('🎥 Media socket disconnected:', socket.id);

      if (peerId) {
        // Get producers before cleanup to notify others
        const peerData = mediasoupService.getPeer(peerId);
        if (peerData && peerData.producers) {
          for (const producerId of peerData.producers.keys()) {
            socket.to(roomId).emit('producerClosed', {
              producerId,
              peerId,
            });
          }
        }

        // Notify others
        if (roomId) {
          socket.to(roomId).emit('peerLeft', { peerId });
        }

        // Cleanup
        mediasoupService.leavePeer(peerId);
      }
    });

    // ============================================
    // LEAVE ROOM (manual)
    // ============================================
    socket.on('leaveRoom', (callback) => {
      if (peerId) {
        // Get producers before cleanup to notify others
        const peerData = mediasoupService.getPeer(peerId);
        if (peerData && peerData.producers) {
          for (const producerId of peerData.producers.keys()) {
            socket.to(roomId).emit('producerClosed', {
              producerId,
              peerId,
            });
          }
        }

        if (roomId) {
          socket.to(roomId).emit('peerLeft', { peerId });
          socket.leave(roomId);
        }

        mediasoupService.leavePeer(peerId);
        peerId = null;
        roomId = null;
      }

      safeCallback(callback, { success: true });
    });

    // ============================================
    // PING (for keeping connection alive)
    // ============================================
    socket.on('ping', (callback) => {
      safeCallback(callback, { success: true, timestamp: Date.now() });
    });
  });

  console.log('✅ Mediasoup socket handler initialized on /media namespace');

  return mediaNamespace;
}

