"use client";

import { useEffect, useRef } from "react";

/**
 * Подложка внутренних страниц: перспектива без three.js.
 *
 * ── Зачем ─────────────────────────────────────────────────────────
 *
 * До 30.08.2026 на внутренних страницах лежала `AirspaceNetwork` —
 * сеть точек в две координаты. Замечание заказчика: «фон скучный, без
 * ничего». Оно верное, и дело не в самой сети: поверх неё шёл градиент
 * от `void/55` до сплошного `void`, который её почти полностью гасил.
 * На главной рядом летит трёхмерная сцена, и разрыв был заметен.
 *
 * ── Почему не three.js ────────────────────────────────────────────
 *
 * Глубину не обязательно считать библиотекой: экранный размер — это
 * фокусное расстояние, делённое на удаление, одна строчка арифметики.
 * three.js стоил бы **+604 КБ на каждую внутреннюю страницу** (замерено
 * на главной), а внутренние страницы читают, а не смотрят. Здесь весь
 * расчёт — несколько килобайт кода и ни одного загружаемого файла.
 *
 * ── Мотивы ────────────────────────────────────────────────────────
 *
 * У каждого раздела свой, чтобы фон работал указателем, а не обоями:
 *
 * - `grid` — сетка воздушного пространства с проходом развёртки.
 *   Это Aether Grid, то есть сам продукт. Для `/product`.
 * - `terrain` — рельеф под маршрутом. Спокойный, для `/about` и `/team`.
 * - `nodes` — узлы и связи в объёме. Для `/solutions` и `/contacts`.
 */

export type BackdropScene = "grid" | "terrain" | "nodes";

/* ── Решётчатый шум для рельефа ───────────────────────────────────
 *
 * Значения задаются в узлах решётки, между ними — плавная
 * интерполяция. ⚠️ Частота намеренно низкая: при высокой на один
 * хребет приходится две-три ячейки, и вместо гор выходит частокол
 * игл. Проверено на артефакте 28.08.2026. */

function hash2(i: number, j: number) {
  let n = (i * 374761393 + j * 668265263) | 0;
  n = ((n ^ (n >> 13)) * 1274126177) | 0;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

function vnoise(x: number, y: number) {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = smooth(x - i);
  const fy = smooth(y - j);
  const a = hash2(i, j);
  const b = hash2(i + 1, j);
  const c = hash2(i, j + 1);
  const d = hash2(i + 1, j + 1);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}

function fbm(x: number, y: number) {
  return (
    vnoise(x, y) * 0.6 +
    vnoise(x * 2.1, y * 2.1) * 0.28 +
    vnoise(x * 4.3, y * 4.3) * 0.12
  );
}

/** Затемнение поверх сцены: держит читаемость текста над подложкой. */
function veil(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stops: [number, number][],
) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [at, alpha] of stops) g.addColorStop(at, `rgba(4, 7, 10, ${alpha})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

type Draw = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
) => void;

const SCENES: Record<BackdropScene, Draw> = {
  /** Сетка воздушного пространства: ячейки уходят к горизонту. */
  grid(ctx, w, h, t) {
    const cx = w / 2;
    const hz = h * 0.3;
    const f = h * 0.62;
    const shift = (t * 0.00045) % 1;
    const scan = (t * 0.00045) % 15;

    for (let i = 0; i < 15; i++) {
      const z = i + 1 - shift;
      const y = hz + f / z;
      if (y > h + 2) continue;

      ctx.strokeStyle = `rgba(75, 200, 224, ${Math.max(0.04, 0.6 - z * 0.033).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();

      // Проход развёртки — одна строка ярче остальных.
      if (Math.abs(i - scan) < 0.6) {
        ctx.strokeStyle = "rgba(111, 220, 240, 0.55)";
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    }

    for (let k = -9; k <= 9; k++) {
      const xf = cx + k * (w * 0.115);
      ctx.strokeStyle = "rgba(75, 200, 224, 0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + (xf - cx) * 0.06, hz + f / 16);
      ctx.lineTo(cx + (xf - cx) * 3.2, h);
      ctx.stroke();
    }

    veil(ctx, w, h, [
      [0, 0.9],
      [0.34, 0.25],
      [1, 0.72],
    ]);
  },

  /** Рельеф под маршрутом: высота считается шумом. */
  terrain(ctx, w, h, t) {
    const cx = w / 2;
    const cy = h * 0.42;
    const f = h * 0.95;
    const move = t * 0.00028;

    for (let zi = 15; zi >= 1; zi--) {
      const z = zi * 0.62 + 0.8 - (move % 0.62);
      if (z < 0.7) continue;

      const s = f / z;
      const a = Math.max(0.05, Math.min(0.62, (16 - zi) * 0.062));
      ctx.strokeStyle = `rgba(75, 200, 224, ${a.toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let xi = -14; xi <= 14; xi++) {
        const x = xi * 0.42;
        const height = Math.pow(fbm(x * 0.55 + 12, (z + move) * 0.55), 1.25) * 3.4;
        const sx = cx + x * s;
        const sy = cy + (1.15 - height) * s;
        if (xi === -14) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }

      ctx.stroke();
    }

    veil(ctx, w, h, [
      [0, 0.82],
      [0.4, 0.2],
      [1, 0.78],
    ]);
  },

  /** Узлы и связи в объёме: точки на разном удалении. */
  nodes(ctx, w, h, t) {
    const cx = w / 2;
    const cy = h / 2;
    const f = h * 0.9;
    const rot = t * 0.00012;

    const pts: { x: number; y: number; z: number; r: number }[] = [];

    for (let i = 0; i < 54; i++) {
      const x0 = (hash2(i, 3) - 0.5) * 7;
      const y0 = (hash2(i, 11) - 0.5) * 2.6;
      const z0 = hash2(i, 23) * 6 + 1.4;

      // Медленный поворот вокруг вертикальной оси — сцена «дышит».
      const x = x0 * Math.cos(rot) - (z0 - 4) * Math.sin(rot);
      const z = x0 * Math.sin(rot) + (z0 - 4) * Math.cos(rot) + 4.6;
      if (z < 0.9) continue;

      const s = f / z;
      pts.push({
        x: cx + x * s,
        y: cy + y0 * s,
        z,
        r: Math.max(0.7, (2.4 / z) * 2.2),
      });
    }

    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d >= 70) continue;

        const a = 0.16 * (1 - d / 70) * (3 / Math.max(pts[i].z, pts[j].z));
        ctx.strokeStyle = `rgba(75, 200, 224, ${Math.min(0.22, a).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[j].x, pts[j].y);
        ctx.stroke();
      }
    }

    for (const p of pts) {
      ctx.fillStyle = `rgba(111, 220, 240, ${Math.min(0.85, 2.4 / p.z).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    veil(ctx, w, h, [
      [0, 0.85],
      [0.42, 0.22],
      [1, 0.75],
    ]);
  },
};

export default function DepthBackdrop({
  scene,
  className = "",
}: {
  scene: BackdropScene;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = SCENES[scene];

    // Системное «уменьшить движение» — рисуем один кадр и не заводим цикл.
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let width = 0;
    let height = 0;
    let animationId = 0;
    let onScreen = true;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      // devicePixelRatio выше 2 не берём: на телефоне он доходит до 3,
      // и кадр стоил бы вдвое дороже без заметной разницы.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const frame = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      draw(ctx, width, height, t);
      animationId = requestAnimationFrame(frame);
    };

    const start = () => {
      if (reduceMotion || !onScreen || document.hidden) return;
      cancelAnimationFrame(animationId);
      animationId = requestAnimationFrame(frame);
    };

    const stop = () => cancelAnimationFrame(animationId);

    const onVisibility = () => (document.hidden ? stop() : start());

    resize();
    if (reduceMotion) draw(ctx, width, height, 0);
    else start();

    // Считаем кадры только пока подложка на экране: она стоит вверху
    // страницы, и после прокрутки к содержанию работать ей незачем.
    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries[0].isIntersecting;
        if (onScreen) start();
        else stop();
      },
      { threshold: 0.02 },
    );
    io.observe(canvas);

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reduceMotion) draw(ctx, width, height, 0);
    });
    resizeObserver.observe(canvas);

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      io.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [scene]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`h-full w-full ${className}`}
    />
  );
}
