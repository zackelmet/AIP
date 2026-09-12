"use client";

import { useRef, useEffect } from "react";
import { useTheme } from "@/lib/context/ThemeContext";

interface FlowLine {
  points: { x: number; y: number }[];
  speed: number;
  offset: number;
  alpha: number;
  width: number;
  phase: number;
}

export default function SwirlyParticles({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const linesRef = useRef<FlowLine[]>([]);
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

    const COUNT = 6;
    const lines: FlowLine[] = [];

    for (let i = 0; i < COUNT; i++) {
      const pts: { x: number; y: number }[] = [];
      const segments = 50;
      for (let j = 0; j <= segments; j++) {
        pts.push({ x: 0, y: 0 });
      }
      lines.push({
        points: pts,
        speed: 0.08 + Math.random() * 0.12,
        offset: Math.random() * Math.PI * 2,
        alpha: 0.12 + Math.random() * 0.18,
        width: 1 + Math.random() * 2,
        phase: (i / COUNT) * Math.PI * 2,
      });
    }
    linesRef.current = lines;

    let time = 0;

    const animate = () => {
      time += 0.003;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isDark = theme === "dark";
      const baseColor = isDark ? "52, 211, 153" : "52, 211, 153";

      for (const line of lines) {
        const w = canvas.width;
        const h = canvas.height;

        for (let j = 0; j < line.points.length; j++) {
          const t = j / (line.points.length - 1);
          const x = t * w + Math.sin(time * line.speed + t * 3 + line.phase) * 120 + Math.sin(time * 0.2 + t * 5 + line.offset) * 40;
          const y = h * 0.3 + Math.sin(time * line.speed * 0.7 + t * 2 + line.phase + line.offset) * 80 + Math.sin(time * 0.15 + t * 4) * 30 + t * h * 0.3;
          line.points[j] = { x, y };
        }

        ctx.beginPath();
        ctx.moveTo(line.points[0].x, line.points[0].y);

        for (let j = 1; j < line.points.length - 2; j++) {
          const xc = (line.points[j].x + line.points[j + 1].x) / 2;
          const yc = (line.points[j].y + line.points[j + 1].y) / 2;
          ctx.quadraticCurveTo(line.points[j].x, line.points[j].y, xc, yc);
        }

        const last = line.points.length - 1;
        ctx.quadraticCurveTo(
          line.points[last - 1].x,
          line.points[last - 1].y,
          line.points[last].x,
          line.points[last].y,
        );

        ctx.strokeStyle = `rgba(${baseColor}, ${line.alpha})`;
        ctx.lineWidth = line.width;
        ctx.stroke();
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