import { useState, useEffect } from 'react';

interface SoundSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SoundSettings({ isOpen, onClose }: SoundSettingsProps) {
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('chat-sound-muted');
    return saved === 'true';
  });

  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('chat-sound-volume');
    return saved ? Number.parseFloat(saved) : 0.2;
  });

  const [reduceMotion, setReduceMotion] = useState(() => {
    const saved = localStorage.getItem('chat-reduce-motion');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    localStorage.setItem('chat-sound-muted', String(isMuted));
  }, [isMuted]);

  useEffect(() => {
    localStorage.setItem('chat-sound-volume', String(volume));
  }, [volume]);

  useEffect(() => {
    localStorage.setItem('chat-reduce-motion', String(reduceMotion));
    if (reduceMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  }, [reduceMotion]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-[#0f2137] border border-[#1a4a5e] rounded-xl shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1a4a5e]">
          <h3 className="text-lg font-bold text-white">Paramètres</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1a3a52] flex items-center justify-center hover:bg-[#2a4a62] transition-colors text-[#8ba3b8]"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Sound Section */}
          <div>
            <h4 className="text-sm font-semibold text-[#8ba3b8] uppercase mb-4">Sons</h4>

            {/* Mute toggle */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[#00d9c0]" fill="currentColor" viewBox="0 0 24 24">
                  {isMuted ? (
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                  ) : (
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                  )}
                </svg>
                <span className="text-white">Sons des notifications</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  isMuted ? 'bg-[#1a3a52]' : 'bg-[#00d9c0]'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    isMuted ? 'left-1' : 'left-7'
                  }`}
                />
              </button>
            </div>

            {/* Volume slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#8ba3b8] text-sm">Volume</span>
                <span className="text-[#00d9c0] text-sm">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(Number.parseFloat(e.target.value))}
                disabled={isMuted}
                className="w-full h-2 bg-[#1a3a52] rounded-lg appearance-none cursor-pointer accent-[#00d9c0] disabled:opacity-50"
              />
            </div>
          </div>

          {/* Accessibility Section */}
          <div>
            <h4 className="text-sm font-semibold text-[#8ba3b8] uppercase mb-4">Accessibilité</h4>

            {/* Reduce motion toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[#00d9c0]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                </svg>
                <span className="text-white">Réduire les animations</span>
              </div>
              <button
                type="button"
                onClick={() => setReduceMotion(!reduceMotion)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  reduceMotion ? 'bg-[#00d9c0]' : 'bg-[#1a3a52]'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    reduceMotion ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1a4a5e]">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-[#00d9c0] text-[#0a1628] rounded-lg font-medium hover:bg-[#00ff88] transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </>
  );
}
