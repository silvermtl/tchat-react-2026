import { useCallback, useRef } from 'react';

export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    try {
      const audioContext = getAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
      console.warn('Audio not supported:', error);
    }
  }, [getAudioContext]);

  const playMessageSound = useCallback(() => {
    playTone(800, 0.1, 'sine');
    setTimeout(() => playTone(1000, 0.15, 'sine'), 100);
  }, [playTone]);

  const playPrivateMessageSound = useCallback(() => {
    playTone(600, 0.1, 'sine');
    setTimeout(() => playTone(800, 0.1, 'sine'), 100);
    setTimeout(() => playTone(1000, 0.2, 'sine'), 200);
  }, [playTone]);

  const playJoinSound = useCallback(() => {
    playTone(400, 0.15, 'sine');
    setTimeout(() => playTone(600, 0.2, 'sine'), 150);
  }, [playTone]);

  const playLeaveSound = useCallback(() => {
    playTone(600, 0.15, 'sine');
    setTimeout(() => playTone(400, 0.2, 'sine'), 150);
  }, [playTone]);

  const playKickSound = useCallback(() => {
    playTone(300, 0.3, 'square');
  }, [playTone]);

  const playBanSound = useCallback(() => {
    playTone(200, 0.2, 'square');
    setTimeout(() => playTone(150, 0.3, 'square'), 200);
  }, [playTone]);

  return {
    playMessageSound,
    playPrivateMessageSound,
    playJoinSound,
    playLeaveSound,
    playKickSound,
    playBanSound,
  };
}
