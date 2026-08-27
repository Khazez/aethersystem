"use client";

import { useEffect, useState } from "react";
import { ArrowDown } from "lucide-react";

import BootSequence, { type BootLine } from "@/components/scene/BootSequence";
import { InstrumentPanel } from "@/components/scene/Instruments";
import DroneViewer from "@/components/scene/DroneViewer";

/**
 * Первый экран прототипа.
 *
 * Логика подачи: сначала система «поднимается» — контуры платформы
 * подключаются один за другим, как при запуске бортового оборудования.
 * Только после этого проявляется заголовок и оживает приборная панель.
 *
 * Приборная панель здесь не украшение: это визуальный язык самого
 * продукта (интерфейс Aether Nexus построен как glass cockpit), поэтому
 * посетитель узнаёт продукт раньше, чем дочитает первый абзац.
 */

/** Контуры платформы — из описания продукта, не выдуманные. */
const bootLines: BootLine[] = [
  { code: "CORE", label: "Aether Core" },
  { code: "IDNT", label: "Digital Identity" },
  { code: "REGY", label: "Digital Registry" },
  { code: "UTM", label: "Unmanned Traffic Management" },
  { code: "GRID", label: "Airspace Grid" },
  { code: "CMPL", label: "Regulatory Compliance" },
  { code: "AI", label: "AI-Inspector" },
  { code: "GATE", label: "Integration Gateway" },
];

export default function PrototypeHero() {
  const [ready, setReady] = useState(false);

  /* Текст проявляется по собственному таймеру, а не по окончании
     последовательности запуска. Причина принципиальная: содержимое
     страницы не должно зависеть от того, доиграла ли анимация. Если
     что-то пойдёт не так, посетитель всё равно увидит заголовок.
     Эффект «система поднимается» при этом сохраняется — панель
     инициализации работает параллельно. */
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 260);
    return () => clearTimeout(t);
  }, []);

  /** Общий приём для проявляющихся блоков. */
  const reveal = (delay: number) => ({
    className: `transition-all duration-1000 ${
      ready ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
    }`,
    style: { transitionDelay: ready ? `${delay}ms` : "0ms" },
  });

  return (
    <section className="relative isolate flex min-h-svh flex-col justify-center overflow-hidden pt-14">
      {/* Фон: техническая сетка и мягкое свечение */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="bg-grid bg-grid-fade absolute inset-0" />
        <div
          className="absolute top-1/2 left-1/2 h-[46rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(31,127,147,0.3) 0%, transparent 68%)",
          }}
        />
      </div>

      <div className="container-page py-12 lg:py-16">
        {/* --- Верх: заголовок и последовательность запуска --- */}
        <div className="grid gap-10 lg:grid-cols-[1fr_21rem] lg:items-start lg:gap-14">
          <div>
            <p {...reveal(0)}>
              <span className="hud-label flex items-center gap-3">
                <span className="status-dot h-1.5 w-1.5 rounded-full bg-signal-ok" />
                AETHER SYSTEM &amp; CO.
              </span>
            </p>

            <h1
              {...reveal(120)}
              className={`mt-6 text-balance text-4xl leading-[1.05] font-medium tracking-tight text-ink sm:text-5xl lg:text-6xl xl:text-7xl ${reveal(120).className}`}
            >
              Воздушное пространство
              <br />
              становится <span className="text-accent">цифровым</span>
            </h1>

            <p
              {...reveal(280)}
              className={`mt-7 max-w-xl text-pretty text-base leading-relaxed text-ink-muted sm:text-lg ${reveal(280).className}`}
            >
              Мы строим цифровую инфраструктуру, в которой беспилотный аппарат,
              оператор, воздушное пространство, разрешение, норматив и
              коммерческая операция связаны в едином контуре.
            </p>

            <p
              {...reveal(420)}
              className={`mt-8 font-mono text-[0.6875rem] tracking-[0.3em] text-accent/70 uppercase ${reveal(420).className}`}
            >
              Technology for the Next Airspace
            </p>
          </div>

          {/* Правая колонка: осмотр аппарата + запуск систем */}
          <div className="flex flex-col gap-4">
            {/* Беспилотное воздушное судно — модель можно повернуть */}
            <div className="panel-corners border border-line bg-surface/60 p-4 backdrop-blur-sm">
              <p className="hud-label mb-2">БВС · ЦИФРОВОЙ ПРОФИЛЬ</p>
              <DroneViewer className="h-44 w-full" />
            </div>

            {/* Последовательность инициализации */}
            <div className="panel-corners border border-line bg-surface/60 p-5 backdrop-blur-sm">
              <p className="hud-label mb-4">ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ</p>
              <BootSequence
                lines={bootLines}
                readyLabel="ВСЕ КОНТУРЫ ПОДКЛЮЧЕНЫ"
              />
            </div>
          </div>
        </div>

        {/* --- Низ: приборная панель --- */}
        <div
          {...reveal(560)}
          className={`mt-10 lg:mt-14 ${reveal(560).className}`}
        >
          <InstrumentPanel />
        </div>
      </div>

      {/* Подсказка прокрутки */}
      <div
        className={`absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5 transition-opacity duration-1000 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="hud-label">ПРОКРУТИТЕ ВНИЗ</span>
        <ArrowDown className="h-4 w-4 animate-bounce text-ink-faint" />
      </div>
    </section>
  );
}
