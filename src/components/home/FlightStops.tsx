"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowRight } from "lucide-react";

import { href } from "@/lib/nav";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";

/**
 * Первый экран и остановки полёта.
 *
 * Сама трёхмерная сцена здесь не рисуется — она лежит фоном под всей
 * страницей (FlightBackdrop). Эта секция только показывает текст,
 * который сменяется по мере полёта: заголовок, затем пять функций
 * платформы, по одной на остановку.
 *
 * Тексты берутся из словарей, то есть из описания продукта. Ничего
 * не сочиняется на месте.
 *
 * Сменяющиеся блоки работают на любой ширине, телефон включительно.
 * Обычный список остаётся запасным вариантом только для системного
 * «уменьшить движение»: эту настройку человек включает осознанно, и
 * захватывать ему прокрутку нельзя. Переключение сделано вариантами
 * Tailwind, то есть чистым CSS: работает даже если скрипты не
 * выполнились.
 */

gsap.registerPlugin(ScrollTrigger, useGSAP);

const STOPS = 5;

export default function FlightStops({
  locale,
  t,
}: {
  locale: Locale;
  t: Dictionary;
}) {
  const root = useRef<HTMLElement>(null);

  const hero = t.home.hero;
  const formula = t.home.formula;
  const stops = formula.items.slice(0, STOPS);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        "(prefers-reduced-motion: no-preference)",
        () => {
          const scope = root.current!;
          const heroBlock = scope.querySelector("[data-hero-block]");
          const stopBlocks = gsap.utils.toArray<HTMLElement>(
            "[data-stop]",
            scope,
          );

          gsap.set(stopBlocks, { autoAlpha: 0, y: 40 });

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: scope,
              start: "top top",
              end: "bottom bottom",
              scrub: 1,
            },
          });

          // Заголовок держится в начале и уходит перед первой остановкой.
          if (heroBlock) {
            tl.to(heroBlock, { autoAlpha: 0, y: -40, duration: 0.6 }, 0.7);
          }

          stopBlocks.forEach((block, i) => {
            const at = 1.7 + i * 1.55;
            tl.to(block, { autoAlpha: 1, y: 0, duration: 0.45 }, at);
            tl.to(block, { autoAlpha: 0, y: -40, duration: 0.45 }, at + 1.0);
          });

          // Шрифты меняют высоту блоков уже после первой отрисовки.
          document.fonts?.ready.then(() => ScrollTrigger.refresh());

          return () => {
            tl.scrollTrigger?.kill();
            tl.kill();
          };
        },
      );

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <>
      {/* ============================================================
          Высокая секция: её высота и есть длина этого куска полёта.
          Внутри — прилипающий экран с текстом.
          ============================================================ */}
      {/* Высота секции = длина этого куска полёта. На компьютере это
          (STOPS + 2) экрана, то есть 700vh при пяти остановках. На
          телефоне взято меньше: пролистывать семь высот экрана пальцем
          утомительно. Единица svh, а не vh, — она не скачет, когда
          браузер прячет адресную строку. */}
      <section
        ref={root}
        className="relative hidden h-[540svh] motion-safe:block lg:h-[700vh]"
        aria-label={formula.title}
      >
        <div className="sticky top-0 h-svh overflow-hidden">
          {/* Затемнение: без него текст теряется на светлых клубах.
              Фон под ним — общая сцена полёта. */}
          {/* На широком экране текст стоит слева, и затемнение идёт
              слева направо — справа сцена остаётся открытой. На узком
              экране текст занимает всю ширину, поэтому там затемнение
              вертикальное: иначе правый край строк ложится на светлые
              клубы и не читается. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-void/96 via-void/72 to-void/20 lg:bg-gradient-to-r lg:from-void/92 lg:via-void/38 lg:to-transparent"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-void/85 via-transparent to-void/45"
          />

          {/* --- Заголовок в начале полёта --- */}
          {/* Положение текста разное по ширине экрана.

              На мониторе текст стоит по центру левой колонки, а аппарат
              отведён вправо доворотом кадра — они не пересекаются.

              На телефоне колонки нет, и текст по центру оказывался ровно
              под аппаратом. Поэтому здесь он прижат к низу, а аппарат
              поднят в верхнюю треть кадра (`portraitLift` в
              FlightBackdrop). Сверху остаётся открытая сцена, снизу
              читается текст — обычная схема мобильного первого экрана. */}
          <div
            data-hero-block
            className="container-page absolute inset-x-0 bottom-24 lg:top-1/2 lg:bottom-auto lg:-translate-y-1/2"
          >
            <p className="hud-label">{hero.eyebrow}</p>
            <h1 className="mt-6 max-w-4xl text-balance text-[2rem] leading-[1.08] font-medium tracking-tight text-ink sm:text-5xl sm:leading-[1.05] xl:text-7xl">
              {hero.title}
            </h1>
            <p className="mt-5 max-w-2xl text-pretty text-[0.9375rem] leading-relaxed text-ink-muted sm:mt-7 sm:text-lg">
              {hero.subtitle}
            </p>
            <p className="mt-8 font-mono text-[0.625rem] tracking-[0.28em] text-accent uppercase sm:mt-10 sm:text-[0.6875rem] sm:tracking-[0.3em]">
              {hero.tagline}
            </p>
          </div>

          {/* --- Остановки полёта --- */}
          {stops.map((item, i) => (
            <div
              key={item.key}
              data-stop
              className="container-page absolute inset-x-0 bottom-24 lg:top-1/2 lg:bottom-auto lg:-translate-y-1/2"
              style={{ visibility: "hidden" }}
            >
              <p className="font-mono text-[0.6875rem] tracking-[0.28em] text-accent">
                {String(i + 1).padStart(2, "0")} — {item.key}
              </p>
              <h2 className="mt-5 max-w-3xl text-balance text-[1.75rem] leading-[1.15] font-medium tracking-tight text-ink sm:mt-6 sm:text-5xl sm:leading-tight xl:text-6xl">
                {item.title}
              </h2>
              <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-ink-muted sm:mt-7 sm:text-lg">
                {item.text}
              </p>
            </div>
          ))}

          {/* --- Постоянная нижняя строка --- */}
          <div className="container-page absolute inset-x-0 bottom-6 flex items-end justify-between gap-8 sm:bottom-10">
            <Link
              href={href(locale, "/product")}
              className="group inline-flex min-h-11 items-center gap-2.5 border border-accent bg-accent/12 px-6 py-3.5 text-sm tracking-wide text-accent transition-colors hover:bg-accent/20"
            >
              {hero.primaryCta}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <p className="hud-label hidden xl:block">{formula.title}</p>
          </div>
        </div>
      </section>

      {/* ============================================================
          ЗАПАСНОЙ ВАРИАНТ: системное «уменьшить движение».
          Прокрутка не захватывается, движения нет вовсе.
          ============================================================ */}
      <section className="relative block motion-safe:hidden">
        <div className="container-page py-24">
          <p className="hud-label">{hero.eyebrow}</p>
          <h1 className="mt-6 text-balance text-4xl leading-[1.08] font-medium tracking-tight text-ink sm:text-5xl">
            {hero.title}
          </h1>
          <p className="mt-7 max-w-2xl text-pretty text-base leading-relaxed text-ink-muted sm:text-lg">
            {hero.subtitle}
          </p>
          <p className="mt-8 font-mono text-[0.6875rem] tracking-[0.3em] text-accent uppercase">
            {hero.tagline}
          </p>

          <Link
            href={href(locale, "/product")}
            className="mt-10 inline-flex min-h-11 items-center gap-2.5 border border-accent bg-accent/12 px-6 py-3.5 text-sm tracking-wide text-accent"
          >
            {hero.primaryCta}
            <ArrowRight className="h-4 w-4" />
          </Link>

          <ol className="mt-16 grid gap-px border border-line bg-line sm:grid-cols-2">
            {stops.map((item, i) => (
              <li key={item.key} className="bg-surface p-6">
                <p className="font-mono text-[0.6875rem] tracking-[0.28em] text-accent">
                  {String(i + 1).padStart(2, "0")} — {item.key}
                </p>
                <h2 className="mt-4 text-xl font-medium tracking-tight text-ink">
                  {item.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                  {item.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
