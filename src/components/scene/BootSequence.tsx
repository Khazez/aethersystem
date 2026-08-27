"use client";

import { useEffect, useState } from "react";

/**
 * Последовательность инициализации системы.
 *
 * Первое, что видит посетитель: контуры платформы подключаются один за
 * другим, как при запуске бортового оборудования. Приём заимствован из
 * авиационной практики — перед вылетом системы проходят проверку
 * поочерёдно, и на дисплее это выглядит именно так.
 *
 * Смысл не декоративный: за несколько секунд человек успевает прочитать
 * названия ключевых контуров платформы и понять её масштаб раньше,
 * чем начнёт читать текст.
 */

export type BootLine = { code: string; label: string };

export default function BootSequence({
  lines,
  readyLabel,
  onDone,
}: {
  lines: BootLine[];
  readyLabel: string;
  /** Вызывается, когда последовательность завершилась. */
  onDone?: () => void;
}) {
  /** Сколько строк уже «подключилось». */
  const [done, setDone] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let cancelled = false;
    let index = 0;

    /** Анимации отключены в системе — показываем сразу готовый результат. */
    const finishAtOnce = () => {
      if (cancelled) return;
      setDone(lines.length);
      onDone?.();
    };

    const tick = () => {
      if (cancelled) return;
      index++;
      setDone(index);

      if (index >= lines.length) {
        onDone?.();
        return;
      }
      // Небольшой разброс интервала: ровный ритм выглядит как заставка,
      // неровный — как реальная проверка систем.
      timer = window.setTimeout(tick, 150 + (index % 3) * 60);
    };

    let timer = window.setTimeout(
      reduceMotion ? finishAtOnce : tick,
      reduceMotion ? 0 : 320,
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [lines.length, onDone]);

  const complete = done >= lines.length;

  return (
    <div
      role="status"
      aria-live="polite"
      className="font-mono text-[0.6875rem] tracking-[0.14em]"
    >
      <ul className="flex flex-col gap-1.5">
        {lines.map((line, i) => {
          const isDone = i < done;
          return (
            <li
              key={line.code}
              className={`flex items-center gap-3 transition-opacity duration-300 ${
                isDone ? "opacity-100" : "opacity-25"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 transition-colors duration-300 ${
                  isDone ? "bg-signal-ok" : "bg-ink-faint/40"
                }`}
              />
              <span className="w-16 shrink-0 text-ink-faint">{line.code}</span>
              <span className="flex-1 text-ink-muted uppercase">
                {line.label}
              </span>
              <span
                className={`shrink-0 transition-colors duration-300 ${
                  isDone ? "text-signal-ok" : "text-ink-faint/40"
                }`}
              >
                {isDone ? "OK" : "···"}
              </span>
            </li>
          );
        })}
      </ul>

      <div
        className={`mt-4 flex items-center gap-3 border-t border-line pt-4 transition-opacity duration-500 ${
          complete ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="status-dot h-1.5 w-1.5 rounded-full bg-signal-ok" />
        <span className="text-signal-ok">{readyLabel}</span>
      </div>
    </div>
  );
}
