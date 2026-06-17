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
  const lastXRef = useRef<number | null>(null);
  const lastYRef = useRef<number | null>(null);
  const lastInteractionTime = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.save();
    // 1. Fill with a high-luxury realistic metallic silver/steel gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#CFD8DC'); // elegant silver metal light
    gradient.addColorStop(0.3, '#ECEFF1'); // intense metallic shine
    gradient.addColorStop(0.7, '#78909C'); // metallic shadow
    gradient.addColorStop(1, '#CFD8DC'); // midtone steel
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Add realistic silver grain/metallic glitter noise
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.15)';
      const px = Math.random() * width;
      const py = Math.random() * height;
      ctx.fillRect(px, py, Math.random() * 2 + 1, Math.random() * 2 + 1);
    }

    // 3. Draw luxury diagonal crosshatch scratch pattern lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 12) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let j = 0; j < height; j += 12) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(width, j);
      ctx.stroke();
    }

    // 4. Draw lucky clover / stars / diamond watermarks
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillText('🍀', 25, 25);
    ctx.fillText('⭐', width - 25, 25);
    ctx.fillText('💎', 25, height - 25);
    ctx.fillText('🍀', width - 25, height - 25);

    // 5. Draw some 'scratch me' instruction texts with dropshadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 4;
    ctx.font = '900 18px "Inter", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.strokeText('✨ RASPE COM O DEDO ✨', width / 2, height / 2 - 12);
    ctx.fillText('✨ RASPE COM O DEDO ✨', width / 2, height / 2 - 12);

    ctx.font = '900 11px "Inter", sans-serif';
    ctx.fillStyle = '#1E293B';
    ctx.fillText('REVELE SEU PRÊMIO SAUDÁVEL!', width / 2, height / 2 + 14);
    ctx.restore();
  }, [width, height]);

  const getPointerPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      if (e.touches.length === 0) return { x: lastXRef.current || 0, y: lastYRef.current || 0 };
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
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
    const pos = getPointerPos(e);
    lastXRef.current = pos.x;
    lastYRef.current = pos.y;
    scratch(e);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || isFinished) return;
    scratch(e);
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    lastXRef.current = null;
    lastYRef.current = null;
    checkFinish();
  };

  const scratch = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const { x, y } = getPointerPos(e);

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = brushSize * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (lastXRef.current !== null && lastYRef.current !== null) {
      ctx.beginPath();
      ctx.moveTo(lastXRef.current, lastYRef.current);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, brushSize, 0, 2 * Math.PI, false);
      ctx.fill();
    }
    ctx.restore();

    lastXRef.current = x;
    lastYRef.current = y;
    
    const now = Date.now();
    if (now - lastInteractionTime.current > 60) {
      playSfx('scratch');
      vibrate(8);
      lastInteractionTime.current = now;
    }
  };

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
      className="relative select-none overflow-hidden rounded-[24px] shadow-lg border border-slate-200/50 dark:border-slate-700/50"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <div className="absolute inset-0 z-0 flex items-center justify-center bg-slate-900">
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
             background: 'linear-gradient(135deg, #CFD8DC 0%, #78909C 100%)',
           }}
        />
      )}
    </div>
  );
}
