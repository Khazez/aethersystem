"use client";

import { useEffect, useRef } from "react";

/**
 * ВАРИАНТ A — «ПРОЛЁТ».
 *
 * Непрерывный полёт вперёд сквозь воздушное пространство. Навстречу
 * летят слои сетки, узлы воздушных судов и линии маршрутов. Ощущение
 * скорости даёт не количество объектов, а то, что они уходят за спину:
 * приближаясь, они разгоняются и увеличиваются.
 *
 * Сделано на canvas в 2D с ручной перспективой, а не на WebGL: для
 * туннельного полёта достаточно простой формулы, зато сцена запускается
 * мгновенно и идёт плавно даже на слабом ноутбуке.
 */

type Particle = {
  x: number;
  y: number;
  /** Глубина: чем меньше, тем ближе к зрителю. */
  z: number;
  kind: "node" | "ring" | "alert";
  seed: number;
};

const DEPTH = 1000;

export default function FlightScene({
  /** Дополнительная скорость от прокрутки страницы. */
  boostRef,
}: {
  boostRef?: React.RefObject<{ value: number }>;
}) {
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
    let particles: Particle[] = [];
    let running = true;
    let frameId = 0;

    /** Фокусное расстояние — управляет силой перспективы. */
    const FOCAL = 320;

    const build = () => {
      const count = Math.round(
        Math.min(420, Math.max(150, (width * height) / 4200)),
      );

      particles = Array.from({ length: count }, (_, i) => ({
        // Разброс по ширине больше экрана: объекты влетают и по краям.
        x: (Math.random() - 0.5) * width * 2.4,
        y: (Math.random() - 0.5) * height * 2.4,
        z: Math.random() * DEPTH,
        kind: i % 23 === 0 ? "alert" : i % 7 === 0 ? "ring" : "node",
        seed: Math.random() * Math.PI * 2,
      }));
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };

    let time = 0;

    const draw = () => {
      if (!running) return;

      time += 0.016;
      const boost = boostRef?.current?.value ?? 0;
      // Базовая скорость плюс разгон от прокрутки.
      const speed = 5.5 + boost * 26;

      // Лёгкий шлейф вместо полной очистки — движение «смазывается»,
      // и полёт читается как быстрый.
      ctx.fillStyle = "rgba(4, 7, 10, 0.34)";
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      /* Слои сетки, летящие навстречу. Каждый слой — прямоугольная
         рамка, которая по мере приближения раздувается за края экрана. */
      const LAYERS = 14;
      for (let i = 0; i < LAYERS; i++) {
        // Слои равномерно распределены по глубине и циклически
        // возвращаются назад, создавая бесконечный коридор.
        const z = ((i / LAYERS) * DEPTH + DEPTH - ((time * speed * 14) % DEPTH)) % DEPTH;
        if (z < 1) continue;

        const scale = FOCAL / z;
        const w = width * 0.9 * scale * 2.2;
        const h = height * 0.9 * scale * 2.2;
        const fade = Math.max(0, 1 - z / DEPTH);

        ctx.strokeStyle = `rgba(75, 200, 224, ${fade * 0.16})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);

        // Деления по краям рамки — техническая разметка коридора.
        if (fade > 0.25) {
          ctx.strokeStyle = `rgba(75, 200, 224, ${fade * 0.3})`;
          const tick = 9 * scale * 2.2;
          for (const [tx, ty] of [
            [cx - w / 2, cy],
            [cx + w / 2, cy],
            [cx, cy - h / 2],
            [cx, cy + h / 2],
          ]) {
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(
              tx + (tx === cx ? 0 : tx < cx ? tick : -tick),
              ty + (ty === cy ? 0 : ty < cy ? tick : -tick),
            );
            ctx.stroke();
          }
        }
      }

      /* Объекты в пространстве */
      for (const p of particles) {
        p.z -= speed;

        // Улетел за спину — возвращаем в самую даль.
        if (p.z <= 1) {
          p.z = DEPTH;
          p.x = (Math.random() - 0.5) * width * 2.4;
          p.y = (Math.random() - 0.5) * height * 2.4;
        }

        const scale = FOCAL / p.z;
        const sx = cx + p.x * scale;
        const sy = cy + p.y * scale;

        // Не рисуем то, что уже вне экрана.
        if (sx < -60 || sx > width + 60 || sy < -60 || sy > height + 60) continue;

        const fade = Math.max(0, Math.min(1, 1 - p.z / DEPTH));

        if (p.kind === "alert") {
          // Зона ограничения — красная отметка с пульсацией.
          const pulse = 0.6 + 0.4 * Math.sin(time * 3 + p.seed);
          const r = 3.5 * scale * 5;
          ctx.strokeStyle = `rgba(224, 85, 79, ${fade * 0.75 * pulse})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = `rgba(224, 85, 79, ${fade * 0.9})`;
          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(1, r * 0.24), 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === "ring") {
          // Наземная станция — квадратная отметка.
          const s = 3.2 * scale * 4;
          ctx.strokeStyle = `rgba(53, 208, 127, ${fade * 0.65})`;
          ctx.lineWidth = 1.2;
          ctx.strokeRect(sx - s / 2, sy - s / 2, s, s);
        } else {
          // Воздушное судно — светящаяся точка со следом.
          const r = Math.max(0.6, 1.5 * scale * 2.6);
          ctx.fillStyle = `rgba(178, 226, 244, ${fade * 0.92})`;
          ctx.beginPath();
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
          ctx.fill();

          // След тянется к центру — подчёркивает направление полёта.
          if (fade > 0.35) {
            const prevScale = FOCAL / (p.z + speed * 3.2);
            ctx.strokeStyle = `rgba(120, 190, 220, ${fade * 0.3})`;
            ctx.lineWidth = Math.max(0.5, r * 0.5);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(cx + p.x * prevScale, cy + p.y * prevScale);
            ctx.stroke();
          }
        }
      }

      frameId = requestAnimationFrame(draw);
    };

    resize();
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
      ctx.fillStyle = "#04070a";
      ctx.fillRect(0, 0, width, height);
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
  }, [boostRef]);

  return <canvas ref={canvasRef} aria-hidden="true" className="h-full w-full" />;
}
