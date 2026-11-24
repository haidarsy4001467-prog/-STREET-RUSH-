import React, { useEffect, useRef } from 'react';
import { drawTopDownCar } from '../game/carRenderer';
import type { CarSpec } from '../game/types';

interface CarPreviewCanvasProps {
  car: CarSpec;
  width?: number;
  height?: number;
  showNitro?: boolean;
  isNight?: boolean;
  className?: string;
}

export const CarPreviewCanvas: React.FC<CarPreviewCanvasProps> = ({
  car,
  width = 140,
  height = 170,
  showNitro = false,
  isNight = true,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const start = performance.now();

    const render = (now: number) => {
      const t = (now - start) / 1000;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Subtle floor lane markings
      ctx.fillStyle = isNight ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)';
      const laneOffset = (t * 90) % 36;
      for (let y = laneOffset - 36; y < height + 36; y += 36) {
        ctx.fillRect(width / 2 - 1.5, y, 3, 18);
      }

      drawTopDownCar(ctx, {
        x: width / 2,
        y: height / 2 + Math.sin(t * 2.5) * 2.5,
        width: 54,
        height: 104,
        primaryColor: car.primaryColor,
        secondaryColor: car.secondaryColor,
        accentColor: car.accentColor,
        bodyStyle: car.bodyStyle,
        isNight,
        nitroActive: showNitro,
        timeSec: t,
        isPlayer: true,
      });

      if (showNitro) {
        rafId = window.requestAnimationFrame(render);
      }
    };

    rafId = window.requestAnimationFrame(render);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [car, width, height, showNitro, isNight]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: `${width}px`, height: `${height}px` }}
      className={className}
      aria-label={car.nameAr}
    />
  );
};
