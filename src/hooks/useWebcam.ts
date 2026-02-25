import { useState, useRef, useCallback, useEffect } from 'react';

interface WebcamOptions {
  video?: boolean | MediaTrackConstraints;
  audio?: boolean | MediaTrackConstraints;
}

interface UseWebcamReturn {
  stream: MediaStream | null;
  isActive: boolean;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  startWebcam: (options?: WebcamOptions) => Promise<MediaStream | null>;
  stopWebcam: () => void;
  toggleWebcam: () => Promise<void>;
  toggleAudio: () => void;
  toggleVideo: () => void;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
}

export function useWebcam(): UseWebcamReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startWebcam = useCallback(async (options?: WebcamOptions): Promise<MediaStream | null> => {
    try {
      setError(null);

      const constraints: MediaStreamConstraints = {
        video: options?.video ?? {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: options?.audio ?? true,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      setStream(mediaStream);
      setIsActive(true);
      setIsAudioEnabled(true);
      setIsVideoEnabled(true);

      // Attach to video element if available
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      console.log('📹 Webcam started');
      return mediaStream;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('❌ Webcam error:', errorMessage);

      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        setError('Permission refusée. Veuillez autoriser l\'accès à la caméra.');
      } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('DevicesNotFoundError')) {
        setError('Aucune caméra détectée.');
      } else {
        setError(`Erreur: ${errorMessage}`);
      }

      setIsActive(false);
      return null;
    }
  }, []);

  const stopWebcam = useCallback(() => {
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      setStream(null);
      setIsActive(false);

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      console.log('📹 Webcam stopped');
    }
  }, [stream]);

  const toggleWebcam = useCallback(async () => {
    if (isActive) {
      stopWebcam();
    } else {
      await startWebcam();
    }
  }, [isActive, startWebcam, stopWebcam]);

  const toggleAudio = useCallback(() => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      for (const track of audioTracks) {
        track.enabled = !track.enabled;
      }
      setIsAudioEnabled(prev => !prev);
    }
  }, [stream]);

  const toggleVideo = useCallback(() => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      for (const track of videoTracks) {
        track.enabled = !track.enabled;
      }
      setIsVideoEnabled(prev => !prev);
    }
  }, [stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
      }
    };
  }, [stream]);

  return {
    stream,
    isActive,
    error,
    videoRef,
    startWebcam,
    stopWebcam,
    toggleWebcam,
    toggleAudio,
    toggleVideo,
    isAudioEnabled,
    isVideoEnabled,
  };
}
