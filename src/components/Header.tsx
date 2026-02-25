import { useChat } from '../context/ChatContext';
import { useMediasoupContext } from '../context/MediasoupContext';

export function Header() {
  const { isPlaying, setIsPlaying, volume, setVolume, isConnected, setIsMobileSidebarOpen, onlineUsers } = useChat();
  const { isScreenSharing, startScreenShare, stopScreenShare, isMediaConnected } = useMediasoupContext();

  const handleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      await startScreenShare();
    }
  };

  return (
    <div className="topbar">
      {/* Brand */}
      <div className="brand">
        <div className="logo">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
          </svg>
        </div>
        <div className="titles">
          <div className="name">PRO-VIDEOCHAT</div>
          <div className="sub">
            <span style={{ color: 'var(--accent)' }}>♫</span> Monte le son - RadioXPlus en direct
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="controls">
        {/* Play/Pause */}
        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          className={`btn-round ${isPlaying ? 'glow-effect' : ''}`}
          style={isPlaying ? { background: 'var(--accent)', color: '#0a1628' } : {}}
          title="Play/Pause"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* Volume pill */}
        <div className="pill">
          <span style={{ color: 'var(--accent)', fontWeight: 900 }}>🔊</span>
          <input
            className="slider"
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </div>
        <div className="pct">{volume}%</div>

        {/* Screen share button */}
        <button
          type="button"
          onClick={handleScreenShare}
          className={`btn-round ${isScreenSharing ? 'glow-effect' : ''}`}
          style={{
            background: isScreenSharing ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15,33,55,.7)',
            borderColor: isScreenSharing ? '#ef4444' : 'var(--border)',
            position: 'relative',
          }}
          title={isScreenSharing ? 'Arrêter le partage' : 'Partager l\'écran'}
          disabled={!isMediaConnected}
        >
          🖥️
          {isScreenSharing && (
            <span
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 10,
                height: 10,
                background: '#ef4444',
                borderRadius: '50%',
                animation: 'pulse 1.5s infinite',
              }}
            />
          )}
        </button>

        {/* Connection status */}
        <div
          className="btn-round"
          style={{
            background: isConnected ? 'rgba(34,197,94,.2)' : 'rgba(239,68,68,.2)',
            borderColor: isConnected ? '#22c55e' : '#ef4444',
          }}
          title={isConnected ? 'Connecté' : 'Déconnecté'}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: isConnected ? '#22c55e' : '#ef4444',
              boxShadow: isConnected ? '0 0 8px #22c55e' : '0 0 8px #ef4444',
            }}
          />
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(true)}
          className="btn-round mobile-menu-btn"
          title="Utilisateurs"
          style={{ position: 'relative' }}
        >
          👥
          {onlineUsers.length > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 18,
                height: 18,
                background: 'var(--accent)',
                color: '#0a1628',
                fontSize: 11,
                fontWeight: 900,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {onlineUsers.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
