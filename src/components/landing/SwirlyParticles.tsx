"use client";

import { useRef, useEffect } from "react";
import { useTheme } from "@/lib/context/ThemeContext";

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  angle: number;
  radius: number;
  offset: number;
  alpha: number;
  pulseSpeed: number;
}

export default function SwirlyParticles({
  className = "",
}: {
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number>(0);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const COUNT = 80;
    const particles: Particle[] = [];

    for (let i = 0; i < COUNT; i++) {
      const angle = (i / COUNT) * Math.PI * 2;
      particles.push({
        x: 0,
        y: 0,
        size: 1.5 + Math.random() * 2.5,
        speed: 0.15 + Math.random() * 0.25,
        angle,
        radius: 60 + Math.random() * 200,
        offset: Math.random() * Math.PI * 2,
        alpha: 0.15 + Math.random() * 0.4,
        pulseSpeed: 0.01 + Math.random() * 0.03,
      });
    }
    particlesRef.current = particles;

    const cx = canvas.width / 2;
    const cy = canvas.height * 0.5;

    let time = 0;

    const animate = () => {
      time += 0.005;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isDark = theme === "dark";
      const baseColor = isDark ? "52, 211, 153" : "52, 211, 153";

      for (const p of particles) {
        const a = p.angle + time * p.speed;
        const r = p.radius + Math.sin(time * 0.3 + p.offset) * 30;
        const px = cx + Math.cos(a) * r;
        const py =
          cy + Math.sin(a) * r * 0.5 + Math.sin(a * 1.5 + p.offset) * 20;

        p.x = px;
        p.y = py;
        p.alpha =
          0.15 +
          Math.random() * 0.35 +
          Math.sin(time * p.pulseSpeed + p.offset) * 0.15;

        const alpha = Math.max(0, Math.min(1, p.alpha));
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${baseColor}, ${alpha})`;
        ctx.fill();
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}
