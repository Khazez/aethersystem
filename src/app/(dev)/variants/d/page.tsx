"use client";

import { useEffect, useRef, useState } from "react";

import VariantShell from "../VariantShell";

/**
 * ВАРИАНТ D — «КИНЕТИКА».
 *
 * Главную работу делает типографика. Крупный текст живёт: слова
 * перебираются, строки переписываются на глазах, счётчики набегают.
 * Графика намеренно сведена к минимуму — только бегущая разметка фона.
 *
 * Расчёт на то, что смысл считывается быстрее визуала: у платформы
 * длинный список того, что она связывает, и перебор этих слов в
 * заголовке показывает охват нагляднее любой схемы.
 */

/** Слова из описания продукта — то, что связывает единый контур. */
const CONNECTED = [
  "аппарат",
  "оператора",
  "воздушное пространство",
  "маршрут",
  "разрешение",
  "норматив",
  "техническое состояние",
  "государственные сервисы",
  "финансовую операцию",
  "историю эксплуатации",
];

/** Модули платформы — бегут строкой. */
const MODULES = [
  "DIGITAL IDENTITY",
  "DIGITAL REGISTRY",
  "UTM",
  "AIRSPACE INTELLIGENCE",
  "REGULATORY COMPLIANCE",
  "AI-INSPECTOR",
  "CONFORMANCE MONITORING",
  "LIFECYCLE MANAGEMENT",
  "FLEET MANAGEMENT",
  "GOVERNMENT INTEGRATION",
  "CUSTOMS INTEGRATION",
  "MARKETPLACE",
  "FINTECH",
  "INSURTECH",
  "INTEGRATION GATEWAY",
];

/** Счётчик, набегающий до значения. */
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let raf = 0;
    let started = false;

    const run = () => {
      const start = performance.now();
      const duration = 1400;
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        // Замедление к концу — цифра «доезжает», а не обрывается.
        const eased = 1 - Math.pow(1 - t, 3);
        setN(Math.round(to * eased));
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          started = true;
          run();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(node);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);

  return (
    <span ref={ref} className="tabular-nums">
      {n}
      {suffix}
    </span>
  );
}

export default function VariantD() {
  const [wordIndex, setWordIndex] = useState(0);

  /* Слово в заголовке меняется каждые полторы секунды — заголовок
     всё время в движении, но читается спокойно. */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setWordIndex((i) => (i + 1) % CONNECTED.length);
    }, 1600);
    return () => clearInterval(id);
  }, []);

  return (
    <VariantShell id="d" name="КИНЕТИКА">
      <section className="relative isolate flex min-h-svh flex-col justify-center overflow-hidden pt-12">
        {/* Фон: бегущая разметка */}
        <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-[0.07]">
          <div className="marquee-bg h-full w-full" />
        </div>

        <div className="container-page py-16">
          <p className="hud-label flex items-center gap-3 text-accent">
            <span className="status-dot h-1.5 w-1.5 rounded-full bg-signal-ok" />
            AETHER SYSTEM &amp; CO.
          </p>

          {/* Заголовок с меняющимся словом */}
          <h1 className="mt-8 text-4xl leading-[1.02] font-medium tracking-tight text-ink sm:text-6xl lg:text-7xl xl:text-8xl">
            <span className="block">Мы связываем</span>
            <span className="mt-2 block h-[1.1em] overflow-hidden">
              <span
                key={wordIndex}
                className="block animate-[fadeUp_0.55s_cubic-bezier(0.16,1,0.3,1)] text-accent"
              >
                {CONNECTED[wordIndex]}
              </span>
            </span>
            <span className="mt-2 block">в единый контур</span>
          </h1>

          <p className="mt-10 max-w-2xl text-pretty text-base leading-relaxed text-ink-muted sm:text-lg">
            Цифровая инфраструктура для беспилотной и автономной авиации.
            Вместо разрозненных систем — одна связанная цифровая модель
            операции.
          </p>

          {/* Счётчики */}
          <dl className="mt-14 grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-4">
            {[
              { to: 18, suffix: "", label: "модулей платформы" },
              { to: 9, suffix: "", label: "категорий пользователей" },
              { to: 8, suffix: "", label: "отраслей применения" },
              { to: 6, suffix: "", label: "этапов развития рынка" },
            ].map((c) => (
              <div key={c.label}>
                <dd className="font-mono text-4xl text-accent lg:text-5xl">
                  <Counter to={c.to} suffix={c.suffix} />
                </dd>
                <dt className="mt-3 text-sm leading-snug text-ink-muted">
                  {c.label}
                </dt>
              </div>
            ))}
          </dl>
        </div>

        {/* Бегущая строка модулей */}
        <div className="mt-auto overflow-hidden border-y border-line py-4">
          <div className="marquee flex w-max gap-10">
            {[...MODULES, ...MODULES].map((m, i) => (
              <span
                key={`${m}-${i}`}
                className="font-mono text-[0.8125rem] tracking-[0.22em] whitespace-nowrap text-ink-faint"
              >
                {m}
                <span className="ml-10 text-accent/50">·</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="container-page py-20">
          <p className="hud-label">ВАРИАНТ D · КИНЕТИКА</p>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-muted">
            Движение создаёт текст: слово в заголовке перебирает всё, что
            связывает платформа, счётчики набегают, внизу идёт лента модулей.
            Графики почти нет — работает смысл и типографика.
          </p>
        </div>
      </section>
    </VariantShell>
  );
}
