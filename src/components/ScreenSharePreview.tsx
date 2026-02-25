import { useEffect, useRef } from 'react';
import { DraggableBox } from './DraggableBox';

interface ScreenSharePreviewProps {
  stream: MediaStream | null;
  isActive: boolean;
  onClose: () => void;
  onStop: () => void;
}

export function ScreenSharePreview({ stream, isActive, onClose, onStop }: ScreenSharePreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!isActive || !stream) return null;

  return (
    <DraggableBox
      title="Partage d'écran"
      onClose={onClose}
      initialPosition={{ x: window.innerWidth - 420, y: 100 }}
      width={380}
    >
      <div style={{ padding: 0 }}>
        {/* Video preview */}
        <div style={{ position: 'relative' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              borderRadius: 10,
              background: '#000',
              aspectRatio: '16/9',
              objectFit: 'contain',
            }}
          />

          {/* Live badge */}
          <div style={{
            position: 'absolute',
            top: 10,
            left: 10,
            background: 'rgba(239, 68, 68, 0.9)',
            color: '#fff',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span style={{
              width: 8,
              height: 8,
              background: '#fff',
              borderRadius: '50%',
              animation: 'pulse 1.5s infinite',
            }} />
            PARTAGE EN COURS
          </div>

          {/* Screen icon */}
          <div style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'rgba(0, 0, 0, 0.7)',
            color: '#fff',
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 16,
          }}>
            🖥️
          </div>
        </div>

        {/* Info text */}
        <div style={{
          padding: '12px 0',
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--muted)',
        }}>
          Les autres utilisateurs peuvent voir votre écran
        </div>

        {/* Controls */}
        <div style={{
          display: 'flex',
          gap: 10,
          justifyContent: 'center',
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px 20px',
              borderRadius: 8,
              background: 'rgba(15,33,55,.7)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Masquer l'aperçu
          </button>
          <button
            type="button"
            onClick={onStop}
            style={{
              flex: 1,
              padding: '10px 20px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.2)',
              border: '2px solid #ef4444',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Arrêter le partage
          </button>
        </div>
      </div>
    </DraggableBox>
  );
}
