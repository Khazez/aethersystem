"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

/**
 * Закреплённая сцена: цифровой жизненный цикл одной операции.
 *
 * Это и есть «эффект того видео». Секция залипает на экране (pin), и
 * дальше прокрутка не уводит страницу вниз, а перематывает саму сцену
 * (scrub): операция проходит все стадии — от аппарата до технической
 * истории. Прокрутка здесь работает как время.
 *
 * Почему такая сцена на сайте ровно одна: закреплённые секции отбирают
 * у человека привычное управление страницей. Одна-две — приём, больше —
 * прокрутка становится неуправляемой, особенно на телефоне.
 *
 * Поэтому же сцена включается только на широких экранах. На узких и при
 * системной настройке «уменьшить движение» показывается обычный список
 * тех же шагов — то же содержание, без захвата прокрутки. Переключение
 * сделано вариантами Tailwind (motion-safe / lg), то есть чистым CSS:
 * оно работает даже если скрипты не выполнились.
 */

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function LifecycleScene({
  title,
  steps,
  counterLabel,
}: {
  title: string;
  steps: readonly string[];
  counterLabel: string;
}) {
  const root = useRef<HTMLElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Сцена работает везде, где движение разрешено, — телефон тоже.
      mm.add(
        "(prefers-reduced-motion: no-preference)",
        () => {
          const stage = root.current?.querySelector<HTMLElement>("[data-stage]");
          if (!stage) return;

          const labels = gsap.utils.toArray<HTMLElement>("[data-label]", stage);
          const nodes = gsap.utils.toArray<HTMLElement>("[data-node]", stage);
          const fill = stage.querySelector<HTMLElement>("[data-fill]");
          const total = labels.length;

          // Исходное состояние: пройден нулевой шаг.
          gsap.set(labels, { autoAlpha: 0, y: 26 });
          gsap.set(labels[0], { autoAlpha: 1, y: 0 });
          gsap.set(nodes, { opacity: 0.28 });
          gsap.set(nodes[0], { opacity: 1 });
          if (fill) gsap.set(fill, { scaleX: 0 });

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: root.current,
              start: "top top",
              // Длина прокрутки сцены считается от числа шагов: примерно
              // 0,38 экрана на шаг. Фиксированная длина не годится — при
              // 14 шагах сцена пролетала за четыре оборота колеса.
              end: "+=" + Math.round(total * 38) + "%",
              scrub: 1,
              pin: true,
              // Счётчик «07 / 14» обновляем текстом напрямую — это
              // дешевле, чем перерисовывать React на каждый кадр.
              onUpdate: (self) => {
                const current = Math.min(
                  total,
                  Math.floor(self.progress * total) + 1,
                );
                if (counterRef.current) {
                  counterRef.current.textContent = String(current).padStart(
                    2,
                    "0",
                  );
                }
              },
            },
          });

          if (fill) {
            tl.to(fill, { scaleX: 1, ease: "none", duration: total }, 0);
          }
          // Бегунок едет по шкале вместе с заполнением.
          const marker = stage.querySelector<HTMLElement>("[data-marker]");
          if (marker) {
            tl.to(marker, { left: "100%", ease: "none", duration: total }, 0);
          }

          // Каждый шаг: подпись сменяется, узел на шкале загорается.
          labels.forEach((label, i) => {
            if (i > 0) {
              /* Уходящая подпись должна погаснуть ДО появления следующей.
                 При одновременной смене две крупные надписи накладывались
                 друг на друга. Но и разводить их полностью нельзя: при
                 зазоре 0.32 появлялся кадр, где не видно ни одной. 0.18 —
                 короткое перекрытие без наложения и без провала. */
              tl.to(labels[i - 1], { autoAlpha: 0, y: -26, duration: 0.3 }, i);
              tl.to(label, { autoAlpha: 1, y: 0, duration: 0.28 }, i + 0.18);
            }
            if (i > 0) {
              tl.to(nodes[i], { opacity: 1, duration: 0.3 }, i);
            }
          });

          return () => {
            tl.scrollTrigger?.kill();
            tl.kill();
          };
        },
      );

      // Шрифты меняют высоту блоков уже после первой отрисовки —
      // без пересчёта сцена начнётся не там, где нарисована.
      document.fonts?.ready.then(() => ScrollTrigger.refresh());

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="relative border-t border-line"
      aria-label={title}
    >
      {/* ============ Сцена: везде, где разрешено движение ============ */}
      <div
        data-stage
        className="container-page hidden h-svh flex-col justify-center py-16 motion-safe:flex sm:py-20"
      >
        <div className="flex items-baseline justify-between gap-6 border-b border-line pb-5">
          <h3 className="hud-label">{title}</h3>
          <p className="font-mono text-[0.6875rem] tracking-[0.16em] text-ink-faint">
            {counterLabel}{" "}
            <span ref={counterRef} className="tabular-nums text-accent">
              01
            </span>
            <span className="text-ink-faint"> / {String(steps.length).padStart(2, "0")}</span>
          </p>
        </div>

        {/* --- Середина сцены: текущий шаг --- */}
        {/* Блоки шагов лежат друг на друге и сменяются по прокрутке.
            Крупная полупрозрачная цифра справа держит композицию: без неё
            середина сцены оставалась пустой. */}
        <div className="relative mt-14 flex-1">
          {steps.map((step, i) => (
            <div
              key={step}
              data-label
              className="absolute inset-0 flex items-center justify-between gap-12"
              style={{ visibility: i === 0 ? "visible" : "hidden" }}
            >
              <div className="max-w-3xl">
                <p className="font-mono text-[0.6875rem] tracking-[0.2em] text-accent">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className="mt-5 text-balance text-[1.75rem] leading-[1.15] font-medium tracking-tight text-ink sm:mt-6 sm:text-5xl sm:leading-tight xl:text-6xl">
                  {step}
                </p>
                <div className="mt-8 h-px w-28 bg-accent/50" />
              </div>

              <span
                aria-hidden="true"
                className="hidden font-mono text-[13rem] leading-none tabular-nums text-ink/[0.055] xl:block"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
          ))}
        </div>

        {/* --- Шкала прохождения --- */}
        <div className="relative mt-auto">
          {/* Линия-основание, заполняемая часть поверх неё и бегунок.
              Волосяная линия в 1px терялась — прогресс не читался. */}
          <div className="relative h-0.5 w-full bg-line-strong/60">
            <div
              data-fill
              className="absolute inset-y-0 left-0 w-full origin-left bg-accent shadow-[0_0_12px_rgba(75,200,224,0.55)]"
            />
            <span
              data-marker
              aria-hidden="true"
              className="absolute top-1/2 left-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-accent bg-void"
            />
          </div>

          <ol className="mt-5 flex items-start justify-between gap-2">
            {steps.map((step, i) => (
              <li
                key={step}
                data-node
                className="flex min-w-0 flex-1 flex-col items-start gap-2"
              >
                <span className="font-mono text-[0.5625rem] tabular-nums text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {/* Название шага под шкалой прячем на телефоне: на 390
                    точках ширины четырнадцать подписей превращаются в
                    нечитаемую кашу. Номера остаются — по ним видно, где
                    сейчас идёт прохождение. */}
                <span className="hidden text-pretty text-[0.6875rem] leading-snug text-ink-muted lg:block">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* ============ Обычный список: системное «уменьшить движение» ============ */}
      <div className="container-page py-24 motion-safe:hidden">
        <h3 className="hud-label">{title}</h3>

        <ol className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-7">
          {steps.map((step, i) => (
            <li key={step}>
              <div className="flex h-full flex-col justify-between gap-4 bg-surface p-5">
                <span className="font-mono text-[0.625rem] tabular-nums text-accent/60">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[0.8125rem] leading-snug text-ink-muted">
                  {step}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
