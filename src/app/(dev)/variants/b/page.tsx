"use client";

import { useEffect, useRef, useState } from "react";

import VariantShell from "../VariantShell";
import LiveMap from "@/components/home/LiveMap";

/**
 * ВАРИАНТ B — «ЖИВОЙ ЭФИР».
 *
 * Сайт выглядит как работающая система: борта идут по маршрутам,
 * счётчики меняются, приходят события, вспыхивают тревоги. Движение
 * здесь не декоративное — это данные, которые всё время обновляются.
 *
 * Все значения смоделированы на стороне браузера: сайт информационный,
 * реального подключения к платформе нет. На экране это честно
 * помечено словом «демонстрация».
 */

/** Заготовки событий — из реальной терминологии продукта. */
const EVENT_POOL = [
  { code: "AUTH", text: "Разрешение выдано · KZ-UAS-0{n}", tone: "ok" },
  { code: "PLAN", text: "Миссия принята к проверке · M-{n}", tone: "idle" },
  { code: "CMPL", text: "Проверка соответствия: COMPLIANT", tone: "ok" },
  { code: "CMPL", text: "Проверка соответствия: CONDITIONAL", tone: "warn" },
  { code: "CONF", text: "Отклонение от маршрута · борт {n}", tone: "warn" },
  { code: "ZONE", text: "Активирована зона ограничения R-{n}", tone: "alert" },
  { code: "DONE", text: "Операция завершена · результат принят", tone: "ok" },
  { code: "MNT", text: "Назначено обслуживание · борт {n}", tone: "idle" },
  { code: "GATE", text: "Обмен данными с внешней системой", tone: "idle" },
  { code: "FLT", text: "Взлёт разрешён · станция {n}", tone: "ok" },
];

type LogEntry = {
  id: number;
  time: string;
  code: string;
  text: string;
  tone: string;
};

export default function VariantB() {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState({
    active: 24,
    queue: 6,
    alerts: 2,
    stations: 19,
  });
  const nextId = useRef(0);

  /* Лента событий: новая запись приходит каждые полторы-две секунды.
     Это главный источник движения на экране. */
  useEffect(() => {
    const push = () => {
      const tpl = EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)];
      const n = String(Math.floor(Math.random() * 90) + 10);
      const now = new Date();

      const entry: LogEntry = {
        id: nextId.current++,
        time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`,
        code: tpl.code,
        text: tpl.text.replace("{n}", n),
        tone: tpl.tone,
      };

      // Держим только последние записи — лента не должна расти вечно.
      setLog((prev) => [entry, ...prev].slice(0, 9));
    };

    push();
    const id = setInterval(push, 1700);
    return () => clearInterval(id);
  }, []);

  /* Счётчики слегка «дышат» — как реальные показатели, а не
     нарисованные цифры. */
  useEffect(() => {
    const id = setInterval(() => {
      setStats((s) => ({
        active: Math.max(18, Math.min(34, s.active + (Math.random() > 0.5 ? 1 : -1))),
        queue: Math.max(0, Math.min(12, s.queue + (Math.random() > 0.5 ? 1 : -1))),
        alerts: Math.max(0, Math.min(5, s.alerts + (Math.random() > 0.78 ? 1 : Math.random() > 0.6 ? -1 : 0))),
        stations: Math.max(17, Math.min(21, s.stations + (Math.random() > 0.85 ? 1 : Math.random() > 0.75 ? -1 : 0))),
      }));
    }, 2600);
    return () => clearInterval(id);
  }, []);

  const toneColor: Record<string, string> = {
    ok: "text-signal-ok",
    warn: "text-signal-warn",
    alert: "text-signal-alert",
    idle: "text-ink-muted",
  };

  const counters = [
    { label: "В ПОЛЁТЕ", value: stats.active, tone: "text-accent" },
    { label: "ОЧЕРЕДЬ ЗАЯВОК", value: stats.queue, tone: "text-ink" },
    { label: "ИНЦИДЕНТЫ", value: stats.alerts, tone: "text-signal-alert" },
    { label: "СТАНЦИИ ONLINE", value: `${stats.stations}/21`, tone: "text-signal-ok" },
  ];

  return (
    <VariantShell id="b" name="ЖИВОЙ ЭФИР">
      <section className="relative min-h-svh overflow-hidden pt-12">
        {/* Карта с движущимися бортами — фон всего экрана */}
        <div className="absolute inset-0">
          <LiveMap />
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-void via-void/78 to-void/25"
        />

        <div className="relative container-page py-10 lg:py-14">
          {/* Верхняя строка состояния */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line pb-4">
            <span className="flex items-center gap-2.5 font-mono text-[0.6875rem] tracking-[0.16em] text-signal-ok">
              <span className="status-dot h-1.5 w-1.5 rounded-full bg-signal-ok" />
              SYSTEM ONLINE
            </span>
            <span className="hud-label">AETHER NEXUS · ЦУП</span>
            <span className="hud-label ml-auto">
              ДЕМОНСТРАЦИЯ · ДАННЫЕ СМОДЕЛИРОВАНЫ
            </span>
          </div>

          <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_23rem] lg:gap-16">
            {/* --- Левая часть: заголовок и счётчики --- */}
            <div>
              <h1 className="text-balance text-4xl leading-[1.06] font-medium tracking-tight text-ink sm:text-5xl lg:text-6xl">
                Система, которая
                <br />
                работает <span className="text-accent">прямо сейчас</span>
              </h1>

              <p className="mt-7 max-w-xl text-pretty text-base leading-relaxed text-ink-muted sm:text-lg">
                Aether Nexus связывает аппарат, оператора, воздушное
                пространство, разрешение и норматив в едином цифровом контуре —
                и держит всю картину операций в реальном времени.
              </p>

              {/* Счётчики */}
              <dl className="mt-12 grid grid-cols-2 gap-px border border-line bg-line lg:grid-cols-4">
                {counters.map((c) => (
                  <div key={c.label} className="bg-surface/80 px-5 py-6 backdrop-blur-sm">
                    <dd
                      className={`font-mono text-3xl tabular-nums transition-colors duration-500 lg:text-4xl ${c.tone}`}
                    >
                      {c.value}
                    </dd>
                    <dt className="hud-label mt-3">{c.label}</dt>
                  </div>
                ))}
              </dl>
            </div>

            {/* --- Правая часть: лента событий --- */}
            <div className="panel-corners border border-line bg-surface/70 p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <p className="hud-label">ЛЕНТА СОБЫТИЙ</p>
                <span className="status-dot h-1.5 w-1.5 rounded-full bg-signal-ok" />
              </div>

              <ul className="mt-5 flex flex-col gap-2.5">
                {log.map((e, i) => (
                  <li
                    key={e.id}
                    className="flex items-start gap-3 border-b border-line/60 pb-2.5 last:border-0"
                    style={{
                      // Новая запись выезжает сверху, старые тускнеют,
                      // уходя вниз — лента ощущается живой.
                      animation: i === 0 ? "fadeUp 0.45s ease-out" : undefined,
                      opacity: 1 - i * 0.085,
                    }}
                  >
                    <span className="font-mono text-[0.625rem] text-ink-faint tabular-nums">
                      {e.time}
                    </span>
                    <span
                      className={`w-10 shrink-0 font-mono text-[0.625rem] tracking-wider ${toneColor[e.tone]}`}
                    >
                      {e.code}
                    </span>
                    <span className="min-w-0 flex-1 font-mono text-[0.6875rem] leading-relaxed text-ink-muted">
                      {e.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="container-page py-20">
          <p className="hud-label">ВАРИАНТ B · ЖИВОЙ ЭФИР</p>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-muted">
            Движение создают данные: борта идут по маршрутам, события
            приходят каждые пару секунд, счётчики меняются. Сайт выглядит не
            как презентация продукта, а как сам продукт в работе.
          </p>
        </div>
      </section>
    </VariantShell>
  );
}
