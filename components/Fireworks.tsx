import React, { useEffect, useRef, useCallback } from 'react';

// ──────────────────────────────────────────────────────────
// 🎆 Fireworks — Canvas celebration with victory chime
// ──────────────────────────────────────────────────────────

interface FireworksProps {
  /** Duration in ms before auto-dismiss (default 4500) */
  duration?: number;
  /** Called when the animation finishes */
  onComplete?: () => void;
}

// ─── Color palette ───────────────────────────────────────
const COLORS = [
  '#FFD700', // gold
  '#FF6B6B', // coral
  '#4ECDC4', // teal
  '#45B7D1', // sky
  '#96E6A1', // mint
  '#DDA0DD', // plum
  '#FF9F43', // tangerine
  '#A29BFE', // lavender
  '#FD79A8', // pink
  '#00CEC9', // cyan
  '#FFEAA7', // cream
  '#6C5CE7', // purple
];

// ─── Particle type ───────────────────────────────────────
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  decay: number;
  size: number;
  gravity: number;
  friction: number;
  shape: 'circle' | 'rect' | 'star';
}

// ─── Victory chime via Web Audio API ─────────────────────
function playVictorySound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    // Major triad arpeggio: C5 → E5 → G5 → C6
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const durations = [0.12, 0.12, 0.12, 0.35];

    let offset = 0;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + offset);
      
      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.15, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + durations[i]);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + durations[i] + 0.05);
      offset += durations[i] * 0.7;
    });

    // Sparkle shimmer on top
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(2093, now + offset);
    shimmerGain.gain.setValueAtTime(0, now + offset);
    shimmerGain.gain.linearRampToValueAtTime(0.06, now + offset + 0.02);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.4);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    shimmer.start(now + offset);
    shimmer.stop(now + offset + 0.45);

    // Auto close context
    setTimeout(() => ctx.close(), 3000);
  } catch {
    // Silent fail — no audio support
  }
}

// ─── Create a burst of particles at (x, y) ──────────────
function createBurst(x: number, y: number, count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
    const speed = 3 + Math.random() * 6;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 1,
      decay: 0.012 + Math.random() * 0.012,
      size: 2.5 + Math.random() * 4,
      gravity: 0.06 + Math.random() * 0.04,
      friction: 0.98,
      shape: (['circle', 'rect', 'star'] as const)[Math.floor(Math.random() * 3)],
    });
  }
  return particles;
}

// ─── Draw a 5-point star ─────────────────────────────────
function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const spikes = 5;
  const outerRadius = size;
  const innerRadius = size * 0.4;
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(x, y - outerRadius);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(x + Math.cos(rot) * outerRadius, y + Math.sin(rot) * outerRadius);
    rot += step;
    ctx.lineTo(x + Math.cos(rot) * innerRadius, y + Math.sin(rot) * innerRadius);
    rot += step;
  }
  ctx.lineTo(x, y - outerRadius);
  ctx.closePath();
  ctx.fill();
}

// ─── Component ───────────────────────────────────────────
const Fireworks: React.FC<FireworksProps> = ({ duration = 4500, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const soundPlayedRef = useRef(false);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const alive: Particle[] = [];

    for (const p of particlesRef.current) {
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;

      if (p.alpha <= 0) continue;

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'rect') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.vx * 0.3);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      } else {
        drawStar(ctx, p.x, p.y, p.size);
      }

      alive.push(p);
    }

    ctx.globalAlpha = 1;
    particlesRef.current = alive;

    if (alive.length > 0) {
      animRef.current = requestAnimationFrame(animate);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas to full viewport
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Play victory sound once
    if (!soundPlayedRef.current) {
      soundPlayedRef.current = true;
      playVictorySound();
    }

    // Schedule multiple bursts across the screen
    const burstTimers: ReturnType<typeof setTimeout>[] = [];
    const W = canvas.width;
    const H = canvas.height;

    // Initial big burst — center
    particlesRef.current.push(...createBurst(W * 0.5, H * 0.35, 60));

    // Staggered bursts
    const burstPositions = [
      { x: 0.25, y: 0.3, delay: 200, count: 40 },
      { x: 0.75, y: 0.25, delay: 400, count: 45 },
      { x: 0.15, y: 0.5, delay: 700, count: 35 },
      { x: 0.85, y: 0.45, delay: 900, count: 35 },
      { x: 0.5, y: 0.2, delay: 1200, count: 50 },
      { x: 0.35, y: 0.55, delay: 1500, count: 30 },
      { x: 0.65, y: 0.4, delay: 1800, count: 40 },
      { x: 0.5, y: 0.35, delay: 2200, count: 55 },
      { x: 0.2, y: 0.35, delay: 2600, count: 30 },
      { x: 0.8, y: 0.3, delay: 3000, count: 35 },
    ];

    burstPositions.forEach(({ x, y, delay, count }) => {
      const t = setTimeout(() => {
        particlesRef.current.push(...createBurst(W * x, H * y, count));
        if (!animRef.current) {
          animRef.current = requestAnimationFrame(animate);
        }
      }, delay);
      burstTimers.push(t);
    });

    // Start animation
    animRef.current = requestAnimationFrame(animate);

    // Auto-dismiss
    const dismissTimer = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => {
      cancelAnimationFrame(animRef.current);
      burstTimers.forEach(clearTimeout);
      clearTimeout(dismissTimer);
      window.removeEventListener('resize', resize);
    };
  }, [animate, duration, onComplete]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[9999] pointer-events-none"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};

export default Fireworks;
