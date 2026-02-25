import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import type { types as mediasoupTypes } from 'mediasoup-client';
import config from '../config/env';

type Device = mediasoupTypes.Device;
type Transport = mediasoupTypes.Transport;
type Producer = mediasoupTypes.Producer;
type Consumer = mediasoupTypes.Consumer;

// URL du serveur MediaSoup (depuis la config centralisée)
const SOCKET_URL = config.socketUrl;

interface PeerProducer {
  producerId: string;
  peerId: string;
  kind: 'audio' | 'video';
  appData?: Record<string, unknown>;
}

interface MediasoupContextType {
  // État
  isMediaConnected: boolean;
  isMediaJoined: boolean;
  mediaError: string | null;
  remoteStreams: Map<string, MediaStream>;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  isProducing: boolean;
  isScreenSharing: boolean;
  producerCount: number;
  consumerCount: number;

  // Actions
  connectMedia: () => Promise<void>;
  joinMediaRoom: (roomId: string, peerId: string) => Promise<void>;
  startProducing: (stream: MediaStream) => Promise<void>;
  stopProducing: () => void;
  startScreenShare: () => Promise<MediaStream | null>;
  stopScreenShare: () => void;
  leaveMediaRoom: () => void;
  disconnectMedia: () => void;
  pauseProducer: (kind: 'audio' | 'video') => void;
  resumeProducer: (kind: 'audio' | 'video') => void;
  requestPeerStream: (peerId: string) => Promise<MediaStream | null>;

  // Helpers
  getRemoteStream: (peerId: string) => MediaStream | undefined;
  getPeersWithVideo: () => string[];
}

const MediasoupContext = createContext<MediasoupContextType | undefined>(undefined);

export function MediasoupProvider({ children }: { children: ReactNode }) {
  const [isMediaConnected, setIsMediaConnected] = useState(false);
  const [isMediaJoined, setIsMediaJoined] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isProducing, setIsProducing] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [producerCount, setProducerCount] = useState(0);
  const [consumerCount, setConsumerCount] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<Transport | null>(null);
  const recvTransportRef = useRef<Transport | null>(null);
  const producersRef = useRef<Map<string, Producer>>(new Map());
  const screenProducersRef = useRef<Map<string, Producer>>(new Map());
  const consumersRef = useRef<Map<string, Consumer>>(new Map());
  const currentRoomRef = useRef<string | null>(null);
  const currentPeerIdRef = useRef<string | null>(null);

  // ============================================
  // CONSUME PRODUCER
  // ============================================
  const consumeProducer = useCallback(async (producerId: string, remotePeerId: string) => {
    console.log(`📥 consumeProducer called: producerId=${producerId}, remotePeerId=${remotePeerId}`);

    if (!socketRef.current || !deviceRef.current) {
      console.error('❌ Socket or device not available');
      return null;
    }

    // Create recv transport if needed
    if (!recvTransportRef.current) {
      console.log('🔌 No recv transport, creating one...');
      await createRecvTransport();
    }

    if (!recvTransportRef.current) {
      console.error('❌ No recv transport available');
      return null;
    }

    return new Promise<Consumer | null>((resolve) => {
      socketRef.current?.emit('consume', {
        producerId,
        rtpCapabilities: deviceRef.current?.rtpCapabilities,
      }, async (response: {
        success: boolean;
        id?: string;
        producerId?: string;
        kind?: 'audio' | 'video';
        rtpParameters?: unknown;
        error?: string;
      }) => {
        console.log('📥 Consume response:', { success: response.success, kind: response.kind, error: response.error });

        if (!response.success || !response.id) {
          console.error('❌ Failed to consume:', response.error);
          resolve(null);
          return;
        }

        try {
          const consumer = await recvTransportRef.current?.consume({
            id: response.id,
            producerId: response.producerId ?? '',
            kind: response.kind ?? 'video',
            rtpParameters: response.rtpParameters as never,
          });

          if (consumer) {
            console.log(`✅ Consumer created: ${consumer.id} (${response.kind})`);

            // Resume consumer
            socketRef.current?.emit('resumeConsumer', { consumerId: consumer.id });

            // Add track to remote stream
            consumersRef.current.set(producerId, consumer);
            setConsumerCount(consumersRef.current.size);

            setRemoteStreams(prev => {
              const newMap = new Map(prev);
              let remoteStream = newMap.get(remotePeerId);
              if (!remoteStream) {
                remoteStream = new MediaStream();
                console.log(`🆕 Created new MediaStream for peer ${remotePeerId}`);
              }
              remoteStream.addTrack(consumer.track);
              console.log(`➕ Added ${response.kind} track to stream for peer ${remotePeerId}. Total tracks: ${remoteStream.getTracks().length}`);
              newMap.set(remotePeerId, remoteStream);
              return newMap;
            });

            console.log(`📥 Consuming ${response.kind} from peer ${remotePeerId}`);
            resolve(consumer);
          } else {
            console.error('❌ Consumer is null');
            resolve(null);
          }
        } catch (err) {
          console.error('❌ Consume error:', err);
          resolve(null);
        }
      });
    });
  }, []);

  // ============================================
  // CREATE RECV TRANSPORT
  // ============================================
  const createRecvTransport = useCallback(async () => {
    if (!socketRef.current || !deviceRef.current) return null;

    return new Promise<Transport | null>((resolve) => {
      socketRef.current?.emit('createTransport', {}, async (response: {
        success: boolean;
        id?: string;
        iceParameters?: unknown;
        iceCandidates?: unknown;
        dtlsParameters?: unknown;
        error?: string;
      }) => {
        if (!response.success || !response.id) {
          console.error('Failed to create recv transport:', response.error);
          resolve(null);
          return;
        }

        const transport = deviceRef.current?.createRecvTransport({
          id: response.id,
          iceParameters: response.iceParameters as never,
          iceCandidates: response.iceCandidates as never,
          dtlsParameters: response.dtlsParameters as never,
        });

        if (transport) {
          transport.on('connect', ({ dtlsParameters }, callback, errback) => {
            socketRef.current?.emit('connectTransport', {
              transportId: transport.id,
              dtlsParameters,
            }, (res: { success: boolean; error?: string }) => {
              if (res.success) callback();
              else errback(new Error(res.error));
            });
          });

          recvTransportRef.current = transport;
          console.log('✅ Recv transport created');
        }

        resolve(transport || null);
      });
    });
  }, []);

  // ============================================
  // CONNECT TO MEDIA SERVER
  // ============================================
  const connectMedia = useCallback(async () => {
    try {
      // Dynamically import mediasoup-client
      const { Device } = await import('mediasoup-client');

      const socket = io(`${SOCKET_URL}/media`, {
        transports: ['websocket', 'polling'],
      });

      socketRef.current = socket;

      // Connection events
      socket.on('connect', () => {
        console.log('🎥 Media socket connected');
        setIsMediaConnected(true);
        setMediaError(null);
      });

      socket.on('disconnect', () => {
        console.log('🎥 Media socket disconnected');
        setIsMediaConnected(false);
        setIsMediaJoined(false);
      });

      socket.on('connect_error', (err) => {
        console.error('🎥 Media socket error:', err.message);
        setMediaError(err.message);
      });

      // Handle new producer from another peer
      socket.on('newProducer', async (data: PeerProducer) => {
        console.log('📥 New producer available:', data);
        await consumeProducer(data.producerId, data.peerId);
      });

      // Handle producer closed
      socket.on('producerClosed', (data: { producerId: string; peerId: string }) => {
        console.log('📤 Producer closed:', data);
        const consumer = consumersRef.current.get(data.producerId);
        if (consumer) {
          consumer.close();
          consumersRef.current.delete(data.producerId);

          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            // Check if peer has any remaining tracks
            const peerStream = newMap.get(data.peerId);
            if (peerStream && peerStream.getTracks().length === 0) {
              newMap.delete(data.peerId);
            }
            return newMap;
          });
        }
      });

      // Handle producer paused
      socket.on('producerPaused', (data: { producerId: string; peerId: string }) => {
        console.log('⏸️ Producer paused:', data);
        const consumer = consumersRef.current.get(data.producerId);
        if (consumer) {
          consumer.pause();
        }
      });

      // Handle producer resumed
      socket.on('producerResumed', (data: { producerId: string; peerId: string }) => {
        console.log('▶️ Producer resumed:', data);
        const consumer = consumersRef.current.get(data.producerId);
        if (consumer) {
          consumer.resume();
        }
      });

      // Handle peer left
      socket.on('peerLeft', (data: { peerId: string }) => {
        console.log('👋 Media peer left:', data.peerId);
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.peerId);
          return newMap;
        });

        // Clean up consumers for this peer
        for (const [producerId, consumer] of consumersRef.current.entries()) {
          if (consumer.appData?.peerId === data.peerId) {
            consumer.close();
            consumersRef.current.delete(producerId);
          }
        }
      });

      // Handle new peer joining
      socket.on('newPeer', (data: { peerId: string }) => {
        console.log('👤 New peer joined media room:', data.peerId);
      });

      // Create device
      deviceRef.current = new Device();
      console.log('✅ MediaSoup device created');

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection error';
      setMediaError(message);
      console.error('MediaSoup connection error:', message);
    }
  }, [consumeProducer]);

  // ============================================
  // JOIN MEDIA ROOM
  // ============================================
  const joinMediaRoom = useCallback(async (roomId: string, peerId: string) => {
    if (!socketRef.current) {
      await connectMedia();
    }

    if (!socketRef.current || !deviceRef.current) {
      throw new Error('Socket or device not available');
    }

    currentRoomRef.current = roomId;
    currentPeerIdRef.current = peerId;

    return new Promise<void>((resolve, reject) => {
      socketRef.current?.emit('joinRoom', { roomId, peerId }, async (response: {
        success: boolean;
        rtpCapabilities?: mediasoupTypes.RtpCapabilities;
        existingProducers?: PeerProducer[];
        error?: string;
      }) => {
        if (!response.success) {
          reject(new Error(response.error || 'Failed to join room'));
          return;
        }

        try {
          // Load device with server RTP capabilities
          if (!deviceRef.current?.loaded && response.rtpCapabilities) {
            await deviceRef.current?.load({ routerRtpCapabilities: response.rtpCapabilities });
            console.log('✅ Device loaded with RTP capabilities');
          }

          setIsMediaJoined(true);

          // Consume existing producers
          if (response.existingProducers && response.existingProducers.length > 0) {
            console.log(`📥 Consuming ${response.existingProducers.length} existing producers`);
            for (const producer of response.existingProducers) {
              await consumeProducer(producer.producerId, producer.peerId);
            }
          }

          console.log(`✅ Joined media room: ${roomId} as ${peerId}`);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  }, [connectMedia, consumeProducer]);

  // ============================================
  // CREATE SEND TRANSPORT
  // ============================================
  const createSendTransport = useCallback(async () => {
    if (!socketRef.current || !deviceRef.current) return null;

    return new Promise<Transport | null>((resolve) => {
      socketRef.current?.emit('createTransport', {}, async (response: {
        success: boolean;
        id?: string;
        iceParameters?: unknown;
        iceCandidates?: unknown;
        dtlsParameters?: unknown;
        error?: string;
      }) => {
        if (!response.success || !response.id) {
          console.error('Failed to create transport:', response.error);
          resolve(null);
          return;
        }

        const transport = deviceRef.current?.createSendTransport({
          id: response.id,
          iceParameters: response.iceParameters as never,
          iceCandidates: response.iceCandidates as never,
          dtlsParameters: response.dtlsParameters as never,
        });

        if (transport) {
          transport.on('connect', ({ dtlsParameters }, callback, errback) => {
            socketRef.current?.emit('connectTransport', {
              transportId: transport.id,
              dtlsParameters,
            }, (res: { success: boolean; error?: string }) => {
              if (res.success) callback();
              else errback(new Error(res.error));
            });
          });

          transport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
            socketRef.current?.emit('produce', {
              transportId: transport.id,
              kind,
              rtpParameters,
              appData,
            }, (res: { success: boolean; producerId?: string; error?: string }) => {
              if (res.success && res.producerId) callback({ id: res.producerId });
              else errback(new Error(res.error));
            });
          });

          sendTransportRef.current = transport;
          console.log('✅ Send transport created');
        }

        resolve(transport || null);
      });
    });
  }, []);

  // ============================================
  // START PRODUCING (send media)
  // ============================================
  const startProducing = useCallback(async (stream: MediaStream) => {
    console.log('🎬 startProducing called with stream:', stream);
    console.log('🎬 Stream tracks:', {
      video: stream.getVideoTracks().map(t => ({ id: t.id, enabled: t.enabled, readyState: t.readyState })),
      audio: stream.getAudioTracks().map(t => ({ id: t.id, enabled: t.enabled, readyState: t.readyState })),
    });

    if (!sendTransportRef.current) {
      console.log('🔌 No send transport, creating one...');
      await createSendTransport();
    }

    if (!sendTransportRef.current) {
      console.error('❌ Failed to create send transport');
      throw new Error('No send transport available');
    }

    console.log('✅ Send transport ready:', sendTransportRef.current.id);
    setLocalStream(stream);

    // Produce video FIRST
    const videoTrack = stream.getVideoTracks()[0];
    console.log('📹 Video track:', videoTrack ? { id: videoTrack.id, enabled: videoTrack.enabled, readyState: videoTrack.readyState } : 'NO VIDEO TRACK');

    if (videoTrack) {
      try {
        console.log('📤 Producing video track...');
        const videoProducer = await sendTransportRef.current.produce({
          track: videoTrack,
          encodings: [
            { maxBitrate: 100000, scaleResolutionDownBy: 4 },
            { maxBitrate: 300000, scaleResolutionDownBy: 2 },
            { maxBitrate: 900000, scaleResolutionDownBy: 1 },
          ],
          codecOptions: {
            videoGoogleStartBitrate: 1000,
          },
        });

        producersRef.current.set(videoProducer.id, videoProducer);
        console.log('✅ Video producer created:', videoProducer.id);

        videoProducer.on('trackended', () => {
          console.log('⚠️ Video track ended');
          videoProducer.close();
        });
      } catch (err) {
        console.error('❌ Error producing video:', err);
      }
    } else {
      console.warn('⚠️ No video track available in stream!');
    }

    // Produce audio
    const audioTrack = stream.getAudioTracks()[0];
    console.log('🎤 Audio track:', audioTrack ? { id: audioTrack.id, enabled: audioTrack.enabled, readyState: audioTrack.readyState } : 'NO AUDIO TRACK');

    if (audioTrack) {
      try {
        console.log('📤 Producing audio track...');
        const audioProducer = await sendTransportRef.current.produce({
          track: audioTrack,
        });

        producersRef.current.set(audioProducer.id, audioProducer);
        console.log('✅ Audio producer created:', audioProducer.id);

        audioProducer.on('trackended', () => {
          console.log('⚠️ Audio track ended');
          audioProducer.close();
        });
      } catch (err) {
        console.error('❌ Error producing audio:', err);
      }
    } else {
      console.warn('⚠️ No audio track available in stream!');
    }

    // Update state
    console.log('📊 Total producers:', producersRef.current.size);
    setIsProducing(producersRef.current.size > 0);
    setProducerCount(producersRef.current.size);
  }, [createSendTransport]);

  // ============================================
  // STOP PRODUCING
  // ============================================
  const stopProducing = useCallback(() => {
    for (const [producerId, producer] of producersRef.current.entries()) {
      producer.close();
      socketRef.current?.emit('closeProducer', { producerId });
    }
    producersRef.current.clear();
    setProducerCount(0);
    setIsProducing(false);

    // Stop local stream tracks
    if (localStream) {
      for (const track of localStream.getTracks()) {
        track.stop();
      }
      setLocalStream(null);
    }

    console.log('🔇 Stopped all producers');
  }, [localStream]);

  // ============================================
  // PAUSE PRODUCER
  // ============================================
  const pauseProducer = useCallback((kind: 'audio' | 'video') => {
    for (const producer of producersRef.current.values()) {
      if (producer.kind === kind && !producer.paused) {
        producer.pause();
        socketRef.current?.emit('pauseProducer', { producerId: producer.id });
        console.log(`⏸️ Paused ${kind} producer`);
      }
    }
  }, []);

  // ============================================
  // RESUME PRODUCER
  // ============================================
  const resumeProducer = useCallback((kind: 'audio' | 'video') => {
    for (const producer of producersRef.current.values()) {
      if (producer.kind === kind && producer.paused) {
        producer.resume();
        socketRef.current?.emit('resumeProducer', { producerId: producer.id });
        console.log(`▶️ Resumed ${kind} producer`);
      }
    }
  }, []);

  // ============================================
  // START SCREEN SHARE
  // ============================================
  const startScreenShare = useCallback(async (): Promise<MediaStream | null> => {
    try {
      // Request screen share
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: true,
      });

      setScreenStream(stream);

      // Create send transport if needed
      if (!sendTransportRef.current) {
        await createSendTransport();
      }

      if (!sendTransportRef.current) {
        throw new Error('No send transport available');
      }

      // Produce screen video
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const screenProducer = await sendTransportRef.current.produce({
          track: videoTrack,
          encodings: [
            { maxBitrate: 1500000 },
          ],
          appData: { type: 'screen' },
        });

        screenProducersRef.current.set(screenProducer.id, screenProducer);
        console.log('🖥️ Screen producer created:', screenProducer.id);

        // Handle track ended (user stops sharing)
        videoTrack.onended = () => {
          console.log('Screen sharing ended by user');
          stopScreenShare();
        };

        screenProducer.on('trackended', () => {
          console.log('Screen track ended');
          screenProducer.close();
        });
      }

      // Produce screen audio if available
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const audioProducer = await sendTransportRef.current.produce({
          track: audioTrack,
          appData: { type: 'screen-audio' },
        });

        screenProducersRef.current.set(audioProducer.id, audioProducer);
        console.log('🔊 Screen audio producer created:', audioProducer.id);
      }

      setIsScreenSharing(true);
      setProducerCount(producersRef.current.size + screenProducersRef.current.size);

      console.log('🖥️ Screen sharing started');
      return stream;
    } catch (err) {
      console.error('Screen share error:', err);
      setMediaError(err instanceof Error ? err.message : 'Screen share failed');
      return null;
    }
  }, [createSendTransport]);

  // ============================================
  // STOP SCREEN SHARE
  // ============================================
  const stopScreenShare = useCallback(() => {
    // Close all screen producers
    for (const [producerId, producer] of screenProducersRef.current.entries()) {
      producer.close();
      socketRef.current?.emit('closeProducer', { producerId });
    }
    screenProducersRef.current.clear();

    // Stop screen stream tracks
    if (screenStream) {
      for (const track of screenStream.getTracks()) {
        track.stop();
      }
      setScreenStream(null);
    }

    setIsScreenSharing(false);
    setProducerCount(producersRef.current.size);

    console.log('🖥️ Screen sharing stopped');
  }, [screenStream]);

  // ============================================
  // LEAVE MEDIA ROOM
  // ============================================
  const leaveMediaRoom = useCallback(() => {
    stopProducing();
    stopScreenShare();

    // Close all consumers
    for (const consumer of consumersRef.current.values()) {
      consumer.close();
    }
    consumersRef.current.clear();
    setConsumerCount(0);

    // Close transports
    sendTransportRef.current?.close();
    recvTransportRef.current?.close();
    sendTransportRef.current = null;
    recvTransportRef.current = null;

    socketRef.current?.emit('leaveRoom');

    setIsMediaJoined(false);
    setRemoteStreams(new Map());

    currentRoomRef.current = null;
    currentPeerIdRef.current = null;

    console.log('👋 Left media room');
  }, [stopProducing, stopScreenShare]);

  // ============================================
  // DISCONNECT
  // ============================================
  const disconnectMedia = useCallback(() => {
    leaveMediaRoom();
    socketRef.current?.disconnect();
    socketRef.current = null;
    deviceRef.current = null;

    setIsMediaConnected(false);
    setMediaError(null);

    console.log('🔌 Disconnected from media server');
  }, [leaveMediaRoom]);

  // ============================================
  // HELPERS
  // ============================================
  const getRemoteStream = useCallback((peerId: string) => {
    return remoteStreams.get(peerId);
  }, [remoteStreams]);

  const getPeersWithVideo = useCallback(() => {
    return Array.from(remoteStreams.keys());
  }, [remoteStreams]);

  // ============================================
  // REQUEST PEER STREAM (on-demand consumption)
  // ============================================
  const requestPeerStream = useCallback(async (peerId: string): Promise<MediaStream | null> => {
    // Check if we already have this stream
    const existingStream = remoteStreams.get(peerId);
    if (existingStream && existingStream.getTracks().length > 0) {
      console.log(`📹 Stream already exists for peer ${peerId}`);
      return existingStream;
    }

    if (!socketRef.current || !isMediaJoined) {
      console.error('❌ Cannot request peer stream: not connected or not joined');
      return null;
    }

    console.log(`📹 Requesting stream for peer ${peerId}...`);

    return new Promise((resolve) => {
      // Request producers for this specific peer from the server
      socketRef.current?.emit('getPeerProducers', { peerId }, async (response: {
        success: boolean;
        producers?: Array<{
          producerId: string;
          peerId: string;
          kind: 'audio' | 'video';
          appData?: Record<string, unknown>;
        }>;
        error?: string;
      }) => {
        if (!response.success || !response.producers || response.producers.length === 0) {
          console.log(`📹 No producers found for peer ${peerId}:`, response.error || 'No producers');
          resolve(null);
          return;
        }

        console.log(`📹 Found ${response.producers.length} producers for peer ${peerId}`);

        // Consume all producers from this peer
        for (const producer of response.producers) {
          await consumeProducer(producer.producerId, producer.peerId);
        }

        // Wait a bit for streams to be set up, then return
        setTimeout(() => {
          const stream = remoteStreams.get(peerId);
          resolve(stream || null);
        }, 100);
      });
    });
  }, [remoteStreams, isMediaJoined, consumeProducer]);

  // Cleanup on unmount only - use empty deps to run only once
  // biome-ignore lint/correctness/useExhaustiveDependencies: cleanup should only run on unmount
  useEffect(() => {
    return () => {
      // Only cleanup on actual unmount, not on re-renders
      if (socketRef.current) {
        // Close producers without triggering state updates
        for (const producer of producersRef.current.values()) {
          try { producer.close(); } catch (e) { /* ignore */ }
        }
        producersRef.current.clear();

        // Close consumers
        for (const consumer of consumersRef.current.values()) {
          try { consumer.close(); } catch (e) { /* ignore */ }
        }
        consumersRef.current.clear();

        // Close transports
        try { sendTransportRef.current?.close(); } catch (e) { /* ignore */ }
        try { recvTransportRef.current?.close(); } catch (e) { /* ignore */ }

        // Disconnect socket
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const value: MediasoupContextType = {
    isMediaConnected,
    isMediaJoined,
    mediaError,
    remoteStreams,
    localStream,
    screenStream,
    isProducing,
    isScreenSharing,
    producerCount,
    consumerCount,
    connectMedia,
    joinMediaRoom,
    startProducing,
    stopProducing,
    startScreenShare,
    stopScreenShare,
    leaveMediaRoom,
    disconnectMedia,
    pauseProducer,
    resumeProducer,
    requestPeerStream,
    getRemoteStream,
    getPeersWithVideo,
  };

  return (
    <MediasoupContext.Provider value={value}>
      {children}
    </MediasoupContext.Provider>
  );
}

export function useMediasoupContext() {
  const context = useContext(MediasoupContext);
  if (context === undefined) {
    throw new Error('useMediasoupContext must be used within a MediasoupProvider');
  }
  return context;
}
