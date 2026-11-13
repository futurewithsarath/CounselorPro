import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';

interface ConfettiProps {
  durationMs?: number;
  particleCount?: number;
}

export default function Confetti({ durationMs = 2800, particleCount = 75 }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Brand color palette: Emerald, Deep Mint, JoSAA Indigo, Gold, Slate
    const colors = [
      '#009E60', // Emerald Green
      '#047857', // Deep Emerald
      '#10B981', // Mint
      '#F59E0B', // Amber Gold
      '#4F46E5', // Indigo
      '#3B82F6', // Blue
      '#059669'  // Rich Teal
    ];

    const particles = Array.from({ length: particleCount }, () => ({
      x: canvas.width * (0.2 + Math.random() * 0.6), // Launch from central 60%
      y: canvas.height * 0.45,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 12 - 6,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 12,
      opacity: 1,
      gravity: 0.35 + Math.random() * 0.15,
      wobble: Math.random() * 10
    }));

    let animationFrameId: number;
    const startTime = performance.now();

    const render = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += p.vRot;
        p.vx *= 0.98; // Drag
        p.opacity = Math.max(0, 1 - progress);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        // Draw rectangle or circle particle
        if (p.size > 8) {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    animationFrameId = requestAnimationFrame(render);

    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [durationMs, particleCount, prefersReducedMotion]);

  if (prefersReducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[120]"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}

