"use client";

import { useEffect, useRef, useState } from "react";

import VariantShell from "../VariantShell";
import ExplodedDrone from "./ExplodedDrone";

/**
 * ВАРИАНТ C — «РАЗБОР».
 *
 * Аппарат в центре экрана: при прокрутке он поворачивается, детали
 * разлетаются, к каждой выезжает подпись. Приём из продуктовых
 * презентаций техники — изделие показывают в разрезе.
 *
 * Смысловая связка с продуктом: Digital Identity описывает аппарат
 * по частям (планер, силовая установка, полезная нагрузка, связь),
 * и разбор буквально показывает эту структуру.
 */

const parts = [
  {
    id: "airframe",
    name: "ПЛАНЕР",
    title: "Идентификатор и категория",
    text: "Серийный номер, производитель, модель, технические характеристики, регистрационные сведения.",
  },
  {
    id: "payload",
    name: "ПОЛЕЗНАЯ НАГРУЗКА",
    title: "Назначение операции",
    text: "Оптико-электронная станция, тип съёмки, параметры миссии и требования к результату.",
  },
  {
    id: "power",
    name: "СИЛОВАЯ УСТАНОВКА",
    title: "Техническая история",
    text: "Ресурс аккумуляторов и двигателей, плановое обслуживание, замены компонентов, дата следующего осмотра.",
  },
  {
    id: "comms",
    name: "СВЯЗЬ И НАВИГАЦИЯ",
    title: "Мониторинг и соответствие",
    text: "Телеметрия, сопоставление плановой и фактической траектории, контроль исполнения миссии.",
  },
];

export default function VariantC() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef({ value: 0 });
  const [active, setActive] = useState(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    let frame = 0;
    let last = -1;

    const measure = () => {
      const rect = wrap.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const passed = -rect.top;
      const p = scrollable <= 0 ? 0 : Math.min(1, Math.max(0, passed / scrollable));

      progressRef.current.value = p;

      const next = Math.min(parts.length - 1, Math.floor(p * parts.length));
      if (next !== last) {
        last = next;
        setActive(next);
      }
      frame = 0;
    };

    const onScroll = () => {
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
  }, []);

  const part = parts[active];

  return (
    <VariantShell id="c" name="РАЗБОР">
      <div ref={wrapRef} style={{ height: `${parts.length * 100}svh` }}>
        <div className="sticky top-0 h-svh overflow-hidden pt-12">
          {/* Модель во весь экран */}
          <div className="absolute inset-0">
            <ExplodedDrone progressRef={progressRef} activeIndex={active} />
          </div>

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-void/60"
          />

          {/* Подписи */}
          <div className="relative flex h-full flex-col justify-between py-10 lg:py-14">
            <div className="container-page">
              <p className="hud-label flex items-center gap-3 text-accent">
                <span className="status-dot h-1.5 w-1.5 rounded-full bg-accent" />
                AETHER NEXUS · DIGITAL IDENTITY
              </p>
              <h1 className="mt-5 max-w-2xl text-balance text-3xl leading-[1.1] font-medium tracking-tight text-ink sm:text-4xl lg:text-5xl">
                Аппарат становится
                <br />
                управляемым цифровым активом
              </h1>
            </div>

            <div className="container-page">
              <div key={part.id} className="max-w-lg animate-[fadeUp_0.6s_ease-out]">
                <p className="hud-label text-accent">{part.name}</p>
                <h2 className="mt-4 text-2xl font-medium tracking-tight text-ink lg:text-3xl">
                  {part.title}
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-ink-muted lg:text-base">
                  {part.text}
                </p>
              </div>

              {/* Указатель узлов */}
              <ul className="mt-10 flex gap-2">
                {parts.map((p, i) => (
                  <li
                    key={p.id}
                    className={`h-0.5 transition-all duration-500 ${
                      i === active ? "w-12 bg-accent" : "w-6 bg-line-strong"
                    }`}
                  />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <section className="border-t border-line">
        <div className="container-page py-20">
          <p className="hud-label">ВАРИАНТ C · РАЗБОР</p>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-muted">
            Изделие в центре внимания: при прокрутке аппарат вращается,
            узлы разлетаются и подсвечиваются по очереди. Подача как в
            продуктовых презентациях техники.
          </p>
        </div>
      </section>
    </VariantShell>
  );
}
