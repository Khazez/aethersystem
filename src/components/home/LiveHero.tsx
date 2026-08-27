"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, Pause, Play } from "lucide-react";

import LiveMap from "./LiveMap";

/* Трёхмерная сцена подгружается отдельным куском и только если она
   действительно будет показана. Библиотека three.js весит сотни
   килобайт — тянуть её на телефон, где сцена всё равно не включится,
   значит зря расходовать трафик посетителя. */
const HeroScene3D = dynamic(() => import("./HeroScene3D"), { ssr: false });
import { href } from "@/lib/nav";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";

/**
 * Первый экран главной: платформа показана в работе, а не описана словами.
 *
 * Движение здесь не декоративное — это данные: борта идут по маршрутам,
 * приходят события, меняются счётчики. Экран живёт сам, до того как
 * посетитель тронул прокрутку.
 *
 * ВАЖНО, это госзаказ: все значения СМОДЕЛИРОВАНЫ в браузере, реального
 * подключения к платформе нет. На экране это помечено явно и не мелким
 * шрифтом — выдавать выдуманные цифры за оперативные данные нельзя.
 *
 * Ленту можно остановить кнопкой: бесконечно движущийся блок мешает
 * читать, а для государственного сайта возможность его остановить —
 * требование доступности, а не удобство.
 */

type Stats = {
  active: number;
  queue: number;
  alerts: number;
  stations: number;
};

type LogEntry = {
  id: number;
  time: string;
  code: string;
  text: string;
  tone: string;
};

/** Стартовые значения — одинаковы на сервере и в браузере, иначе разметка «поедет». */
const INITIAL: Stats = { active: 24, queue: 6, alerts: 2, stations: 19 };

const TONE_CLASS: Record<string, string> = {
  ok: "text-signal-ok",
  warn: "text-signal-warn",
  alert: "text-signal-alert",
  idle: "text-ink-muted",
};

/** Сколько строк держим в ленте. Пять, а не восемь: правая колонка
 *  сверху отдана трёхмерной сцене, панель прижата к низу. */
const FEED_SIZE = 5;

/**
 * Есть ли в браузере рабочий WebGL — технология, которой рисуется
 * трёхмерная графика. На старых машинах и в урезанных браузерах
 * её может не быть, и тогда вместо сцены показывается плоская карта.
 *
 * Проверка живёт здесь, а не в самой сцене: импорт из того файла
 * притянул бы three.js даже туда, где сцена не нужна.
 */
function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Результат проверки кэшируем: создавать canvas на каждый кадр незачем. */
let cachedBackground: "3d" | "2d" | null = null;

/**
 * Чем рисовать фон первого экрана. Плоская карта вместо трёхмерной сцены,
 * если: нет WebGL; узкий экран (сцена заметно греет телефон); включено
 * системное «уменьшить движение».
 */
function readBackground(): "3d" | "2d" {
  if (cachedBackground) return cachedBackground;
  const narrow = window.matchMedia("(max-width: 1023px)").matches;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  cachedBackground = narrow || calm || !hasWebGL() ? "2d" : "3d";
  return cachedBackground;
}

/** Окружение за время жизни страницы не меняется — подписка пустая. */
const subscribeNever = () => () => {};

function clock(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export default function LiveHero({
  locale,
  t,
}: {
  locale: Locale;
  t: Dictionary;
}) {
  const h = t.home.hero;
  const l = h.live;

  const [log, setLog] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<Stats>(INITIAL);
  const [updated, setUpdated] = useState<string>("");
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  /* На сервере фон ещё не выбран (там нет ни экрана, ни WebGL), поэтому
     серверный снимок — null. В браузере значение считается один раз. */
  const background = useSyncExternalStore(
    subscribeNever,
    readBackground,
    () => null,
  );

  const nextId = useRef(0);
  /** Какие счётчики только что изменились — для короткой подсветки цифры. */
  const [flash, setFlash] = useState<Record<string, boolean>>({});

  /* Уважаем системную настройку «уменьшить движение»: тогда экран
     показывает один статичный срез вместо бесконечного обновления. */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  /* Лента событий — главный источник движения на экране. */
  useEffect(() => {
    const pool = l.events;

    const makeEntry = (index?: number): LogEntry => {
      const tpl = pool[index ?? Math.floor(Math.random() * pool.length)];
      const n = String(Math.floor(Math.random() * 90) + 10);
      return {
        id: nextId.current++,
        time: clock(new Date()),
        code: tpl.code,
        text: tpl.text.replace("{n}", n),
        tone: tpl.tone,
      };
    };

    if (reduceMotion) {
      // Статичный срез: несколько записей, дальше ничего не движется.
      setLog(Array.from({ length: 5 }, (_, i) => makeEntry(i)));
      setUpdated(clock(new Date()));
      return;
    }
    if (paused) return;

    const push = () => {
      setLog((prev) => [makeEntry(), ...prev].slice(0, FEED_SIZE));
      setUpdated(clock(new Date()));
    };

    push();
    const id = setInterval(push, 1700);
    return () => clearInterval(id);
  }, [paused, reduceMotion, l.events]);

  /* Счётчики слегка «дышат» — как реальные показатели, а не картинка. */
  useEffect(() => {
    if (reduceMotion || paused) return;

    const timers: number[] = [];

    const id = setInterval(() => {
      setStats((s) => {
        const next: Stats = {
          active: Math.max(
            18,
            Math.min(34, s.active + (Math.random() > 0.5 ? 1 : -1)),
          ),
          queue: Math.max(
            0,
            Math.min(12, s.queue + (Math.random() > 0.5 ? 1 : -1)),
          ),
          alerts: Math.max(
            0,
            Math.min(
              5,
              s.alerts + (Math.random() > 0.78 ? 1 : Math.random() > 0.6 ? -1 : 0),
            ),
          ),
          stations: Math.max(
            17,
            Math.min(
              21,
              s.stations +
                (Math.random() > 0.85 ? 1 : Math.random() > 0.75 ? -1 : 0),
            ),
          ),
        };

        const changed: Record<string, boolean> = {};
        (Object.keys(next) as Array<keyof Stats>).forEach((k) => {
          if (next[k] !== s[k]) changed[k] = true;
        });
        setFlash(changed);
        timers.push(window.setTimeout(() => setFlash({}), 420));

        return next;
      });
    }, 2600);

    return () => {
      clearInterval(id);
      timers.forEach(clearTimeout);
    };
  }, [paused, reduceMotion]);

  const counters: Array<{
    key: keyof Stats;
    label: string;
    value: string;
    tone: string;
  }> = [
    {
      key: "active",
      label: l.counters.active,
      value: String(stats.active),
      tone: "text-accent",
    },
    {
      key: "queue",
      label: l.counters.queue,
      value: String(stats.queue),
      tone: "text-ink",
    },
    {
      key: "alerts",
      label: l.counters.alerts,
      value: String(stats.alerts),
      tone: "text-signal-alert",
    },
    {
      key: "stations",
      label: l.counters.stations,
      value: `${stats.stations}/21`,
      tone: "text-signal-ok",
    },
  ];

  return (
    <section className="relative isolate flex min-h-svh flex-col overflow-hidden pt-18">
      {/* --- Фон: диспетчерская карта с идущими бортами --- */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0" data-hero-bg={background ?? "pending"}>
          {background === "3d" && <HeroScene3D className="h-full w-full" />}
          {background === "2d" && <LiveMap />}
        </div>
        <div className="bg-grid bg-grid-fade absolute inset-0" />
        {/* Затемнение слева направо: под текстом карта приглушена, справа видна */}
        {/* Затемнение ровно настолько, чтобы текст читался: карта — главный
            смысл этого экрана, гасить её нельзя. Слева, под заголовком,
            плотнее; справа борта видно. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-void via-void/74 to-void/5"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-void/85 via-transparent to-void/55"
        />
      </div>

      <div className="container-page flex flex-1 flex-col py-8 lg:py-10">
        {/* --- Строка состояния --- */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line pb-4">
          <span className="flex items-center gap-2.5 font-mono text-[0.6875rem] tracking-[0.16em] text-signal-ok">
            <span
              className={`h-1.5 w-1.5 rounded-full bg-signal-ok ${
                reduceMotion || paused ? "" : "status-dot"
              }`}
            />
            {l.statusOnline}
          </span>
          <span className="hud-label">{l.context}</span>
          <span className="hud-label ml-auto text-signal-warn">
            {l.demoNotice}
          </span>
        </div>

        <div className="mt-10 grid flex-1 items-start gap-12 lg:mt-14 lg:grid-cols-[1fr_21rem] lg:items-stretch lg:gap-16">
          {/* ================= Левая часть ================= */}
          <div>
            <p className="hud-label">{h.eyebrow}</p>

            <h1 className="mt-6 text-balance text-4xl leading-[1.08] font-medium tracking-tight text-ink sm:text-5xl lg:text-[3.75rem]">
              {h.title}
            </h1>

            <p className="mt-7 max-w-2xl text-pretty text-base leading-relaxed text-ink-muted sm:text-lg">
              {h.subtitle}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={href(locale, "/product")}
                className="group inline-flex min-h-11 items-center justify-center gap-2.5 border border-accent bg-accent/12 px-6 py-3.5 text-sm tracking-wide text-accent transition-colors hover:bg-accent/20"
              >
                {h.primaryCta}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>

              <Link
                href={href(locale, "/partnership")}
                className="inline-flex min-h-11 items-center justify-center gap-2.5 border border-line px-6 py-3.5 text-sm tracking-wide text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
              >
                {h.secondaryCta}
              </Link>
            </div>

            {/* --- Счётчики --- */}
            <dl className="mt-12 grid grid-cols-2 gap-px border border-line bg-line lg:grid-cols-4">
              {counters.map((c) => (
                <div
                  key={c.key}
                  className="bg-surface/80 px-5 py-6 backdrop-blur-sm"
                >
                  <dd
                    className={`font-mono text-3xl tabular-nums transition-opacity duration-300 lg:text-4xl ${c.tone} ${
                      flash[c.key] ? "opacity-60" : "opacity-100"
                    }`}
                  >
                    {c.value}
                  </dd>
                  <dt className="hud-label mt-3">{c.label}</dt>
                </div>
              ))}
            </dl>

            {/* Оговорка про демонстрационные данные — видимая, не мелким шрифтом */}
            <p className="mt-5 max-w-xl text-xs leading-relaxed text-ink-faint">
              {l.demoExplain}
            </p>
          </div>

          {/* ================= Лента событий =================
              Панель прижата к низу колонки: место над ней оставлено
              беспилотнику, иначе он прятался за ней. */}
          <div className="flex flex-col justify-end">
          <div className="panel-corners border border-line bg-surface/70 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="hud-label">{l.feedTitle}</p>

              {!reduceMotion && (
                <button
                  type="button"
                  onClick={() => setPaused((p) => !p)}
                  aria-pressed={paused}
                  data-feed-toggle
                  className="inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap px-2 font-mono text-[0.625rem] tracking-[0.12em] text-ink-muted transition-colors hover:text-accent"
                >
                  {paused ? (
                    <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {paused ? l.resume : l.pause}
                </button>
              )}
            </div>

            {/* Высота зафиксирована — иначе при появлении строк страница дёргается */}
            <ul data-feed className="mt-4 flex min-h-[10.5rem] flex-col gap-2.5">
              {log.map((e, i) => (
                <li
                  key={e.id}
                  data-feed-row
                  className="flex items-start gap-3 border-b border-line/60 pb-2.5 last:border-0"
                  style={{
                    animation:
                      i === 0 && !reduceMotion
                        ? "fadeUp 0.45s ease-out"
                        : undefined,
                    opacity: 1 - i * 0.085,
                  }}
                >
                  <span className="font-mono text-[0.625rem] tabular-nums text-ink-faint">
                    {e.time}
                  </span>
                  <span
                    className={`w-10 shrink-0 font-mono text-[0.625rem] tracking-wider ${
                      TONE_CLASS[e.tone] ?? "text-ink-muted"
                    }`}
                  >
                    {e.code}
                  </span>
                  <span className="min-w-0 flex-1 font-mono text-[0.6875rem] leading-relaxed text-ink-muted">
                    {e.text}
                  </span>
                </li>
              ))}
            </ul>

            {updated && (
              <p className="mt-4 border-t border-line/60 pt-3 font-mono text-[0.625rem] tracking-[0.12em] text-ink-faint">
                {l.updatedLabel} {updated}
              </p>
            )}
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
