"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Авиационные приборы — рабочая приборная панель.
 *
 * Интерфейс Aether Nexus построен в стилистике EFIS / glass cockpit
 * (стеклянная приборная панель воздушного судна). Здесь тот же язык
 * вынесен на сайт — и органы управления действительно работают:
 *
 *   ЯРКОСТЬ     — крутится, меняет свечение приборов
 *   КОНТРАСТ    — крутится, меняет контрастность шкал
 *   ТЕСТ ЛАМП   — реальная авиационная функция: все индикаторы уходят
 *                 на максимум, чтобы проверить исправность ламп
 *   ЗАЛИВ. СВЕТ — заливающая подсветка панели
 *
 * Всё рисуется в SVG — векторной графике, описанной кодом. В отличие
 * от картинки она чёткая на любом экране и весит килобайты.
 */

/* ========================================================================
   PFD — Primary Flight Display
   ===================================================================== */

export function ArtificialHorizon({
  roll = 0,
  pitch = 0,
  heading = 148,
}: {
  roll?: number;
  pitch?: number;
  heading?: number;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      className="h-full w-full"
      role="img"
      aria-label={`Авиагоризонт, курс ${Math.round(heading)}`}
    >
      <defs>
        <clipPath id="horizon-clip">
          <circle cx="60" cy="60" r="46" />
        </clipPath>
        <radialGradient id="glass-shine" cx="35%" cy="28%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="60" cy="60" r="52" fill="#0a0f14" />
      <circle
        cx="60"
        cy="60"
        r="49"
        fill="none"
        stroke="#24333f"
        strokeWidth="1.5"
      />

      <g clipPath="url(#horizon-clip)">
        {/* Небо и земля поворачиваются вместе — это и есть крен */}
        <g
          style={{
            transform: `rotate(${roll}deg) translateY(${pitch}px)`,
            transformOrigin: "60px 60px",
            transition: "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <rect x="-40" y="-40" width="200" height="100" fill="#2e6ea8" />
          <rect x="-40" y="60" width="200" height="140" fill="#8a6a3a" />
          <line
            x1="-40"
            y1="60"
            x2="160"
            y2="60"
            stroke="#e8eef4"
            strokeWidth="1.4"
          />
          {[-20, -10, 10, 20].map((deg) => (
            <line
              key={deg}
              x1={deg % 20 === 0 ? 46 : 51}
              y1={60 + deg}
              x2={deg % 20 === 0 ? 74 : 69}
              y2={60 + deg}
              stroke="#e8eef4"
              strokeWidth="0.9"
              opacity="0.85"
            />
          ))}
        </g>

        {/* Символ воздушного судна неподвижен — крен читается по фону */}
        <path
          d="M38 60 L52 60 M60 56 L60 60 M68 60 L82 60"
          stroke="#f0b429"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <rect x="56" y="57" width="8" height="4" fill="#f0b429" />

        <circle cx="60" cy="60" r="46" fill="url(#glass-shine)" />
      </g>

      <path d="M60 12 L56 19 L64 19 Z" fill="#e8eef4" />

      <rect
        x="34"
        y="90"
        width="52"
        height="15"
        rx="1"
        fill="#04070a"
        stroke="#35d07f"
        strokeWidth="0.9"
      />
      <text
        x="60"
        y="101"
        textAnchor="middle"
        className="font-mono"
        fontSize="10"
        fill="#35d07f"
        letterSpacing="0.5"
      >
        {`HDG ${String(Math.round(heading)).padStart(3, "0")}`}
      </text>
    </svg>
  );
}

/* ========================================================================
   Круглый стрелочный прибор
   ===================================================================== */

export function Gauge({
  value,
  max = 10,
  label,
  sublabel,
  unit,
  tone = "ok",
  sectors = false,
}: {
  value: number;
  max?: number;
  label: string;
  sublabel: string;
  unit?: string;
  tone?: "ok" | "warn" | "alert";
  sectors?: boolean;
}) {
  const colors = { ok: "#35d07f", warn: "#e0a53b", alert: "#e0554f" } as const;
  const color = colors[tone];

  /* Шкала занимает 270° — стандартная развёртка авиационного прибора. */
  const START = 135;
  const SWEEP = 270;
  const ratio = Math.min(1, Math.max(0, value / max));
  const needleAngle = START + ratio * SWEEP;

  const point = (angle: number, radius: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return [60 + Math.cos(rad) * radius, 60 + Math.sin(rad) * radius];
  };

  const arc = (from: number, to: number, radius: number) => {
    const [x1, y1] = point(START + from * SWEEP, radius);
    const [x2, y2] = point(START + to * SWEEP, radius);
    const large = to - from > 0.5 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
  };

  const ticks = Array.from({ length: 11 }, (_, i) => i / 10);

  return (
    <svg
      viewBox="0 0 120 120"
      className="h-full w-full"
      role="img"
      aria-label={`${label} — ${sublabel}: ${value}`}
    >
      <circle cx="60" cy="60" r="52" fill="#0a0f14" />
      <circle
        cx="60"
        cy="60"
        r="49"
        fill="none"
        stroke="#24333f"
        strokeWidth="1.5"
      />

      {sectors && (
        <>
          <path d={arc(0, 0.28, 42)} fill="none" stroke="#e0554f" strokeWidth="4" opacity="0.9" />
          <path d={arc(0.28, 0.58, 42)} fill="none" stroke="#e0a53b" strokeWidth="4" opacity="0.9" />
          <path d={arc(0.58, 1, 42)} fill="none" stroke="#35d07f" strokeWidth="4" opacity="0.9" />
        </>
      )}

      {ticks.map((t, i) => {
        const angle = START + t * SWEEP;
        const major = i % 2 === 0;
        const [x1, y1] = point(angle, major ? 33 : 35);
        const [x2, y2] = point(angle, 38);
        return (
          <line
            key={t}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#94a6b6"
            strokeWidth={major ? 1.5 : 0.8}
            opacity={major ? 0.9 : 0.5}
          />
        );
      })}

      {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => {
        const [x, y] = point(START + t * SWEEP, 25);
        return (
          <text
            key={t}
            x={x}
            y={y + 2.5}
            textAnchor="middle"
            className="font-mono"
            fontSize="6.5"
            fill="#5d7183"
          >
            {Math.round(t * max)}
          </text>
        );
      })}

      {unit && (
        <text
          x="60"
          y="76"
          textAnchor="middle"
          className="font-mono"
          fontSize="5"
          fill="#5d7183"
          letterSpacing="0.6"
        >
          {unit}
        </text>
      )}

      <g
        style={{
          transform: `rotate(${needleAngle}deg)`,
          transformOrigin: "60px 60px",
          transition: "transform 1s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <path d="M60 26 L57.5 60 L62.5 60 Z" fill={color} />
      </g>
      <circle cx="60" cy="60" r="4.5" fill="#0a0f14" stroke={color} strokeWidth="1.4" />

      <rect
        x="41"
        y="86"
        width="38"
        height="14"
        rx="1"
        fill="#04070a"
        stroke="#1d2a35"
        strokeWidth="0.8"
      />
      <text
        x="60"
        y="96.5"
        textAnchor="middle"
        className="font-mono"
        fontSize="10"
        fill={color}
        letterSpacing="0.4"
      >
        {value}
      </text>
    </svg>
  );
}

/* ========================================================================
   РАБОЧАЯ ПОВОРОТНАЯ РУЧКА
   ===================================================================== */

/**
 * Ручка, которую действительно можно крутить.
 *
 * Управление: тянуть мышью/пальцем вверх-вниз, колесо мыши, стрелки
 * с клавиатуры. Клавиатура здесь не формальность — без неё регулятором
 * не сможет воспользоваться человек, работающий без мыши, а для
 * государственного сайта это требование.
 *
 * Для скринридера элемент объявлен как ползунок (role="slider") —
 * тогда он читается как «регулятор яркости, 72 процента».
 */
export function ControlKnob({
  label,
  value,
  onChange,
  leftMark = "DIM",
  rightMark = "BRT",
}: {
  label: string;
  /** Положение от 0 до 1. */
  value: number;
  onChange: (value: number) => void;
  leftMark?: string;
  rightMark?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const lastY = useRef(0);
  /* Состояние, а не ref: во время перетаскивания анимацию указателя
     нужно отключить, а для этого о ней должна знать сама отрисовка. */
  const [dragging, setDragging] = useState(false);

  const clamp = (v: number) => Math.min(1, Math.max(0, v));

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    lastY.current = e.clientY;
    // Захват указателя: движение продолжает отслеживаться, даже если
    // курсор ушёл за пределы ручки.
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const delta = lastY.current - e.clientY;
    lastY.current = e.clientY;
    // 140 пикселей хода = полный оборот регулятора.
    onChange(clamp(value + delta / 140));
  };

  const endDrag = () => {
    setDragging(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.2 : 0.05;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") {
      e.preventDefault();
      onChange(clamp(value + step));
    } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
      e.preventDefault();
      onChange(clamp(value - step));
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(0);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(1);
    }
  };

  /* Колесо мыши вешается вручную с passive: false — иначе браузер не
     даст отменить прокрутку страницы, и вращение ручки будет её листать. */
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      onChange(clamp(value - e.deltaY / 900));
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [value, onChange]);

  /** Рабочий ход ручки — 270°, как у прибора. */
  const angle = -135 + value * 270;
  const percent = Math.round(value * 100);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg
        ref={ref}
        viewBox="0 0 80 80"
        className="h-full w-full cursor-ns-resize touch-none select-none"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}%`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        <defs>
          <radialGradient id={`knob-${label}`} cx="38%" cy="30%">
            <stop offset="0%" stopColor="#2a3843" />
            <stop offset="100%" stopColor="#111a22" />
          </radialGradient>
        </defs>

        {/* Дуга пройденного хода — видно, насколько выкручено */}
        <path
          d="M 18.7 61.3 A 30 30 0 1 1 61.3 61.3"
          fill="none"
          stroke="#1d2a35"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M 18.7 61.3 A 30 30 0 1 1 61.3 61.3"
          fill="none"
          stroke="#4bc8e0"
          strokeWidth="2.5"
          strokeLinecap="round"
          /* Длина дуги 270° при радиусе 30 ≈ 141. Обрезаем её по
             текущему положению — получается индикатор заполнения. */
          strokeDasharray={`${value * 141} 141`}
          opacity="0.9"
        />

        {[-135, -67, 0, 67, 135].map((a, i) => {
          const rad = ((a - 90) * Math.PI) / 180;
          return (
            <line
              key={a}
              x1={40 + Math.cos(rad) * 34}
              y1={40 + Math.sin(rad) * 34}
              x2={40 + Math.cos(rad) * 37}
              y2={40 + Math.sin(rad) * 37}
              stroke="#5d7183"
              strokeWidth={i === 2 ? 1.6 : 1}
              opacity="0.8"
            />
          );
        })}

        <text x="4" y="70" className="font-mono" fontSize="6" fill="#5d7183">
          {leftMark}
        </text>
        <text
          x="76"
          y="70"
          textAnchor="end"
          className="font-mono"
          fontSize="6"
          fill="#5d7183"
        >
          {rightMark}
        </text>

        <circle cx="40" cy="40" r="23" fill={`url(#knob-${label})`} />
        <circle cx="40" cy="40" r="23" fill="none" stroke="#33454f" strokeWidth="1.2" />

        {/* Насечка по ободу — ручка должна выглядеть как то, за что берутся */}
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={40 + Math.cos(a) * 20}
              y1={40 + Math.sin(a) * 20}
              x2={40 + Math.cos(a) * 23}
              y2={40 + Math.sin(a) * 23}
              stroke="#0d151c"
              strokeWidth="1.4"
              opacity="0.7"
            />
          );
        })}

        {/* Указатель положения */}
        <g
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: "40px 40px",
            transition: dragging
              ? "none"
              : "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <line
            x1="40"
            y1="40"
            x2="40"
            y2="22"
            stroke="#e8eef4"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </g>
      </svg>

      <span className="hud-label text-center text-[0.5rem] leading-tight">
        {label}
      </span>
      <span className="font-mono text-[0.5625rem] text-accent tabular-nums">
        {percent}%
      </span>
    </div>
  );
}

/* ========================================================================
   РАБОЧИЙ ТУМБЛЕР
   ===================================================================== */

export function ToggleSwitch({
  label,
  on,
  onToggle,
  topMark = "TEST",
  bottomMark = "NORM",
}: {
  label: string;
  on: boolean;
  onToggle: (on: boolean) => void;
  topMark?: string;
  bottomMark?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => onToggle(!on)}
        aria-pressed={on}
        aria-label={`${label}: ${on ? topMark : bottomMark}`}
        className="w-full cursor-pointer"
      >
        <svg viewBox="0 0 60 90" className="h-full w-full">
          <rect
            x="12"
            y="6"
            width="36"
            height="78"
            rx="3"
            fill="#0d151c"
            stroke={on ? "#4bc8e0" : "#24333f"}
            strokeWidth="1"
            style={{ transition: "stroke 0.3s" }}
          />
          <text
            x="30"
            y="18"
            textAnchor="middle"
            className="font-mono"
            fontSize="6"
            fill={on ? "#4bc8e0" : "#5d7183"}
            style={{ transition: "fill 0.3s" }}
          >
            {topMark}
          </text>
          <text
            x="30"
            y="80"
            textAnchor="middle"
            className="font-mono"
            fontSize="6"
            fill={on ? "#5d7183" : "#94a6b6"}
            style={{ transition: "fill 0.3s" }}
          >
            {bottomMark}
          </text>

          {/* Рычажок: вверх — включено, вниз — выключено */}
          <g
            style={{
              transform: on ? "translateY(-14px)" : "translateY(4px)",
              transformOrigin: "30px 45px",
              transition: "transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <rect x="26" y="32" width="8" height="24" rx="4" fill="#8fa3b3" />
            <circle cx="30" cy="32" r="6.5" fill="#c9d6e0" />
            <circle cx="30" cy="30" r="2" fill="#e8eef4" />
          </g>
          <ellipse cx="30" cy="58" rx="11" ry="5" fill="#1a252e" />
        </svg>
      </button>

      <span className="hud-label text-center text-[0.5rem] leading-tight">
        {label}
      </span>
    </div>
  );
}

/* ========================================================================
   ПАНЕЛЬ ЦЕЛИКОМ
   ===================================================================== */

export function InstrumentPanel() {
  /* Положения органов управления. Это настоящее состояние панели —
     от него зависит, как выглядят и что показывают приборы. */
  const [brightness, setBrightness] = useState(0.72);
  const [contrast, setContrast] = useState(0.6);
  const [lampTest, setLampTest] = useState(false);
  const [floodLight, setFloodLight] = useState(true);

  /* Приборы «оживают» после появления: стрелки приходят к рабочим
     значениям, как при запуске оборудования. */
  const [live, setLive] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLive(true), 500);
    return () => clearTimeout(t);
  }, []);

  /* ТЕСТ ЛАМП — настоящая авиационная функция: пока тумблер поднят,
     все индикаторы выведены на максимум, чтобы убедиться, что ни одна
     лампа не перегорела. Здесь так же: все стрелки уходят в предел. */
  const reading = useCallback(
    (working: number, max: number) => {
      if (lampTest) return max;
      return live ? working : 0;
    },
    [lampTest, live],
  );

  const gauges = [
    { value: reading(4, 10), max: 10, label: "В ПОЛЁТЕ", sublabel: "ACTIVE", tone: "ok" as const },
    { value: reading(0, 10), max: 10, label: "ОЧЕРЕДЬ", sublabel: "ЗАЯВКИ", tone: "ok" as const },
    { value: reading(10, 20), max: 20, label: "ALERT", sublabel: "ИНЦИДЕНТЫ", tone: "alert" as const },
    { value: reading(68, 100), max: 100, label: "ФЛОТ", sublabel: "ОДОБРЕНО", tone: "warn" as const, sectors: true, unit: "PCT ×10" },
    { value: reading(90, 100), max: 100, label: "СТАНЦИИ", sublabel: "ONLINE", tone: "ok" as const, sectors: true, unit: "PCT ×10" },
  ];

  /* Ручки управляют реальными CSS-фильтрами блока приборов.
     Диапазоны подобраны так, чтобы на любом положении панель
     оставалась читаемой — как на настоящем оборудовании, где
     регулятор не может погасить прибор полностью. */
  const filter = `brightness(${0.45 + brightness * 0.95}) contrast(${0.75 + contrast * 0.6})`;

  return (
    <div
      className="panel-corners relative border border-line bg-surface/70 p-3 backdrop-blur-sm sm:p-4"
      style={{
        // Заливающая подсветка панели — как подсвет кабины ночью.
        boxShadow: floodLight
          ? "inset 0 0 60px rgba(75,200,224,0.09), 0 0 40px rgba(75,200,224,0.05)"
          : "none",
        transition: "box-shadow 0.5s",
      }}
    >
      {/* Подсказка, что панель живая */}
      <p className="hud-label absolute -top-2.5 left-4 bg-void px-2 text-[0.5rem]">
        ПАНЕЛЬ УПРАВЛЕНИЯ · РУЧКИ РАБОЧИЕ
      </p>

      <div className="flex items-stretch gap-3 sm:gap-4">
        {/* --- Левый блок --- */}
        <div className="hidden w-16 shrink-0 flex-col justify-between gap-4 lg:flex">
          <ControlKnob label="ЯРКОСТЬ" value={brightness} onChange={setBrightness} />
          <ToggleSwitch label="ТЕСТ ЛАМП" on={lampTest} onToggle={setLampTest} />
        </div>

        {/* --- Приборы --- */}
        <div
          className="min-w-0 flex-1 border border-line bg-abyss/70 p-2.5 sm:p-3"
          style={{ filter, transition: "filter 0.25s" }}
        >
          <ul className="grid grid-cols-3 gap-2 sm:gap-2.5 lg:grid-cols-6">
            <li className="border border-line bg-void/60 p-2">
              <div className="aspect-square">
                <ArtificialHorizon
                  roll={lampTest ? 0 : live ? -8 : 0}
                  pitch={lampTest ? 0 : live ? 4 : 0}
                  heading={lampTest ? 888 : 148}
                />
              </div>
              <p className="mt-2 text-center text-[0.5625rem] font-medium tracking-[0.1em] text-ink">
                PFD
              </p>
              <p className="hud-label mt-0.5 text-center text-[0.5rem]">ATT · HDG</p>
            </li>

            {gauges.map((g, i) => (
              <li
                key={g.label}
                /* На телефоне помещаются три прибора — иначе панель
                   вытесняет заголовок за экран. */
                className={`border border-line bg-void/60 p-2 ${
                  i >= 2 ? "hidden sm:block" : ""
                }`}
              >
                <div className="aspect-square">
                  <Gauge {...g} />
                </div>
                <p className="mt-2 truncate text-center text-[0.5625rem] font-medium tracking-[0.1em] text-ink">
                  {g.label}
                </p>
                <p className="hud-label mt-0.5 truncate text-center text-[0.5rem]">
                  {g.sublabel}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* --- Правый блок --- */}
        <div className="hidden w-16 shrink-0 flex-col justify-between gap-4 lg:flex">
          <ControlKnob
            label="КОНТРАСТ"
            value={contrast}
            onChange={setContrast}
            leftMark="LO"
            rightMark="HI"
          />
          <ToggleSwitch
            label="ЗАЛИВ. СВЕТ"
            on={floodLight}
            onToggle={setFloodLight}
            topMark="BRT"
            bottomMark="OFF"
          />
        </div>
      </div>

      {/* Строка состояния — реагирует на органы управления */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-line pt-2.5">
        {lampTest ? (
          <span className="font-mono text-[0.625rem] tracking-[0.14em] text-signal-warn">
            ● ТЕСТ ЛАМП — ВСЕ ИНДИКАТОРЫ НА МАКСИМУМЕ
          </span>
        ) : (
          <span className="font-mono text-[0.625rem] tracking-[0.14em] text-signal-ok">
            ● РЕЖИМ НОРМА · ДАННЫЕ АКТУАЛЬНЫ
          </span>
        )}
        <span className="hidden font-mono text-[0.625rem] tracking-[0.14em] text-ink-faint lg:inline">
          ЗАЛИВ. СВЕТ: {floodLight ? "ВКЛ" : "ВЫКЛ"}
        </span>
        <span className="ml-auto hidden font-mono text-[0.625rem] tracking-[0.14em] text-ink-faint lg:inline">
          ПОКРУТИТЕ РУЧКИ · ЩЁЛКНИТЕ ТУМБЛЕРЫ
        </span>
      </div>
    </div>
  );
}
