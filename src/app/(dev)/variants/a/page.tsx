"use client";

import { useEffect, useRef, useState } from "react";

import VariantShell from "../VariantShell";
import FlightScene from "./FlightScene";

/**
 * ВАРИАНТ A — «ПРОЛЁТ».
 *
 * Полёт не останавливается никогда: пока посетитель читает, камера
 * продолжает идти вперёд. Прокрутка разгоняет полёт, а заголовки
 * сменяют друг друга прямо в потоке.
 */

const stages = [
  {
    tag: "AETHER SYSTEM & CO.",
    title: "Воздушное пространство\nстановится цифровым",
    text: "Единая инфраструктура для беспилотной и автономной авиации.",
  },
  {
    tag: "МАСШТАБ",
    title: "Тысячи операций\nв одном пространстве",
    text: "Каждый борт, каждая станция, каждое ограничение — в едином цифровом контуре.",
  },
  {
    tag: "AETHER NEXUS",
    title: "Идентичность.\nМаршрут. Разрешение.",
    text: "Платформа связывает аппарат, оператора, норматив и операцию в одну цепочку.",
  },
];

export default function VariantA() {
  const boostRef = useRef({ value: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(0);
  const [speed, setSpeed] = useState(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    let frame = 0;
    let lastY = window.scrollY;
    let decay = 0;

    const measure = () => {
      const rect = wrap.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const passed = -rect.top;
      const p = scrollable <= 0 ? 0 : Math.min(1, Math.max(0, passed / scrollable));

      // Разгон зависит от того, насколько резко крутят колесо.
      const delta = Math.abs(window.scrollY - lastY);
      lastY = window.scrollY;
      decay = Math.max(decay * 0.86, Math.min(1, delta / 90));

      boostRef.current.value = decay;
      setSpeed(decay);

      const next = Math.min(stages.length - 1, Math.floor(p * stages.length));
      setStage(next);

      frame = 0;
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    // Разгон плавно затухает, даже если прокрутку остановили.
    const tick = setInterval(() => {
      decay *= 0.9;
      boostRef.current.value = decay;
      if (decay < 0.01) setSpeed(0);
    }, 100);

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      clearInterval(tick);
    };
  }, []);

  const active = stages[stage];

  return (
    <VariantShell id="a" name="ПРОЛЁТ">
      <div ref={wrapRef} style={{ height: `${stages.length * 100}svh` }}>
        <div className="sticky top-0 h-svh overflow-hidden">
          <div className="absolute inset-0">
            <FlightScene boostRef={boostRef} />
          </div>

          {/* Виньетка: края темнее, центр открыт — усиливает тоннель */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 62% 62% at 50% 50%, transparent 30%, rgba(4,7,10,0.86) 100%)",
            }}
          />

          {/* Текст в потоке */}
          <div className="relative flex h-full items-center">
            <div className="container-page">
              <div key={stage} className="max-w-3xl">
                <p className="hud-label animate-[fadeUp_0.7s_ease-out] text-accent">
                  {active.tag}
                </p>
                <h1 className="mt-6 animate-[fadeUp_0.9s_ease-out] text-4xl leading-[1.06] font-medium tracking-tight text-ink whitespace-pre-line sm:text-6xl lg:text-7xl">
                  {active.title}
                </h1>
                <p className="mt-7 max-w-xl animate-[fadeUp_1.1s_ease-out] text-base leading-relaxed text-ink-muted sm:text-lg">
                  {active.text}
                </p>
              </div>
            </div>
          </div>

          {/* Указатель скорости — реагирует на прокрутку */}
          <div className="absolute right-6 bottom-8 hidden items-end gap-3 lg:flex">
            <span className="hud-label">СКОРОСТЬ</span>
            <div className="flex h-10 items-end gap-1">
              {Array.from({ length: 12 }, (_, i) => (
                <span
                  key={i}
                  className="w-1 transition-all duration-150"
                  style={{
                    height: `${20 + i * 6}%`,
                    background:
                      i / 12 < speed
                        ? "var(--color-accent)"
                        : "var(--color-line-strong)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Индикаторы фаз */}
          <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-2">
            {stages.map((s, i) => (
              <span
                key={s.tag}
                className={`h-0.5 transition-all duration-500 ${
                  i === stage ? "w-10 bg-accent" : "w-5 bg-line-strong"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <section className="border-t border-line">
        <div className="container-page py-20">
          <p className="hud-label">ВАРИАНТ A · ПРОЛЁТ</p>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-muted">
            Движение не прекращается ни на секунду. Прокрутка разгоняет
            полёт — чем быстрее крутите, тем выше скорость. Подходит, если
            нужно ощущение масштаба и непрерывного действия.
          </p>
        </div>
      </section>
    </VariantShell>
  );
}
