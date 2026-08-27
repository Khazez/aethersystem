"use client";

import { useEffect, useRef } from "react";

/**
 * Живая визуализация воздушной сети для главного экрана.
 *
 * Что происходит: по полю медленно дрейфуют узлы (воздушные суда и
 * наземные станции). Между узлами, оказавшимися достаточно близко,
 * автоматически возникает линия связи — чем ближе, тем ярче. Это
 * визуальное выражение основного тезиса компании: связность вместо
 * разрозненности.
 *
 * Рисуется на <canvas> — это область, где браузер рисует графику
 * попиксельно. Такой подход даёт плавную анимацию сотен объектов,
 * с которой обычная вёрстка не справилась бы.
 */

type Node = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Радиус точки. */
  r: number;
  /** Узел-станция рисуется иначе, чем воздушное судно. */
  station: boolean;
  /** Фаза пульсации, чтобы узлы мигали не синхронно. */
  phase: number;
};

export default function AirspaceNetwork({
  className = "",
  density = 1,
}: {
  className?: string;
  /** Множитель количества узлов: 1 — обычно, 0.6 — разреженно. */
  density?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Если пользователь отключил анимации в системе — рисуем один
    // статичный кадр и не запускаем цикл.
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let width = 0;
    let height = 0;
    let nodes: Node[] = [];
    let frame = 0;
    let running = true;

    /** Расстояние, ближе которого узлы соединяются линией. */
    const LINK_DISTANCE = 170;

    const buildNodes = () => {
      // Количество узлов зависит от площади: на широком экране их больше,
      // на телефоне меньше — иначе картинка превращается в кашу.
      const area = width * height;
      const count = Math.round(
        Math.min(140, Math.max(34, (area / 13000) * density)),
      );

      nodes = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        // Скорости намеренно очень малы: движение должно ощущаться
        // как дрейф на радаре, а не как заставка.
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.2 + 1.1,
        station: i % 9 === 0,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      // devicePixelRatio — плотность пикселей экрана. На Retina-дисплеях
      // она равна 2, и без этой поправки линии выглядят размытыми.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      buildNodes();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // --- Линии связи между близкими узлами ---
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);

          if (dist < LINK_DISTANCE) {
            // Чем ближе узлы — тем плотнее линия.
            const strength = 1 - dist / LINK_DISTANCE;
            ctx.strokeStyle = `rgba(75, 200, 224, ${strength * 0.4})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // --- Сами узлы ---
      for (const n of nodes) {
        if (n.station) {
          // Наземная станция: квадрат с ореолом — статичный элемент сети.
          const pulse = 0.5 + 0.5 * Math.sin(frame * 0.02 + n.phase);
          ctx.fillStyle = `rgba(53, 208, 127, ${0.4 + pulse * 0.55})`;
          const s = n.r * 2.2;
          ctx.fillRect(n.x - s / 2, n.y - s / 2, s, s);

          ctx.strokeStyle = `rgba(53, 208, 127, ${0.16 + pulse * 0.24})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.arc(n.x, n.y, 7 + pulse * 3.5, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Воздушное судно: светящаяся точка.
          ctx.fillStyle = "rgba(178, 226, 244, 0.92)";
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const step = () => {
      if (!running) return;

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;

        // Узел, ушедший за край, появляется с противоположной стороны —
        // поле выглядит бесконечным, без накопления узлов по углам.
        if (n.x < -20) n.x = width + 20;
        if (n.x > width + 20) n.x = -20;
        if (n.y < -20) n.y = height + 20;
        if (n.y > height + 20) n.y = -20;
      }

      frame++;
      draw();
      animationId = requestAnimationFrame(step);
    };

    let animationId = 0;

    // Когда вкладка не видна, анимацию останавливаем — не тратим
    // процессор и батарею пользователя впустую.
    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(animationId);
      } else if (!reduceMotion) {
        running = true;
        animationId = requestAnimationFrame(step);
      }
    };

    resize();

    if (reduceMotion) {
      draw();
    } else {
      animationId = requestAnimationFrame(step);
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`h-full w-full ${className}`}
    />
  );
}
