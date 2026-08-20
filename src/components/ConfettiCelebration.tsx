import React, { useEffect, useRef } from 'react';
import { playSfx, vibrate } from '../lib/sensory';

interface ConfettiCelebrationProps {
  active: boolean;
  onComplete?: () => void;
  mode?: 'sides' | 'center' | 'all';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  shape: 'square' | 'circle' | 'triangle' | 'streamer' | 'star';
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  scaleY: number; // for rotating 3D paper leaf look
}

export function ConfettiCelebration({ active, onComplete, mode = 'all' }: ConfettiCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particles = useRef<Particle[]>([]);
  const animationFrameId = useRef<number | null>(null);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
    if (active) {
      triggerConfetti();
    }
  }, [active]);

  const triggerConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to direct window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#10b981', 
      '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', 
      '#ec4899', '#f43f5e', '#a855f7'
    ];
    
    const shapes: Particle['shape'][] = ['square', 'circle', 'triangle', 'streamer', 'star'];
    const pArray: Particle[] = [];

    // Trigger powerful sound synthesis
    playSfx('confetti');
    vibrate([80, 50, 80]);

    const addParticles = (startX: number, startY: number, angleRange: [number, number], velocityMultiplier: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const angle = angleRange[0] + Math.random() * (angleRange[1] - angleRange[0]);
        const speed = (8 + Math.random() * 18) * velocityMultiplier;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * 8 + 6;
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        
        pArray.push({
          x: startX,
          y: startY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          size,
          shape,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 10,
          opacity: 1,
          scaleY: Math.random(),
        });
      }
    };

    // Instantiate particles based on selected mode
    if (mode === 'sides' || mode === 'all') {
      // Left cannon (ejects up and to the right: angles from -65 to -15 degrees)
      addParticles(
        0, 
        canvas.height * 0.85, 
        [-Math.PI * 0.45, -Math.PI * 0.05], 
        1.5, 
        75
      );
      
      // Right cannon (ejects up and to the left: angles from -165 to -115 degrees)
      addParticles(
        canvas.width, 
        canvas.height * 0.85, 
        [-Math.PI * 0.95, -Math.PI * 0.55], 
        1.5, 
        75
      );
    } 
    
    if (mode === 'center' || mode === 'all') {
      // Center burst (sprays in 360 upward fountain)
      addParticles(
        canvas.width / 2, 
        canvas.height * 0.45, 
        [-Math.PI * 0.90, -Math.PI * 0.10], 
        0.8, 
        80
      );
    }

    particles.current = pArray;

    const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
      let rot = (Math.PI / 2) * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
      ctx.fill();
    };

    const update = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = false;

      particles.current.forEach((p) => {
        // Physical forces
        p.vy += 0.28; // Gravity
        p.vx *= 0.98; // Air friction / drag
        p.vy *= 0.985;
        
        p.x += p.vx;
        p.y += p.vy;

        // Rotation & flutter dynamics
        p.rotation += p.rotationSpeed;
        p.scaleY = Math.sin(p.rotation / 18);

        // Fade out when they reach the bottom or after some time
        if (p.y > canvas.height * 0.7) {
          p.opacity -= 0.015;
        }

        if (p.opacity > 0 && p.y < canvas.height && p.x > -50 && p.x < canvas.width + 50) {
          alive = true;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.scale(1, p.scaleY);
          
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity;

          ctx.shadowBlur = 4;
          ctx.shadowColor = p.color;

          if (p.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, 2 * Math.PI);
            ctx.fill();
          } else if (p.shape === 'triangle') {
            ctx.beginPath();
            ctx.moveTo(0, -p.size / 2);
            ctx.lineTo(p.size / 2, p.size / 2);
            ctx.lineTo(-p.size / 2, p.size / 2);
            ctx.closePath();
            ctx.fill();
          } else if (p.shape === 'streamer') {
            ctx.beginPath();
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = p.color;
            ctx.moveTo(-p.size / 2, -p.size / 2);
            ctx.bezierCurveTo(0, -p.size, p.size / 2, 0, p.size / 2, p.size / 2);
            ctx.stroke();
          } else if (p.shape === 'star') {
            drawStar(ctx, 0, 0, 5, p.size / 1.5, p.size / 3);
          } else {
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          }

          ctx.restore();
        }
      });

      if (alive && activeRef.current) {
        animationFrameId.current = requestAnimationFrame(update);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (onComplete) onComplete();
      }
    };

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    update();
  };

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas && active) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999] w-screen h-screen"
      style={{ touchAction: 'none' }}
    />
  );
}
