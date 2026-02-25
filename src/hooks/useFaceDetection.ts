import { useEffect, useRef, useState, useCallback } from 'react';

interface FacePosition {
  x: number; // Center X (0-1)
  y: number; // Center Y (0-1)
  width: number; // Face width (0-1)
  height: number; // Face height (0-1)
  // Key points
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  noseTip: { x: number; y: number };
  mouth: { x: number; y: number };
  leftEar: { x: number; y: number };
  rightEar: { x: number; y: number };
}

interface UseFaceDetectionProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled: boolean;
}

export function useFaceDetection({ videoRef, enabled }: UseFaceDetectionProps) {
  const [facePosition, setFacePosition] = useState<FacePosition | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const detectFace = useCallback(() => {
    if (!videoRef.current || !enabled) {
      setFacePosition(null);
      return;
    }

    const video = videoRef.current;

    // Create canvas if not exists
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.videoWidth === 0) {
      animationFrameRef.current = requestAnimationFrame(detectFace);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    ctx.drawImage(video, 0, 0);

    // Improved face detection using skin color heuristic
    // Focus on the upper portion of the frame where the face is likely to be
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const skinPixels: { x: number; y: number }[] = [];

    // Focus on upper 70% of frame (face is usually there)
    const searchHeight = Math.floor(canvas.height * 0.7);

    // Sample every 6th pixel for better accuracy while maintaining performance
    for (let y = 0; y < searchHeight; y += 6) {
      for (let x = 0; x < canvas.width; x += 6) {
        const i = (y * canvas.width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Improved skin color detection for various skin tones
        // Using YCbCr color space approximation
        const isSkin = (
          // Light to medium skin tones
          (r > 95 && g > 40 && b > 20 &&
           r > g && r > b &&
           (r - Math.min(g, b)) > 15 &&
           Math.abs(r - g) > 15) ||
          // Darker skin tones
          (r > 60 && g > 40 && b > 30 &&
           r > b && g > b &&
           (r - b) > 10 &&
           Math.abs(r - g) < 50)
        );

        if (isSkin) {
          skinPixels.push({ x, y });
        }
      }
    }

    if (skinPixels.length > 80) {
      // Find the largest cluster of skin pixels (likely the face)
      // Simple approach: find the centroid of the upper portion of skin pixels

      // Sort by Y to find upper region (face area)
      skinPixels.sort((a, b) => a.y - b.y);

      // Take the upper portion of detected skin (more likely to be face)
      const upperPixels = skinPixels.slice(0, Math.floor(skinPixels.length * 0.6));

      let minX = canvas.width;
      let maxX = 0;
      let minY = canvas.height;
      let maxY = 0;
      let sumX = 0;
      let sumY = 0;

      for (const p of upperPixels) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
        sumX += p.x;
        sumY += p.y;
      }

      const centerX = sumX / upperPixels.length;
      const centerY = sumY / upperPixels.length;
      const width = maxX - minX;
      let height = maxY - minY;

      // Adjust face bounding box to be more proportional (face is roughly 1:1.3 ratio)
      const expectedHeight = width * 1.3;
      if (height < expectedHeight) {
        height = expectedHeight;
      }

      // Only update if reasonable face size (not too small, not too large)
      const minFaceSize = canvas.width * 0.1;
      const maxFaceSize = canvas.width * 0.8;

      if (width > minFaceSize && width < maxFaceSize && height > minFaceSize) {
        // Calculate key points with better proportions based on face anatomy
        // Eye line is typically at 40% from top of face
        // Nose is at 60-65% from top
        // Mouth is at 75-80% from top

        const eyeLineY = minY + height * 0.38;
        const noseY = minY + height * 0.60;
        const mouthY = minY + height * 0.78;

        // Eyes are typically 30% apart from center each
        const eyeSpacing = width * 0.22;

        const faceData: FacePosition = {
          x: centerX / canvas.width,
          y: (minY + height * 0.45) / canvas.height, // Slightly above center
          width: width / canvas.width,
          height: height / canvas.height,
          // Key points based on facial proportions
          leftEye: {
            x: (centerX - eyeSpacing) / canvas.width,
            y: eyeLineY / canvas.height
          },
          rightEye: {
            x: (centerX + eyeSpacing) / canvas.width,
            y: eyeLineY / canvas.height
          },
          noseTip: {
            x: centerX / canvas.width,
            y: noseY / canvas.height
          },
          mouth: {
            x: centerX / canvas.width,
            y: mouthY / canvas.height
          },
          leftEar: {
            x: (minX - width * 0.05) / canvas.width,
            y: eyeLineY / canvas.height
          },
          rightEar: {
            x: (maxX + width * 0.05) / canvas.width,
            y: eyeLineY / canvas.height
          },
        };

        setFacePosition(faceData);
        setIsDetecting(true);
      }
    } else {
      // No face detected - use center fallback
      setFacePosition({
        x: 0.5,
        y: 0.4,
        width: 0.4,
        height: 0.5,
        leftEye: { x: 0.4, y: 0.35 },
        rightEye: { x: 0.6, y: 0.35 },
        noseTip: { x: 0.5, y: 0.45 },
        mouth: { x: 0.5, y: 0.6 },
        leftEar: { x: 0.3, y: 0.4 },
        rightEar: { x: 0.7, y: 0.4 },
      });
      setIsDetecting(false);
    }

    animationFrameRef.current = requestAnimationFrame(detectFace);
  }, [videoRef, enabled]);

  useEffect(() => {
    if (enabled) {
      animationFrameRef.current = requestAnimationFrame(detectFace);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, detectFace]);

  return { facePosition, isDetecting };
}
