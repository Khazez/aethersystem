import Link from "next/link";
import { ArrowRight, ArrowDown } from "lucide-react";

import AirspaceNetwork from "@/components/AirspaceNetwork";
import Reveal from "@/components/Reveal";
import { href } from "@/lib/nav";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";

export default function Hero({
  locale,
  t,
}: {
  locale: Locale;
  t: Dictionary;
}) {
  const h = t.home.hero;

  /* Показатели в нижней строке — «телеметрия» главного экрана.
     Значения условные и отражают структуру платформы, а не реальные
     оперативные данные: сайт информационный, живого подключения нет. */
  const hud = [
    { label: h.hudMission, value: "AETHER NEXUS" },
    { label: h.hudAirspace, value: "FL 000—120" },
    { label: h.hudNodes, value: "GRID · UTM · CORE" },
    { label: h.hudStatus, value: h.hudStatusValue, signal: true },
  ];

  return (
    <section className="relative isolate flex min-h-svh flex-col justify-center overflow-hidden pt-18">
      {/* --- Фоновые слои --- */}
      <div className="absolute inset-0 -z-10">
        {/* Сеть воздушных узлов */}
        <div className="absolute inset-0 opacity-95">
          <AirspaceNetwork />
        </div>

        {/* Техническая сетка поверх */}
        <div className="bg-grid bg-grid-fade absolute inset-0" />

        {/* Затемнение снизу — чтобы текст читался на любой конфигурации точек */}
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/60 to-void/20" />

        {/* Мягкое свечение из центра */}
        <div
          className="absolute top-1/2 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-45 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(31,127,147,0.28) 0%, transparent 68%)",
          }}
        />
      </div>

      {/* --- Содержимое --- */}
      <div className="container-page py-20 lg:py-28">
        <div className="max-w-4xl">
          <Reveal>
            <p className="hud-label flex items-center gap-3">
              <span className="status-dot h-1.5 w-1.5 rounded-full bg-signal-ok" />
              {h.eyebrow}
            </p>
          </Reveal>

          <Reveal delay={90}>
            <h1 className="mt-7 text-balance text-4xl leading-[1.08] font-medium tracking-tight text-ink sm:text-5xl lg:text-[4rem] xl:text-[4.5rem]">
              {h.title}
            </h1>
          </Reveal>

          <Reveal delay={180}>
            <p className="mt-7 max-w-2xl text-pretty text-base leading-relaxed text-ink-muted sm:text-lg">
              {h.subtitle}
            </p>
          </Reveal>

          <Reveal delay={260}>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={href(locale, "/product")}
                className="group inline-flex items-center justify-center gap-2.5 border border-accent bg-accent/12 px-6 py-3.5 text-sm tracking-wide text-accent transition-colors hover:bg-accent/20"
              >
                {h.primaryCta}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>

              <Link
                href={href(locale, "/partnership")}
                className="inline-flex items-center justify-center gap-2.5 border border-line px-6 py-3.5 text-sm tracking-wide text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
              >
                {h.secondaryCta}
              </Link>
            </div>
          </Reveal>

          <Reveal delay={340}>
            <p className="mt-12 font-mono text-[0.6875rem] tracking-[0.3em] text-accent/70 uppercase">
              {h.tagline}
            </p>
          </Reveal>
        </div>
      </div>

      {/* --- Нижняя телеметрическая строка --- */}
      <div className="relative border-t border-line/70 bg-void/50 backdrop-blur-sm">
        <div className="container-page">
          <dl className="grid grid-cols-2 divide-line/70 lg:grid-cols-4 lg:divide-x">
            {hud.map((item, i) => (
              <div
                key={item.label}
                className={`px-0 py-4 lg:px-6 lg:first:pl-0 ${
                  i < 2 ? "border-b border-line/70 lg:border-b-0" : ""
                } ${i % 2 === 1 ? "pl-6 lg:pl-6" : ""}`}
              >
                <dt className="hud-label">{item.label}</dt>
                <dd
                  className={`mt-2 font-mono text-xs tracking-[0.12em] ${
                    item.signal ? "text-signal-ok" : "text-ink"
                  }`}
                >
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* --- Подсказка прокрутки --- */}
      <div className="pointer-events-none absolute bottom-28 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex">
        <span className="hud-label">{t.common.scrollHint}</span>
        <ArrowDown className="h-4 w-4 animate-bounce text-ink-faint" />
      </div>
    </section>
  );
}
