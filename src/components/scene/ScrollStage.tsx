"use client";

import { useEffect, useRef, useState } from "react";

import AetherScene, { type SceneProgress } from "./AetherScene";

/**
 * Скролл-сцена: экран «залипает», а прокрутка перематывает происходящее
 * внутри него.
 *
 * Как устроено: обёртка высокая (несколько экранов), а внутри неё лежит
 * блок с `position: sticky` высотой ровно в экран. Пока обёртка проходит
 * мимо, липкий блок стоит на месте, и мы знаем, какая доля обёртки уже
 * пройдена — это и есть прогресс от 0 до 1. Его получает трёхмерная
 * сцена и подписи.
 *
 * Прогресс передаётся через ref, а не через состояние React: обновление
 * состояния на каждый кадр прокрутки перерисовывало бы компонент
 * десятки раз в секунду. Ref меняется без перерисовки — сцена читает
 * его сама внутри своего цикла отрисовки.
 */

/** Подписи фаз. Каждая занимает свой отрезок прогресса. */
export type StageChapter = {
  index: string;
  label: string;
  title: string;
  text: string;
};

export default function ScrollStage({
  chapters,
  scrollHint,
}: {
  chapters: StageChapter[];
  scrollHint: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<SceneProgress>({ current: 0 });
  const barRef = useRef<HTMLDivElement>(null);

  /** Активная глава — единственное, ради чего перерисовываем компонент. */
  const [active, setActive] = useState(0);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let frame = 0;
    let lastActive = -1;

    const measure = () => {
      const rect = wrapper.getBoundingClientRect();
      // Сколько прокручиваемой части обёртки уже пройдено.
      const scrollable = rect.height - window.innerHeight;
      const passed = -rect.top;
      const p =
        scrollable <= 0 ? 0 : Math.min(1, Math.max(0, passed / scrollable));

      progressRef.current.current = p;

      // Индикатор прогресса меняем напрямую, минуя React —
      // это самый частый апдейт, и он должен быть дешёвым.
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${p})`;
      }

      const next = Math.min(
        chapters.length - 1,
        Math.floor(p * chapters.length),
      );
      if (next !== lastActive) {
        lastActive = next;
        setActive(next);
      }

      frame = 0;
    };

    const onScroll = () => {
      // Замеры складываем в кадр анимации: браузер вызывает обработчик
      // прокрутки чаще, чем успевает рисовать, и без этого мы бы считали
      // геометрию впустую.
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [chapters.length]);

  return (
    <div
      ref={wrapperRef}
      /* Высота = число глав × экран. Чем больше, тем медленнее и
         спокойнее перематывается сцена. */
      style={{ height: `${chapters.length * 100}svh` }}
      className="relative"
    >
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* --- Трёхмерная сцена --- */}
        <div className="absolute inset-0">
          <AetherScene progressRef={progressRef} />
        </div>

        {/* --- Затемнение слева, чтобы текст читался поверх сцены --- */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-void via-void/70 to-transparent lg:via-void/45 lg:to-transparent"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-void to-transparent"
        />

        {/* --- Подписи фаз --- */}
        <div className="relative flex h-full items-center">
          <div className="container-page">
            <div className="max-w-xl">
              {chapters.map((chapter, i) => (
                <div
                  key={chapter.index}
                  aria-hidden={i !== active}
                  className={`transition-all duration-700 ease-out ${
                    i === active
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none absolute translate-y-4 opacity-0"
                  }`}
                >
                  <p className="hud-label flex items-center gap-3">
                    <span className="text-accent tabular-nums">
                      {chapter.index}
                    </span>
                    <span
                      aria-hidden="true"
                      className="h-px w-8 bg-accent/50"
                    />
                    {chapter.label}
                  </p>

                  <h2 className="mt-6 text-balance text-3xl leading-[1.12] font-medium tracking-tight text-ink sm:text-4xl lg:text-5xl">
                    {chapter.title}
                  </h2>

                  <p className="mt-5 max-w-lg text-pretty text-base leading-relaxed text-ink-muted lg:text-lg">
                    {chapter.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- Индикаторы фаз справа --- */}
        <ul className="absolute top-1/2 right-6 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
          {chapters.map((chapter, i) => (
            <li key={chapter.index} className="flex items-center gap-3">
              <span
                className={`font-mono text-[0.5625rem] tracking-[0.2em] transition-colors duration-500 ${
                  i === active ? "text-accent" : "text-ink-faint/40"
                }`}
              >
                {chapter.index}
              </span>
              <span
                className={`h-px transition-all duration-500 ${
                  i === active ? "w-8 bg-accent" : "w-4 bg-line-strong"
                }`}
              />
            </li>
          ))}
        </ul>

        {/* --- Полоса прогресса внизу --- */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-line">
          <div
            ref={barRef}
            className="h-full origin-left bg-accent"
            style={{ transform: "scaleX(0)" }}
          />
        </div>

        {/* --- Подсказка прокрутки (только в самом начале) --- */}
        <div
          className={`absolute bottom-8 left-1/2 -translate-x-1/2 transition-opacity duration-500 ${
            active === 0 ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="hud-label">{scrollHint}</span>
        </div>
      </div>
    </div>
  );
}
