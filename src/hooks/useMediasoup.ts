import { useState, useRef, useCallback, useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { types as mediasoupTypes } from 'mediasoup-client';

type Device = mediasoupTypes.Device;
type RtpCapabilities = mediasoupTypes.RtpCapabilities;
type Transport = mediasoupTypes.Transport;
type Producer = mediasoupTypes.Producer;
type Consumer = mediasoupTypes.Consumer;


const isProd = import.meta.env.NODE_ENV === 'production';


const SOCKET_URL = import.meta.env.PROD
  ? import.meta.env.VITE_URL_SERVER_PROD
  : import.meta.env.VITE_URL_SERVER_DEV;

interface MediasoupState {
  isConnected: boolean;
  isJoined: boolean;
  error: string | null;
  producers: Map<string, Producer>;
  consumers: Map<string, Consumer>;
  remoteStreams: Map<string, MediaStream>;
}

interface PeerProducer {
  producerId: string;
  peerId: string;
  kind: 'audio' | 'video';
  appData?: Record<string, unknown>;
}

export function useMediasoup(roomId: string, peerId: string) {
  const [state, setState] = useState<MediasoupState>({
    isConnected: false,
    isJoined: false,
    error: null,
    producers: new Map(),
    consumers: new Map(),
    remoteStreams: new Map(),
  });

  const socketRef = useRef<Socket | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<Transport | null>(null);
  const recvTransportRef = useRef<Transport | null>(null);

  // Connect to media server
  const connect = useCallback(async () => {
    try {
      // Dynamically import mediasoup-client
      const { Device } = await import('mediasoup-client');

      const socket = io(`${SOCKET_URL}/media`, {
        transports: ['websocket', 'polling'],
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('🎥 Media socket connected');
        setState(prev => ({ ...prev, isConnected: true, error: null }));
      });

      socket.on('disconnect', () => {
        console.log('🎥 Media socket disconnected');
        setState(prev => ({ ...prev, isConnected: false, isJoined: false }));
      });

      socket.on('connect_error', (err) => {
        console.error('🎥 Media socket error:', err.message);
        setState(prev => ({ ...prev, error: err.message }));
      });

      // Handle new producer from another peer
      socket.on('newProducer', async (data: PeerProducer) => {
        console.log('📥 New producer available:', data);
        await consumeProducer(data.producerId, data.peerId);
      });

      // Handle producer closed
      socket.on('producerClosed', (data: { producerId: string; peerId: string }) => {
        console.log('📤 Producer closed:', data);
        const consumer = state.consumers.get(data.producerId);
        if (consumer) {
          consumer.close();
          setState(prev => {
            const newConsumers = new Map(prev.consumers);
            newConsumers.delete(data.producerId);
            const newRemoteStreams = new Map(prev.remoteStreams);
            newRemoteStreams.delete(data.peerId);
            return { ...prev, consumers: newConsumers, remoteStreams: newRemoteStreams };
          });
        }
      });

      // Handle peer left
      socket.on('peerLeft', (data: { peerId: string }) => {
        console.log('👋 Peer left:', data.peerId);
        setState(prev => {
          const newRemoteStreams = new Map(prev.remoteStreams);
          newRemoteStreams.delete(data.peerId);
          return { ...prev, remoteStreams: newRemoteStreams };
        });
      });

      // Create device
      deviceRef.current = new Device();

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection error';
      setState(prev => ({ ...prev, error: message }));
    }
  }, [state.consumers]);

  // Join room
  const joinRoom = useCallback(async () => {
    if (!socketRef.current || !deviceRef.current) {
      await connect();
    }

    return new Promise<void>((resolve, reject) => {
      socketRef.current?.emit('joinRoom', { roomId, peerId }, async (response: {
        success: boolean;
        rtpCapabilities?: RtpCapabilities;
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
          }

          setState(prev => ({ ...prev, isJoined: true }));

          // Consume existing producers
          if (response.existingProducers) {
            for (const producer of response.existingProducers) {
              await consumeProducer(producer.producerId, producer.peerId);
            }
          }

          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  }, [roomId, peerId, connect]);

  // Create send transport
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
        }

        resolve(transport || null);
      });
    });
  }, []);

  // Create receive transport
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
        }

        resolve(transport || null);
      });
    });
  }, []);

  // Produce (send) media
  const produce = useCallback(async (stream: MediaStream) => {
    if (!sendTransportRef.current) {
      await createSendTransport();
    }

    if (!sendTransportRef.current) {
      throw new Error('No send transport available');
    }

    const producers: Producer[] = [];

    // Produce video
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const videoProducer = await sendTransportRef.current.produce({
        track: videoTrack,
        encodings: [
          { maxBitrate: 100000 },
          { maxBitrate: 300000 },
          { maxBitrate: 900000 },
        ],
        codecOptions: {
          videoGoogleStartBitrate: 1000,
        },
      });

      setState(prev => {
        const newProducers = new Map(prev.producers);
        newProducers.set(videoProducer.id, videoProducer);
        return { ...prev, producers: newProducers };
      });

      producers.push(videoProducer);
    }

    // Produce audio
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      const audioProducer = await sendTransportRef.current.produce({
        track: audioTrack,
      });

      setState(prev => {
        const newProducers = new Map(prev.producers);
        newProducers.set(audioProducer.id, audioProducer);
        return { ...prev, producers: newProducers };
      });

      producers.push(audioProducer);
    }

    return producers;
  }, [createSendTransport]);

  // Consume (receive) media from a producer
  const consumeProducer = useCallback(async (producerId: string, remotePeerId: string) => {
    if (!recvTransportRef.current) {
      await createRecvTransport();
    }

    if (!recvTransportRef.current || !deviceRef.current) {
      console.error('No recv transport available');
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
        if (!response.success || !response.id) {
          console.error('Failed to consume:', response.error);
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
            // Resume consumer
            socketRef.current?.emit('resumeConsumer', { consumerId: consumer.id });

            // Add track to remote stream
            setState(prev => {
              const newConsumers = new Map(prev.consumers);
              newConsumers.set(producerId, consumer);

              const newRemoteStreams = new Map(prev.remoteStreams);
              let remoteStream = newRemoteStreams.get(remotePeerId);
              if (!remoteStream) {
                remoteStream = new MediaStream();
                newRemoteStreams.set(remotePeerId, remoteStream);
              }
              remoteStream.addTrack(consumer.track);

              return { ...prev, consumers: newConsumers, remoteStreams: newRemoteStreams };
            });

            resolve(consumer);
          } else {
            resolve(null);
          }
        } catch (err) {
          console.error('Consume error:', err);
          resolve(null);
        }
      });
    });
  }, [createRecvTransport]);

  // Stop all producers
  const stopProducing = useCallback(() => {
    for (const producer of state.producers.values()) {
      producer.close();
      socketRef.current?.emit('closeProducer', { producerId: producer.id });
    }
    setState(prev => ({ ...prev, producers: new Map() }));
  }, [state.producers]);

  // Leave room
  const leaveRoom = useCallback(() => {
    stopProducing();

    for (const consumer of state.consumers.values()) {
      consumer.close();
    }

    sendTransportRef.current?.close();
    recvTransportRef.current?.close();

    socketRef.current?.emit('leaveRoom');

    setState(prev => ({
      ...prev,
      isJoined: false,
      producers: new Map(),
      consumers: new Map(),
      remoteStreams: new Map(),
    }));
  }, [state.consumers, stopProducing]);

  // Disconnect
  const disconnect = useCallback(() => {
    leaveRoom();
    socketRef.current?.disconnect();
    setState({
      isConnected: false,
      isJoined: false,
      error: null,
      producers: new Map(),
      consumers: new Map(),
      remoteStreams: new Map(),
    });
  }, [leaveRoom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    joinRoom,
    produce,
    stopProducing,
    leaveRoom,
    disconnect,
    getRemoteStream: (peerId: string) => state.remoteStreams.get(peerId),
  };
}
