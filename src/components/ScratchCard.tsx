import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { playSfx, vibrate } from '../lib/sensory';

interface ScratchCardProps {
  children: React.ReactNode;
  onComplete?: () => void;
  width?: number;
  height?: number;
  brushSize?: number;
  finishPercent?: number;
}

export function ScratchCard({
  children,
  onComplete,
  width = 300,
  height = 300,
  brushSize = 30,
  finishPercent = 60,
}: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastInteractionTime = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Fill with a stylish cover
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f59e0b'); // amber-500
    gradient.addColorStop(1, '#d97706'); // amber-600
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw some 'scratch me' or pattern text overlay
    ctx.font = 'bold 24px serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Raspe Aqui', width / 2, height / 2);

    ctx.globalCompositeOperation = 'destination-out';
  }, [width, height]);

  const getPointerPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    // Calculate scale if canvas is styled responsively
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const checkFinish = () => {
    if (isFinished) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const pixels = ctx.getImageData(0, 0, width, height).data;
    let transparent = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) transparent++;
    }

    const percentage = (transparent / (pixels.length / 4)) * 100;
    if (percentage >= finishPercent) {
      setIsFinished(true);
      if (onComplete) onComplete();
      playSfx('success');
      vibrate([50, 100, 50]);
    }
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isFinished) return;
    setIsDrawing(true);
    scratch(e);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || isFinished) return;
    // Prevent default scrolling on mobile if touching canvas
    if (e.cancelable) {
       // Cannot e.preventDefault() in React synthetic events for passive listeners usually,
       // but we handle it by CSS touch-action: none.
    }
    scratch(e);
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    checkFinish();
  };

  const scratch = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const { x, y } = getPointerPos(e);

    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, 2 * Math.PI, false);
    ctx.fill();
    
    const now = Date.now();
    if (now - lastInteractionTime.current > 100) {
      playSfx('scratch');
      vibrate(5);
      lastInteractionTime.current = now;
    }
  };

  // Add native event listeners to prevent scrolling when dragging on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onTouchMove = (e: TouchEvent) => {
      if (isDrawing && !isFinished) {
        e.preventDefault();
      }
    };
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      canvas.removeEventListener('touchmove', onTouchMove);
    };
  }, [isDrawing, isFinished]);

  return (
    <div 
      ref={containerRef} 
      className="relative select-none overflow-hidden rounded-[24px] shadow-lg"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <div className="absolute inset-0 z-0 flex items-center justify-center bg-white dark:bg-slate-800">
        {children}
      </div>
      
      {!isFinished && (
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="absolute inset-0 z-10 cursor-crosshair"
          style={{ touchAction: 'none', width: '100%', height: '100%' }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          onTouchCancel={handlePointerUp}
        />
      )}
      
      {isFinished && (
        <motion.div
           initial={{ opacity: 1 }}
           animate={{ opacity: 0, scale: 1.1 }}
           transition={{ duration: 0.5 }}
           className="absolute inset-0 z-10 pointer-events-none"
           style={{
             background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
           }}
        />
      )}
    </div>
  );
}
