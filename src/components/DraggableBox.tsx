import { useState, useRef, useEffect, type ReactNode } from 'react';

interface DraggableBoxProps {
  children: ReactNode;
  title: string;
  onClose: () => void;
  initialPosition?: { x: number; y: number };
  width?: number;
  minWidth?: number;
}

export function DraggableBox({
  children,
  title,
  onClose,
  initialPosition,
  width = 320,
  minWidth = 280,
}: DraggableBoxProps) {
  const [position, setPosition] = useState(
    initialPosition || { x: window.innerWidth / 2 - width / 2, y: 100 }
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const boxRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.draggable-header')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(window.innerWidth - width, e.clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.y));
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, width]);

  // Touch support
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.draggable-header')) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragOffset({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y,
      });
    }
  };

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        const touch = e.touches[0];
        const newX = Math.max(0, Math.min(window.innerWidth - width, touch.clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 100, touch.clientY - dragOffset.y));
        setPosition({ x: newX, y: newY });
      }
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragOffset, width]);

  return (
    <div
      ref={boxRef}
      className="draggable-box"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: Math.max(minWidth, width),
        zIndex: 1000,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div className="draggable-header">
        <span className="draggable-title">{title}</span>
        <button type="button" className="draggable-close" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="draggable-content">
        {children}
      </div>
    </div>
  );
}
