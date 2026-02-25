import { useEffect, useRef, useState } from 'react';
import { DraggableBox } from './DraggableBox';
import { useFaceDetection } from '../hooks/useFaceDetection';

// Fun filter definitions
const WEBCAM_FILTERS = [
  { id: 'none', name: 'Normal', filter: 'none', transform: 'scaleX(-1)' },
  { id: 'grayscale', name: 'Noir & Blanc', filter: 'grayscale(100%)', transform: 'scaleX(-1)' },
  { id: 'sepia', name: 'Vintage', filter: 'sepia(100%)', transform: 'scaleX(-1)' },
  { id: 'invert', name: 'Négatif', filter: 'invert(100%)', transform: 'scaleX(-1)' },
  { id: 'saturate', name: 'Saturé', filter: 'saturate(200%)', transform: 'scaleX(-1)' },
  { id: 'hue', name: 'Psychédélique', filter: 'hue-rotate(180deg) saturate(150%)', transform: 'scaleX(-1)' },
  { id: 'blur', name: 'Flou', filter: 'blur(3px)', transform: 'scaleX(-1)' },
  { id: 'contrast', name: 'Contraste', filter: 'contrast(150%) brightness(110%)', transform: 'scaleX(-1)' },
  { id: 'warm', name: 'Chaud', filter: 'sepia(30%) saturate(140%) hue-rotate(-10deg)', transform: 'scaleX(-1)' },
  { id: 'cold', name: 'Froid', filter: 'saturate(80%) hue-rotate(180deg) brightness(110%)', transform: 'scaleX(-1)' },
  { id: 'comic', name: 'Comics', filter: 'contrast(150%) saturate(150%) brightness(90%)', transform: 'scaleX(-1)' },
  { id: 'ghost', name: 'Fantôme', filter: 'brightness(150%) contrast(80%) opacity(70%)', transform: 'scaleX(-1)' },
  { id: 'night', name: 'Vision Nocturne', filter: 'brightness(150%) contrast(120%) sepia(100%) hue-rotate(60deg)', transform: 'scaleX(-1)' },
];

// Fun overlay accessories with positioning relative to face
type OverlayPosition = 'eyes' | 'head' | 'nose' | 'mouth' | 'full';

interface WebcamOverlay {
  id: string;
  name: string;
  emoji: string;
  position: OverlayPosition;
  offsetY: number; // Percentage offset from anchor point
  scale: number; // Size multiplier
}

const WEBCAM_OVERLAYS: WebcamOverlay[] = [
  { id: 'none', name: 'Aucun', emoji: '❌', position: 'eyes', offsetY: 0, scale: 1 },
  // Glasses - positioned at eyes level
  { id: 'sunglasses', name: 'Lunettes soleil', emoji: '🕶️', position: 'eyes', offsetY: 0, scale: 1.4 },
  { id: 'glasses', name: 'Lunettes', emoji: '👓', position: 'eyes', offsetY: 0, scale: 1.3 },
  { id: 'monocle', name: 'Monocle', emoji: '🧐', position: 'full', offsetY: 0, scale: 1.8 },
  // Hats - positioned above head
  { id: 'tophat', name: 'Haut-de-forme', emoji: '🎩', position: 'head', offsetY: -20, scale: 1.2 },
  { id: 'crown', name: 'Couronne', emoji: '👑', position: 'head', offsetY: -15, scale: 1.1 },
  { id: 'cowboy', name: 'Cowboy', emoji: '🤠', position: 'full', offsetY: 0, scale: 2.0 },
  { id: 'party', name: 'Fête', emoji: '🥳', position: 'full', offsetY: 0, scale: 2.0 },
  // Nose items
  { id: 'clownnose', name: 'Nez clown', emoji: '🔴', position: 'nose', offsetY: 0, scale: 0.5 },
  { id: 'pig', name: 'Cochon', emoji: '🐷', position: 'nose', offsetY: 0, scale: 1.0 },
  // Face overlays - centered on face
  { id: 'cat', name: 'Chat', emoji: '😺', position: 'full', offsetY: 0, scale: 1.8 },
  { id: 'dog', name: 'Chien', emoji: '🐶', position: 'full', offsetY: 0, scale: 1.8 },
  { id: 'bunny', name: 'Lapin', emoji: '🐰', position: 'full', offsetY: 0, scale: 1.8 },
  { id: 'bear', name: 'Ours', emoji: '🐻', position: 'full', offsetY: 0, scale: 1.8 },
  { id: 'lion', name: 'Lion', emoji: '🦁', position: 'full', offsetY: 0, scale: 1.8 },
  { id: 'fox', name: 'Renard', emoji: '🦊', position: 'full', offsetY: 0, scale: 1.8 },
  { id: 'panda', name: 'Panda', emoji: '🐼', position: 'full', offsetY: 0, scale: 1.8 },
  // Special effects - full face emoji overlays
  { id: 'devil', name: 'Diable', emoji: '😈', position: 'full', offsetY: 0, scale: 1.9 },
  { id: 'angel', name: 'Ange', emoji: '😇', position: 'full', offsetY: 0, scale: 1.9 },
  { id: 'alien', name: 'Alien', emoji: '👽', position: 'full', offsetY: 0, scale: 1.9 },
  { id: 'robot', name: 'Robot', emoji: '🤖', position: 'full', offsetY: 0, scale: 1.9 },
  { id: 'clown', name: 'Clown', emoji: '🤡', position: 'full', offsetY: 0, scale: 1.9 },
  { id: 'ghost', name: 'Fantôme', emoji: '👻', position: 'full', offsetY: 0, scale: 1.9 },
  { id: 'skull', name: 'Crâne', emoji: '💀', position: 'full', offsetY: 0, scale: 1.8 },
  // Decorations - full face
  { id: 'hearts', name: 'Coeurs', emoji: '😍', position: 'full', offsetY: 0, scale: 1.9 },
  { id: 'stars', name: 'Étoiles', emoji: '🤩', position: 'full', offsetY: 0, scale: 1.9 },
  { id: 'money', name: 'Argent', emoji: '🤑', position: 'full', offsetY: 0, scale: 1.9 },
  { id: 'cool', name: 'Cool', emoji: '😎', position: 'full', offsetY: 0, scale: 1.9 },
  { id: 'nerd', name: 'Nerd', emoji: '🤓', position: 'full', offsetY: 0, scale: 1.9 },
];

interface MyWebcamPreviewProps {
  stream: MediaStream | null;
  isActive: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onClose: () => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onStop: () => void;
}

export function MyWebcamPreview({
  stream,
  isActive,
  isAudioEnabled,
  isVideoEnabled,
  onClose,
  onToggleAudio,
  onToggleVideo,
  onStop,
}: MyWebcamPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentFilter, setCurrentFilter] = useState(WEBCAM_FILTERS[0]);
  const [currentOverlay, setCurrentOverlay] = useState(WEBCAM_OVERLAYS[0]);
  const [showFilters, setShowFilters] = useState(false);
  const [showOverlays, setShowOverlays] = useState(false);
  const [activeTab, setActiveTab] = useState<'filters' | 'overlays'>('overlays');
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });

  // Face detection
  const { facePosition, isDetecting } = useFaceDetection({
    videoRef: videoRef as React.RefObject<HTMLVideoElement>,
    enabled: isActive && currentOverlay.id !== 'none',
  });

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;

      // Force play the video
      videoRef.current.play().catch(() => {
        // Autoplay may be blocked, user interaction will start it
      });

      // Get video dimensions once loaded
      videoRef.current.onloadedmetadata = () => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setVideoSize({ width: rect.width, height: rect.height });
        }
        videoRef.current?.play().catch(() => {});
      };
    }
  }, [stream]);

  // Update video size on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setVideoSize({ width: rect.width, height: rect.height });
      }
    };

    window.addEventListener('resize', updateSize);
    updateSize();

    return () => window.removeEventListener('resize', updateSize);
  }, []);

  if (!isActive) return null;

  const nextFilter = () => {
    const currentIndex = WEBCAM_FILTERS.findIndex(f => f.id === currentFilter.id);
    const nextIndex = (currentIndex + 1) % WEBCAM_FILTERS.length;
    setCurrentFilter(WEBCAM_FILTERS[nextIndex]);
  };

  const prevFilter = () => {
    const currentIndex = WEBCAM_FILTERS.findIndex(f => f.id === currentFilter.id);
    const prevIndex = (currentIndex - 1 + WEBCAM_FILTERS.length) % WEBCAM_FILTERS.length;
    setCurrentFilter(WEBCAM_FILTERS[prevIndex]);
  };

  const nextOverlay = () => {
    const currentIndex = WEBCAM_OVERLAYS.findIndex(o => o.id === currentOverlay.id);
    const nextIndex = (currentIndex + 1) % WEBCAM_OVERLAYS.length;
    setCurrentOverlay(WEBCAM_OVERLAYS[nextIndex]);
  };

  const prevOverlay = () => {
    const currentIndex = WEBCAM_OVERLAYS.findIndex(o => o.id === currentOverlay.id);
    const prevIndex = (currentIndex - 1 + WEBCAM_OVERLAYS.length) % WEBCAM_OVERLAYS.length;
    setCurrentOverlay(WEBCAM_OVERLAYS[prevIndex]);
  };

  // Calculate overlay position based on face detection
  const getOverlayStyle = () => {
    if (!facePosition || currentOverlay.id === 'none') return { display: 'none' };

    // Calculate base size relative to face width
    const faceWidthPx = facePosition.width * videoSize.width;
    const baseSize = faceWidthPx * currentOverlay.scale;

    let x = 0;
    let y = 0;

    // The video is mirrored with scaleX(-1), so we need to mirror the X position
    // facePosition.x is in 0-1 range where 0 = left, 1 = right (in original video)
    // After mirroring, left becomes right, so we flip: mirroredX = 1 - x
    const mirroredFaceX = 1 - facePosition.x;
    const mirroredLeftEyeX = 1 - facePosition.leftEye.x;
    const mirroredRightEyeX = 1 - facePosition.rightEye.x;
    const mirroredNoseX = 1 - facePosition.noseTip.x;
    const mirroredMouthX = 1 - facePosition.mouth.x;

    // Calculate center between eyes for better eye-level positioning
    const eyesCenterX = (mirroredLeftEyeX + mirroredRightEyeX) / 2;
    const eyesCenterY = (facePosition.leftEye.y + facePosition.rightEye.y) / 2;

    switch (currentOverlay.position) {
      case 'eyes':
        // Position at the center between the eyes
        x = eyesCenterX * videoSize.width;
        y = eyesCenterY * videoSize.height + currentOverlay.offsetY;
        break;
      case 'head':
        // Position above the face center
        x = mirroredFaceX * videoSize.width;
        y = (facePosition.y - facePosition.height * 0.5) * videoSize.height + currentOverlay.offsetY;
        break;
      case 'nose':
        // Position at nose
        x = mirroredNoseX * videoSize.width;
        y = facePosition.noseTip.y * videoSize.height + currentOverlay.offsetY;
        break;
      case 'mouth':
        // Position at mouth
        x = mirroredMouthX * videoSize.width;
        y = facePosition.mouth.y * videoSize.height + currentOverlay.offsetY;
        break;
      default:
        // 'full' and any other - center on face
        x = mirroredFaceX * videoSize.width;
        y = facePosition.y * videoSize.height + currentOverlay.offsetY;
        break;
    }

    return {
      position: 'absolute' as const,
      left: `${x}px`,
      top: `${y}px`,
      transform: 'translate(-50%, -50%)',
      fontSize: `${baseSize}px`,
      lineHeight: 1,
      pointerEvents: 'none' as const,
      zIndex: 10,
      transition: 'left 0.08s ease-out, top 0.08s ease-out, font-size 0.08s ease-out',
      filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
    };
  };

  return (
    <DraggableBox
      title="Ma Webcam"
      onClose={onClose}
      initialPosition={{ x: 20, y: 100 }}
      width={340}
    >
      <div className="my-webcam-container">
        {/* Video preview */}
        <div className="my-webcam-video" ref={containerRef}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: 10,
              filter: currentFilter.filter,
              transform: currentFilter.transform,
              background: '#000',
              display: 'block',
            }}
          />

          {/* Overlay accessory - follows face */}
          {currentOverlay.id !== 'none' && (
            <div style={getOverlayStyle()}>
              {currentOverlay.emoji}
            </div>
          )}

          {!isVideoEnabled && (
            <div className="webcam-video-off">
              <span>📷</span>
              <p>Vidéo désactivée</p>
            </div>
          )}

          {/* Live indicator */}
          <div className="webcam-live-badge">
            <span className="live-dot" />
            LIVE
            {isDetecting && currentOverlay.id !== 'none' && (
              <span style={{ marginLeft: 4, fontSize: 10 }}>👤</span>
            )}
          </div>

          {/* Current effect name */}
          {(currentFilter.id !== 'none' || currentOverlay.id !== 'none') && (
            <div className="webcam-filter-badge">
              {currentFilter.id !== 'none' && currentFilter.name}
              {currentFilter.id !== 'none' && currentOverlay.id !== 'none' && ' + '}
              {currentOverlay.id !== 'none' && currentOverlay.emoji}
            </div>
          )}
        </div>

        {/* Tab selector */}
        <div className="webcam-tabs">
          <button
            type="button"
            className={`webcam-tab ${activeTab === 'filters' ? 'active' : ''}`}
            onClick={() => setActiveTab('filters')}
          >
            ✨ Filtres
          </button>
          <button
            type="button"
            className={`webcam-tab ${activeTab === 'overlays' ? 'active' : ''}`}
            onClick={() => setActiveTab('overlays')}
          >
            🎭 Masques
          </button>
        </div>

        {/* Filter/Overlay selector */}
        {activeTab === 'filters' ? (
          <div className="webcam-filter-bar">
            <button type="button" className="filter-nav-btn" onClick={prevFilter}>◀</button>
            <button
              type="button"
              className="filter-current-btn"
              onClick={() => { setShowFilters(!showFilters); setShowOverlays(false); }}
            >
              <span className="filter-icon">✨</span>
              <span className="filter-name">{currentFilter.name}</span>
            </button>
            <button type="button" className="filter-nav-btn" onClick={nextFilter}>▶</button>
          </div>
        ) : (
          <div className="webcam-filter-bar">
            <button type="button" className="filter-nav-btn" onClick={prevOverlay}>◀</button>
            <button
              type="button"
              className="filter-current-btn overlay"
              onClick={() => { setShowOverlays(!showOverlays); setShowFilters(false); }}
            >
              <span className="filter-icon">{currentOverlay.emoji}</span>
              <span className="filter-name">{currentOverlay.name}</span>
            </button>
            <button type="button" className="filter-nav-btn" onClick={nextOverlay}>▶</button>
          </div>
        )}

        {/* Filter grid */}
        {showFilters && (
          <div className="webcam-filter-grid">
            {WEBCAM_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`filter-option ${filter.id === currentFilter.id ? 'active' : ''}`}
                onClick={() => { setCurrentFilter(filter); setShowFilters(false); }}
              >
                {filter.name}
              </button>
            ))}
          </div>
        )}

        {/* Overlay grid */}
        {showOverlays && (
          <div className="webcam-overlay-grid">
            {WEBCAM_OVERLAYS.map((overlay) => (
              <button
                key={overlay.id}
                type="button"
                className={`overlay-option ${overlay.id === currentOverlay.id ? 'active' : ''}`}
                onClick={() => { setCurrentOverlay(overlay); setShowOverlays(false); }}
                title={overlay.name}
              >
                <span className="overlay-emoji">{overlay.emoji}</span>
                <span className="overlay-name">{overlay.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="my-webcam-controls">
          <button
            type="button"
            className={`webcam-control-btn ${!isAudioEnabled ? 'off' : ''}`}
            onClick={onToggleAudio}
            title={isAudioEnabled ? 'Couper le micro' : 'Activer le micro'}
          >
            {isAudioEnabled ? '🎤' : '🔇'}
          </button>
          <button
            type="button"
            className={`webcam-control-btn ${!isVideoEnabled ? 'off' : ''}`}
            onClick={onToggleVideo}
            title={isVideoEnabled ? 'Couper la vidéo' : 'Activer la vidéo'}
          >
            {isVideoEnabled ? '📹' : '📷'}
          </button>
          <button
            type="button"
            className="webcam-control-btn stop"
            onClick={onStop}
            title="Arrêter la webcam"
          >
            ⏹
          </button>
        </div>
      </div>
    </DraggableBox>
  );
}
