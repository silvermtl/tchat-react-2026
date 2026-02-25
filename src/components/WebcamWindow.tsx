import { useState, useEffect, useRef, useCallback } from 'react';
import { DraggableBox } from './DraggableBox';
import type { User } from '../types';
import { useChat } from '../context/ChatContext';
import { useMediasoupContext } from '../context/MediasoupContext';

interface WebcamWindowProps {
  user: User;
  onClose: () => void;
  initialPosition?: { x: number; y: number };
  remoteStream?: MediaStream | null;
}

interface ConnectionStats {
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  bitrate: number;
  packetLoss: number;
  latency: number;
}

export function WebcamWindow({ user, onClose, initialPosition, remoteStream: propStream }: WebcamWindowProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    quality: 'unknown',
    bitrate: 0,
    packetLoss: 0,
    latency: 0,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { usersWithWebcam } = useChat();
  const { getRemoteStream, remoteStreams, requestPeerStream, isMediaJoined } = useMediasoupContext();

  const hasWebcam = usersWithWebcam.includes(user.id);
  const [isRequestingStream, setIsRequestingStream] = useState(false);

  // Debug logging
  console.log(`🔍 WebcamWindow Debug for ${user.username}:`, {
    'user.id': user.id,
    'user.id type': typeof user.id,
    'String(user.id)': String(user.id),
    'hasWebcam': hasWebcam,
    'usersWithWebcam': usersWithWebcam,
    'isMediaJoined': isMediaJoined,
    'remoteStreams keys': Array.from(remoteStreams.keys()),
    'remoteStreams size': remoteStreams.size,
  });

  // Get stream from MediaSoup or props
  const mediasoupStream = getRemoteStream(String(user.id));
  const activeStream = propStream || mediasoupStream;

  console.log(`🔍 Stream check for ${user.username}:`, {
    'mediasoupStream': mediasoupStream ? `MediaStream with ${mediasoupStream.getTracks().length} tracks` : null,
    'propStream': propStream ? `MediaStream with ${propStream.getTracks().length} tracks` : null,
    'activeStream': activeStream ? `MediaStream with ${activeStream.getTracks().length} tracks` : null,
  });

  // Request stream on mount if user has webcam and we don't have their stream
  useEffect(() => {
    const fetchStream = async () => {
      if (hasWebcam && !activeStream && isMediaJoined && !isRequestingStream) {
        setIsRequestingStream(true);
        console.log(`📹 Requesting stream for user ${user.username} (${user.id})...`);

        try {
          const stream = await requestPeerStream(String(user.id));
          if (stream) {
            console.log(`✅ Got stream for ${user.username}`);
          } else {
            console.log(`⚠️ No stream available for ${user.username}`);
          }
        } catch (err) {
          console.error(`❌ Error requesting stream for ${user.username}:`, err);
        } finally {
          setIsRequestingStream(false);
        }
      }
    };

    fetchStream();
  }, [hasWebcam, activeStream, isMediaJoined, isRequestingStream, requestPeerStream, user.id, user.username]);

  // Calculate connection quality based on stats
  const calculateQuality = useCallback((bitrate: number, packetLoss: number, latency: number): ConnectionStats['quality'] => {
    if (packetLoss > 10 || latency > 500) return 'poor';
    if (packetLoss > 5 || latency > 300) return 'fair';
    if (packetLoss > 2 || latency > 150 || bitrate < 100000) return 'good';
    return 'excellent';
  }, []);

  // Monitor connection quality
  useEffect(() => {
    if (!activeStream) return;

    // Simulate connection stats (in real implementation, use RTCPeerConnection.getStats())
    const updateStats = () => {
      // Simulated values - in production, get real stats from WebRTC
      const simulatedBitrate = 500000 + Math.random() * 500000;
      const simulatedPacketLoss = Math.random() * 5;
      const simulatedLatency = 50 + Math.random() * 100;

      const quality = calculateQuality(simulatedBitrate, simulatedPacketLoss, simulatedLatency);

      setConnectionStats({
        quality,
        bitrate: Math.round(simulatedBitrate / 1000), // kbps
        packetLoss: Math.round(simulatedPacketLoss * 10) / 10,
        latency: Math.round(simulatedLatency),
      });
    };

    updateStats();
    statsIntervalRef.current = setInterval(updateStats, 3000);

    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, [activeStream, calculateQuality]);

  // STEP 1: When stream is available, stop loading so video element renders
  useEffect(() => {
    if (activeStream && activeStream.getTracks().length > 0) {
      console.log(`✅ Stream available for ${user.username} with ${activeStream.getTracks().length} tracks - stopping loading`);
      setIsLoading(false);
      setHasError(false);
    } else if (!hasWebcam && !activeStream) {
      setIsLoading(false);
      setHasError(true);
    }
  }, [activeStream, hasWebcam, user.username]);

  // STEP 2: Once video element exists, attach the stream
  useEffect(() => {
    console.log(`🎬 Attach stream effect for ${user.username}:`, {
      'activeStream': activeStream ? `${activeStream.getTracks().length} tracks` : null,
      'videoRef.current': !!videoRef.current,
      'isLoading': isLoading,
    });

    if (activeStream && videoRef.current) {
      console.log(`✅ Attaching srcObject for ${user.username}, tracks:`, activeStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })));
      videoRef.current.srcObject = activeStream;
      console.log(`📹 WebcamWindow: Stream attached for ${user.username}`);
    }
  }, [activeStream, isLoading, user.username]); // isLoading triggers re-run after video element appears

  // Re-check for stream when remoteStreams updates
  // biome-ignore lint/correctness/useExhaustiveDependencies: remoteStreams needed to trigger re-check
  useEffect(() => {
    const stream = getRemoteStream(String(user.id));
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      setIsLoading(false);
      setHasError(false);
      console.log(`📹 Stream found and attached for ${user.username}`);
    }
  }, [remoteStreams, user.id, getRemoteStream, user.username]);

  // Apply volume to video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    setVolume(newVolume);
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (!isFullscreen) {
        containerRef.current.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
      setIsFullscreen(!isFullscreen);
    }
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Get quality indicator color
  const getQualityColor = (quality: ConnectionStats['quality']) => {
    switch (quality) {
      case 'excellent': return '#22c55e';
      case 'good': return '#84cc16';
      case 'fair': return '#eab308';
      case 'poor': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Get quality icon
  const getQualityBars = (quality: ConnectionStats['quality']) => {
    const bars = quality === 'excellent' ? 4 : quality === 'good' ? 3 : quality === 'fair' ? 2 : quality === 'poor' ? 1 : 0;
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 12 }}>
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            style={{
              width: 3,
              height: 3 + (i * 2),
              background: i <= bars ? getQualityColor(quality) : 'rgba(255,255,255,0.2)',
              borderRadius: 1,
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <DraggableBox
      title={`Webcam - ${user.username}`}
      onClose={onClose}
      initialPosition={initialPosition}
      width={380}
    >
      <div className="webcam-container" ref={containerRef}>
        {isLoading || isRequestingStream ? (
          <div className="webcam-loading">
            <div className="webcam-spinner" />
            <span>{isRequestingStream ? 'Demande du flux vidéo...' : 'Connexion au flux vidéo...'}</span>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
              {isRequestingStream
                ? `Récupération du stream de ${user.username}...`
                : 'En attente du flux MediaSoup...'}
            </p>
          </div>
        ) : hasError || (!hasWebcam && !activeStream) ? (
          <div className="webcam-error">
            <span className="webcam-error-icon">📷</span>
            <span>Webcam non disponible</span>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
              {user.username} n'a pas activé sa webcam
            </p>
          </div>
        ) : (
          <div className="webcam-preview">
            {/* Video element */}
            <div className="webcam-video-container" style={{ position: 'relative' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isMuted}
                style={{
                  width: '100%',
                  borderRadius: 10,
                  background: '#000',
                  aspectRatio: '4/3',
                  objectFit: 'cover',
                }}
                onLoadedMetadata={() => {
                  console.log(`📹 Video metadata loaded for ${user.username}`);
                }}
                onPlay={() => {
                  console.log(`📹 Video playing for ${user.username}`);
                  setIsLoading(false);
                }}
                onError={(e) => {
                  console.error(`📹 Video error for ${user.username}:`, e);
                }}
              />

              {/* Live badge */}
              {(hasWebcam || activeStream) && (
                <div className="webcam-live-badge">
                  <span className="live-dot" />
                  LIVE
                </div>
              )}

              {/* Connection quality indicator */}
              {activeStream && (
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: '#fff',
                    padding: '4px 8px',
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                  }}
                  title={`Qualité: ${connectionStats.quality}\nBitrate: ${connectionStats.bitrate} kbps\nLatence: ${connectionStats.latency}ms\nPerte: ${connectionStats.packetLoss}%`}
                >
                  {getQualityBars(connectionStats.quality)}
                  <span style={{ color: getQualityColor(connectionStats.quality), textTransform: 'capitalize' }}>
                    {connectionStats.quality}
                  </span>
                </div>
              )}

              {/* User info overlay */}
              <div className="webcam-user-overlay">
                <div className="webcam-user-avatar">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.username} />
                  ) : (
                    <span>{(user.username || '?').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <span className="webcam-username">{user.username}</span>
              </div>

              {/* Muted indicator overlay */}
              {isMuted && (
                <div style={{
                  position: 'absolute',
                  bottom: 50,
                  right: 10,
                  background: 'rgba(239, 68, 68, 0.9)',
                  color: '#fff',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  🔇 Son coupé
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="webcam-controls" style={{ display: 'flex', gap: 8, padding: '10px 0' }}>
              {/* Volume control with slider */}
              <div
                style={{ position: 'relative' }}
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                <button
                  type="button"
                  className={`webcam-btn ${isMuted ? 'muted' : ''}`}
                  title={isMuted ? 'Activer le son' : 'Couper le son'}
                  onClick={toggleMute}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15,33,55,.7)',
                    border: isMuted ? '2px solid #ef4444' : '1px solid var(--border)',
                    color: isMuted ? '#ef4444' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: 18,
                    transition: 'all 0.2s',
                  }}
                >
                  {isMuted ? '🔇' : volume > 50 ? '🔊' : volume > 0 ? '🔉' : '🔈'}
                </button>

                {/* Volume slider popup */}
                {showVolumeSlider && (
                  <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(15, 33, 55, 0.95)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '12px 8px',
                    marginBottom: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    minWidth: 40,
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{volume}%</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={handleVolumeChange}
                      style={{
                        width: 80,
                        height: 4,
                        appearance: 'none',
                        background: `linear-gradient(to right, var(--accent) ${volume}%, rgba(255,255,255,0.2) ${volume}%)`,
                        borderRadius: 2,
                        cursor: 'pointer',
                        transform: 'rotate(-90deg)',
                        transformOrigin: 'center',
                        margin: '30px 0',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Stats button */}
              <button
                type="button"
                className="webcam-btn"
                title={`Bitrate: ${connectionStats.bitrate} kbps | Latence: ${connectionStats.latency}ms`}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'rgba(15,33,55,.7)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                📊
              </button>

              {/* Fullscreen button */}
              <button
                type="button"
                className="webcam-btn"
                title="Plein écran"
                onClick={toggleFullscreen}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'rgba(15,33,55,.7)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                {isFullscreen ? '⛶' : '⛶'}
              </button>

              {/* Close button */}
              <button
                type="button"
                className="webcam-btn danger"
                title="Fermer"
                onClick={onClose}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: 16,
                  marginLeft: 'auto',
                }}
              >
                ✕
              </button>
            </div>

            {/* Connection stats bar */}
            {activeStream && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'rgba(15, 33, 55, 0.5)',
                borderRadius: 8,
                fontSize: 11,
                color: 'var(--muted)',
              }}>
                <span>Bitrate: <strong style={{ color: 'var(--text-primary)' }}>{connectionStats.bitrate} kbps</strong></span>
                <span>Latence: <strong style={{ color: 'var(--text-primary)' }}>{connectionStats.latency}ms</strong></span>
                <span>Perte: <strong style={{ color: connectionStats.packetLoss > 5 ? '#ef4444' : 'var(--text-primary)' }}>{connectionStats.packetLoss}%</strong></span>
              </div>
            )}
          </div>
        )}
      </div>
    </DraggableBox>
  );
}
