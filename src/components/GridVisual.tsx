"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Визуализация Aether Grid — представления воздушного пространства
 * в виде цифровой пространственной сетки.
 *
 * Каждая ячейка имеет статус: свободна, загружена или ограничена.
 * По сетке периодически проходит волна сканирования — как обновление
 * данных на диспетчерском дисплее.
 *
 * Сетка строится детерминированно (по формуле от номера ячейки, без
 * случайных чисел). Это важно: страница сначала собирается на сервере,
 * а потом «оживает» в браузере, и обе версии должны совпасть.
 * Со случайными числами они бы разошлись, и React выдал бы ошибку.
 */

const COLS = 16;
const ROWS = 8;

type CellState = "free" | "loaded" | "restricted";

function cellState(index: number): CellState {
  // Псевдослучайное, но стабильное распределение статусов.
  const h = (index * 2654435761) % 1000;
  if (h < 62) return "restricted";
  if (h < 260) return "loaded";
  return "free";
}

export default function GridVisual({
  legendFree,
  legendLoaded,
  legendRestricted,
}: {
  legendFree: string;
  legendLoaded: string;
  legendRestricted: string;
}) {
  const cells = useMemo(
    () =>
      Array.from({ length: COLS * ROWS }, (_, i) => ({
        index: i,
        col: i % COLS,
        state: cellState(i),
      })),
    [],
  );

  /** Номер колонки, по которой сейчас проходит волна сканирования. */
  const [scanCol, setScanCol] = useState(-1);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(() => {
      setScanCol((c) => (c >= COLS + 2 ? -1 : c + 1));
    }, 130);

    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <div
        className="relative border border-line bg-abyss p-3 sm:p-4"
        role="img"
        aria-label={`${legendFree} · ${legendLoaded} · ${legendRestricted}`}
      >
        <div
          className="grid gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        >
          {cells.map((cell) => {
            const scanning = cell.col === scanCol;

            const base =
              cell.state === "restricted"
                ? "bg-signal-alert/22 border-signal-alert/35"
                : cell.state === "loaded"
                  ? "bg-accent/18 border-accent/30"
                  : "bg-surface border-line";

            return (
              <div
                key={cell.index}
                className={`aspect-square border transition-colors duration-200 ${base} ${
                  scanning ? "border-accent/70 bg-accent/35" : ""
                }`}
              />
            );
          })}
        </div>

        {/* Координатные подписи по краям — деталь приборного дисплея */}
        <div className="pointer-events-none absolute -top-2.5 left-3 bg-abyss px-1.5 font-mono text-[0.5625rem] tracking-[0.2em] text-ink-faint">
          GRID · 16×8
        </div>
        <div className="pointer-events-none absolute -bottom-2.5 right-3 bg-abyss px-1.5 font-mono text-[0.5625rem] tracking-[0.2em] text-ink-faint">
          FL 000—120
        </div>
      </div>

      {/* --- Легенда --- */}
      <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
        {[
          { label: legendFree, cls: "bg-surface border-line" },
          { label: legendLoaded, cls: "bg-accent/25 border-accent/45" },
          {
            label: legendRestricted,
            cls: "bg-signal-alert/30 border-signal-alert/50",
          },
        ].map((item) => (
          <li key={item.label} className="flex items-center gap-2.5">
            <span className={`h-2.5 w-2.5 border ${item.cls}`} />
            <span className="font-mono text-[0.6875rem] tracking-[0.14em] text-ink-faint uppercase">
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
