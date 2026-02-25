// ============================================
// MEDIASOUP SERVICE
// Gestion des Workers, Routers, Transports, Producers, Consumers
// ============================================

import mediasoup from "mediasoup";
import config from "../config/mediasoup.config.js";


class MediasoupService {
  constructor() {
    // Workers array
    this.workers = [];
    this.nextWorkerIdx = 0;

    // Rooms map: roomId -> { router, peers }
    this.rooms = new Map();

    // Peers map: peerId -> { transports, producers, consumers, roomId }
    this.peers = new Map();
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  async init() {
    console.log('🎬 Initializing Mediasoup...');

    const { numWorkers } = config;

    for (let i = 0; i < numWorkers; i++) {
      const worker = await this.createWorker();
      this.workers.push(worker);
    }

    console.log(`✅ Mediasoup initialized with ${this.workers.length} workers`);
  }

  async createWorker() {
    const worker = await mediasoup.createWorker({
      logLevel: config.worker.logLevel,
      logTags: config.worker.logTags,
      rtcMinPort: config.worker.rtcMinPort,
      rtcMaxPort: config.worker.rtcMaxPort,
    });

    worker.on('died', (error) => {
      console.error('❌ Mediasoup worker died:', error);
      // Restart worker after a delay
      setTimeout(async () => {
        const idx = this.workers.indexOf(worker);
        if (idx !== -1) {
          this.workers[idx] = await this.createWorker();
          console.log('✅ Worker restarted');
        }
      }, 2000);
    });

    console.log(`✅ Worker created (pid: ${worker.pid})`);
    return worker;
  }

  getNextWorker() {
    const worker = this.workers[this.nextWorkerIdx];
    this.nextWorkerIdx = (this.nextWorkerIdx + 1) % this.workers.length;
    return worker;
  }

  // ============================================
  // ROOM MANAGEMENT
  // ============================================

  async getOrCreateRoom(roomId) {
    let room = this.rooms.get(roomId);

    if (!room) {
      console.log(`📺 Creating room: ${roomId}`);
      const worker = this.getNextWorker();
      const router = await worker.createRouter({
        mediaCodecs: config.router.mediaCodecs,
      });

      room = {
        id: roomId,
        router,
        peers: new Map(),
      };

      this.rooms.set(roomId, room);
      console.log(`✅ Room created: ${roomId}`);
    }

    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  closeRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.router.close();
      this.rooms.delete(roomId);
      console.log(`🗑️ Room closed: ${roomId}`);
    }
  }

  // ============================================
  // PEER MANAGEMENT
  // ============================================

  async joinRoom(roomId, peerId, socketId) {
    const room = await this.getOrCreateRoom(roomId);

    // Create peer entry
    const peer = {
      id: peerId,
      socketId,
      roomId,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
    };

    this.peers.set(peerId, peer);
    room.peers.set(peerId, peer);

    console.log(`👤 Peer ${peerId} joined room ${roomId}`);

    return {
      rtpCapabilities: room.router.rtpCapabilities,
    };
  }

  leavePeer(peerId) {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    // Close all transports (this also closes producers and consumers)
    for (const transport of peer.transports.values()) {
      transport.close();
    }

    // Remove from room
    const room = this.rooms.get(peer.roomId);
    if (room) {
      room.peers.delete(peerId);

      // If room is empty, close it
      if (room.peers.size === 0) {
        this.closeRoom(peer.roomId);
      }
    }

    this.peers.delete(peerId);
    console.log(`👋 Peer ${peerId} left`);
  }

  getPeer(peerId) {
    return this.peers.get(peerId);
  }

  // ============================================
  // TRANSPORT MANAGEMENT
  // ============================================

  async createWebRtcTransport(peerId) {
    const peer = this.peers.get(peerId);
    if (!peer) throw new Error('Peer not found');

    const room = this.rooms.get(peer.roomId);
    if (!room) throw new Error('Room not found');

    const transport = await room.router.createWebRtcTransport({
      listenIps: config.webRtcTransport.listenIps,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: config.webRtcTransport.initialAvailableOutgoingBitrate,
    });

    transport.on('dtlsstatechange', (dtlsState) => {
      if (dtlsState === 'closed') {
        transport.close();
      }
    });

    transport.on('close', () => {
      console.log(`🔌 Transport closed for peer ${peerId}`);
    });

    peer.transports.set(transport.id, transport);

    console.log(`🔌 WebRTC Transport created for peer ${peerId}: ${transport.id}`);

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  async connectTransport(peerId, transportId, dtlsParameters) {
    const peer = this.peers.get(peerId);
    if (!peer) throw new Error('Peer not found');

    const transport = peer.transports.get(transportId);
    if (!transport) throw new Error('Transport not found');

    await transport.connect({ dtlsParameters });

    console.log(`✅ Transport connected for peer ${peerId}: ${transportId}`);
  }

  // ============================================
  // PRODUCER MANAGEMENT (Sending media)
  // ============================================

  async produce(peerId, transportId, kind, rtpParameters, appData = {}) {
    const peer = this.peers.get(peerId);
    if (!peer) throw new Error('Peer not found');

    const transport = peer.transports.get(transportId);
    if (!transport) throw new Error('Transport not found');

    const producer = await transport.produce({
      kind,
      rtpParameters,
      appData: { ...appData, peerId },
    });

    producer.on('transportclose', () => {
      producer.close();
      peer.producers.delete(producer.id);
    });

    peer.producers.set(producer.id, producer);

    console.log(`📤 Producer created for peer ${peerId}: ${producer.id} (${kind})`);

    return {
      id: producer.id,
    };
  }

  async closeProducer(peerId, producerId) {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    const producer = peer.producers.get(producerId);
    if (producer) {
      producer.close();
      peer.producers.delete(producerId);
      console.log(`🔇 Producer closed: ${producerId}`);
    }
  }

  async pauseProducer(peerId, producerId) {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    const producer = peer.producers.get(producerId);
    if (producer) {
      await producer.pause();
      console.log(`⏸️ Producer paused: ${producerId}`);
    }
  }

  async resumeProducer(peerId, producerId) {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    const producer = peer.producers.get(producerId);
    if (producer) {
      await producer.resume();
      console.log(`▶️ Producer resumed: ${producerId}`);
    }
  }

  // ============================================
  // CONSUMER MANAGEMENT (Receiving media)
  // ============================================

  async consume(peerId, producerId, rtpCapabilities) {
    const peer = this.peers.get(peerId);
    if (!peer) throw new Error('Peer not found');

    const room = this.rooms.get(peer.roomId);
    if (!room) throw new Error('Room not found');

    // Find the producer
    let producer = null;
    let producerPeerId = null;

    for (const [pId, p] of room.peers) {
      if (p.producers.has(producerId)) {
        producer = p.producers.get(producerId);
        producerPeerId = pId;
        break;
      }
    }

    if (!producer) throw new Error('Producer not found');

    // Check if the router can consume
    if (!room.router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error('Cannot consume this producer');
    }

    // Get consumer transport (first transport that is not the producer's)
    let consumerTransport = null;
    for (const transport of peer.transports.values()) {
      consumerTransport = transport;
      break;
    }

    if (!consumerTransport) throw new Error('No transport found for consuming');

    const consumer = await consumerTransport.consume({
      producerId,
      rtpCapabilities,
      paused: true, // Start paused, client will resume
    });

    consumer.on('transportclose', () => {
      consumer.close();
      peer.consumers.delete(consumer.id);
    });

    consumer.on('producerclose', () => {
      consumer.close();
      peer.consumers.delete(consumer.id);
    });

    peer.consumers.set(consumer.id, consumer);

    console.log(`📥 Consumer created for peer ${peerId}: ${consumer.id}`);

    return {
      id: consumer.id,
      producerId,
      producerPeerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      appData: producer.appData,
    };
  }

  async resumeConsumer(peerId, consumerId) {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    const consumer = peer.consumers.get(consumerId);
    if (consumer) {
      await consumer.resume();
      console.log(`▶️ Consumer resumed: ${consumerId}`);
    }
  }

  async pauseConsumer(peerId, consumerId) {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    const consumer = peer.consumers.get(consumerId);
    if (consumer) {
      await consumer.pause();
      console.log(`⏸️ Consumer paused: ${consumerId}`);
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  getRoomPeers(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    return Array.from(room.peers.keys());
  }

  getPeerProducers(peerId) {
    const peer = this.peers.get(peerId);
    if (!peer) return [];

    return Array.from(peer.producers.values()).map((p) => ({
      id: p.id,
      kind: p.kind,
      appData: p.appData,
    }));
  }

  getRoomProducers(roomId, excludePeerId = null) {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    const producers = [];

    for (const [peerId, peer] of room.peers) {
      if (peerId === excludePeerId) continue;

      for (const producer of peer.producers.values()) {
        producers.push({
          producerId: producer.id,
          peerId,
          kind: producer.kind,
          appData: producer.appData,
        });
      }
    }

    return producers;
  }

  getStats() {
    return {
      workers: this.workers.length,
      rooms: this.rooms.size,
      peers: this.peers.size,
      roomDetails: Array.from(this.rooms.entries()).map(([id, room]) => ({
        id,
        peers: room.peers.size,
      })),
    };
  }
}

// Singleton instance
const mediasoupService = new MediasoupService();

export default mediasoupService;

