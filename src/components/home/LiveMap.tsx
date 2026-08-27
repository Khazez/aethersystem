"use client";

import { useEffect, useRef } from "react";

/**
 * Диспетчерская карта: борта идут по маршрутам в реальном времени.
 *
 * Что здесь движется постоянно: воздушные суда ползут по своим
 * траекториям, за ними тянется след, вокруг станций расходятся круги
 * радиолокационного обзора, зоны ограничений пульсируют. Ничего не
 * стоит на месте — это и создаёт ощущение работающей системы.
 */

type Craft = {
  /** Положение на маршруте от 0 до 1. */
  t: number;
  speed: number;
  path: Array<[number, number]>;
  /** Хвост из недавних позиций — рисуется как след. */
  trail: Array<[number, number]>;
};

export default function LiveMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let width = 0;
    let height = 0;
    let running = true;
    let frameId = 0;
    let time = 0;

    /* Маршруты, станции и зоны задаются в долях экрана — тогда карта
       одинаково выглядит на любом размере окна. */
    const routes: Array<Array<[number, number]>> = [
      [[0.05, 0.28], [0.3, 0.2], [0.58, 0.34], [0.86, 0.24]],
      [[0.12, 0.78], [0.36, 0.62], [0.62, 0.7], [0.94, 0.55]],
      [[0.72, 0.9], [0.6, 0.62], [0.68, 0.36], [0.88, 0.12]],
      [[0.02, 0.52], [0.28, 0.46], [0.52, 0.54], [0.78, 0.44]],
      [[0.22, 0.06], [0.34, 0.34], [0.28, 0.6], [0.4, 0.92]],
    ];

    const stations: Array<[number, number]> = [
      [0.18, 0.34],
      [0.52, 0.7],
      [0.8, 0.28],
      [0.36, 0.5],
    ];

    const zones: Array<[number, number, number]> = [
      [0.66, 0.52, 0.07],
      [0.24, 0.68, 0.05],
    ];

    let craft: Craft[] = [];

    const build = () => {
      craft = [];
      for (const path of routes) {
        // По два борта на маршрут, с разным отставанием друг от друга.
        for (let k = 0; k < 2; k++) {
          craft.push({
            t: Math.random(),
            speed: 0.00028 + Math.random() * 0.00042,
            path,
            trail: [],
          });
        }
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    /** Точка на ломаной по параметру 0..1. */
    const along = (path: Array<[number, number]>, t: number): [number, number] => {
      const segments = path.length - 1;
      const pos = Math.min(0.9999, Math.max(0, t)) * segments;
      const i = Math.floor(pos);
      const f = pos - i;
      const [x1, y1] = path[i];
      const [x2, y2] = path[i + 1];
      return [
        (x1 + (x2 - x1) * f) * width,
        (y1 + (y2 - y1) * f) * height,
      ];
    };

    const draw = () => {
      if (!running) return;
      time += 0.016;

      ctx.clearRect(0, 0, width, height);

      /* --- Координатная сетка --- */
      ctx.strokeStyle = "rgba(75, 200, 224, 0.05)";
      ctx.lineWidth = 1;
      const step = 90;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      /* --- Зоны ограничений: пульсируют --- */
      for (const [zx, zy, zr] of zones) {
        const pulse = 0.5 + 0.5 * Math.sin(time * 1.6);
        const r = zr * Math.min(width, height);
        const cx = zx * width;
        const cy = zy * height;

        ctx.fillStyle = `rgba(224, 85, 79, ${0.05 + pulse * 0.05})`;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(224, 85, 79, ${0.3 + pulse * 0.28})`;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      /* --- Маршруты --- */
      ctx.strokeStyle = "rgba(75, 200, 224, 0.2)";
      ctx.lineWidth = 1;
      for (const path of routes) {
        ctx.beginPath();
        path.forEach(([px, py], i) => {
          const x = px * width;
          const y = py * height;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      /* --- Станции: расходящиеся круги обзора --- */
      for (const [sx, sy] of stations) {
        const cx = sx * width;
        const cy = sy * height;

        // Три круга с разным отставанием — волна обзора.
        for (let k = 0; k < 3; k++) {
          const phase = ((time * 0.4 + k / 3) % 1);
          const r = phase * 90;
          ctx.strokeStyle = `rgba(53, 208, 127, ${(1 - phase) * 0.32})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = "rgba(53, 208, 127, 0.9)";
        ctx.fillRect(cx - 3, cy - 3, 6, 6);
      }

      /* --- Воздушные суда --- */
      for (const c of craft) {
        c.t += c.speed;
        if (c.t > 1) {
          c.t = 0;
          c.trail = [];
        }

        const [x, y] = along(c.path, c.t);

        c.trail.push([x, y]);
        if (c.trail.length > 26) c.trail.shift();

        // След — чем дальше от борта, тем прозрачнее.
        for (let i = 1; i < c.trail.length; i++) {
          const alpha = (i / c.trail.length) * 0.5;
          ctx.strokeStyle = `rgba(178, 226, 244, ${alpha})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(c.trail[i - 1][0], c.trail[i - 1][1]);
          ctx.lineTo(c.trail[i][0], c.trail[i][1]);
          ctx.stroke();
        }

        // Направление движения — для разворота метки борта.
        const [px, py] = along(c.path, Math.max(0, c.t - 0.01));
        const angle = Math.atan2(y - py, x - px);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = "rgba(210, 240, 250, 0.95)";
        ctx.beginPath();
        ctx.moveTo(7, 0);
        ctx.lineTo(-4, 3.4);
        ctx.lineTo(-4, -3.4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Кольцо вокруг борта — отметка сопровождения.
        ctx.strokeStyle = "rgba(75, 200, 224, 0.4)";
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.arc(x, y, 11, 0, Math.PI * 2);
        ctx.stroke();
      }

      frameId = requestAnimationFrame(draw);
    };

    resize();
    build();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frameId);
      } else if (!reduceMotion) {
        running = true;
        frameId = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (reduceMotion) {
      draw();
      running = false;
      cancelAnimationFrame(frameId);
    } else {
      frameId = requestAnimationFrame(draw);
    }

    return () => {
      running = false;
      cancelAnimationFrame(frameId);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="h-full w-full" />;
}
