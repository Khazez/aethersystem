"use client";

import { useMemo, useState } from "react";
import { ShieldCheck, TriangleAlert, ShieldX, Loader2 } from "lucide-react";

/**
 * Живая демонстрация Regulatory Compliance Engine.
 *
 * Посетитель задаёт параметры операции — система прогоняет их через
 * набор проверок и выдаёт вердикт: COMPLIANT / CONDITIONAL /
 * NON-COMPLIANT, ровно как описано в документации продукта.
 *
 * ВАЖНО про честность формулировок: правила здесь демонстрационные и
 * упрощённые. Это витрина механики, а не правовая проверка — о чём
 * прямо сказано на экране. Для государственного заказчика такая
 * оговорка обязательна: окончательное решение всегда остаётся за
 * уполномоченным органом, и сайт не должен намекать на обратное.
 */

type Verdict = "COMPLIANT" | "CONDITIONAL" | "NON-COMPLIANT";

type Check = {
  name: string;
  passed: boolean;
  /** Условно пройдена — требует дополнительных действий. */
  conditional?: boolean;
  note: string;
};

/* --- Параметры операции ------------------------------------------------- */

const ZONES = [
  { id: "uncontrolled", label: "Неконтролируемое пространство", risk: 0 },
  { id: "suburban", label: "Пригородная зона", risk: 1 },
  { id: "urban", label: "Городская застройка", risk: 2 },
  { id: "airport", label: "Приаэродромная территория", risk: 3 },
] as const;

const CRAFT = [
  { id: "light", label: "До 4 кг", weight: 0 },
  { id: "medium", label: "4—25 кг", weight: 1 },
  { id: "heavy", label: "Свыше 25 кг", weight: 2 },
] as const;

const TIME = [
  { id: "day", label: "Дневное время" },
  { id: "night", label: "Тёмное время суток" },
] as const;

export default function ComplianceDemo() {
  const [altitude, setAltitude] = useState(90);
  const [zone, setZone] = useState<(typeof ZONES)[number]["id"]>("suburban");
  const [craft, setCraft] = useState<(typeof CRAFT)[number]["id"]>("medium");
  const [time, setTime] = useState<(typeof TIME)[number]["id"]>("day");
  const [bvlos, setBvlos] = useState(false);

  /** Идёт ли «проверка» — короткая пауза, чтобы вердикт читался как результат. */
  const [checking, setChecking] = useState(false);
  const [runId, setRunId] = useState(0);

  const zoneData = ZONES.find((z) => z.id === zone)!;
  const craftData = CRAFT.find((c) => c.id === craft)!;

  /* --- Набор проверок ---------------------------------------------------
     Каждая проверка сопоставляет параметр операции с условным
     требованием и возвращает результат с человеческим объяснением. */
  const checks = useMemo<Check[]>(() => {
    const list: Check[] = [];

    // Высота
    if (altitude > 120) {
      list.push({
        name: "Высота полёта",
        passed: false,
        note: `${altitude} м — превышение типового предела 120 м`,
      });
    } else {
      list.push({
        name: "Высота полёта",
        passed: true,
        note: `${altitude} м — в пределах типового ограничения`,
      });
    }

    // Зона
    if (zoneData.risk >= 3) {
      list.push({
        name: "Воздушное пространство",
        passed: false,
        note: "Приаэродромная территория — требуется отдельное согласование",
      });
    } else if (zoneData.risk === 2) {
      list.push({
        name: "Воздушное пространство",
        passed: true,
        conditional: true,
        note: "Городская застройка — нужна оценка риска над людьми",
      });
    } else {
      list.push({
        name: "Воздушное пространство",
        passed: true,
        note: `${zoneData.label} — ограничений не выявлено`,
      });
    }

    // Масса аппарата
    if (craftData.weight === 2) {
      list.push({
        name: "Категория БВС",
        passed: true,
        conditional: true,
        note: "Свыше 25 кг — требуется подтверждение допуска аппарата",
      });
    } else {
      list.push({
        name: "Категория БВС",
        passed: true,
        note: `${craftData.label} — стандартная категория`,
      });
    }

    // Время суток
    if (time === "night") {
      list.push({
        name: "Время выполнения",
        passed: true,
        conditional: true,
        note: "Тёмное время — необходимы огни и подтверждение подготовки",
      });
    } else {
      list.push({
        name: "Время выполнения",
        passed: true,
        note: "Дневное время — дополнительных условий нет",
      });
    }

    // Полёт за пределами визуальной видимости
    if (bvlos) {
      const ok = zoneData.risk <= 1;
      list.push({
        name: "Режим BVLOS",
        passed: ok,
        conditional: ok,
        note: ok
          ? "За пределами видимости — нужны средства наблюдения и связи"
          : "BVLOS над плотной застройкой — вне типовых условий",
      });
    }

    // Профиль оператора — в демонстрации всегда подтверждён
    list.push({
      name: "Оператор и документы",
      passed: true,
      note: "Цифровой профиль подтверждён, страхование действует",
    });

    return list;
  }, [altitude, zoneData, craftData, time, bvlos]);

  const verdict: Verdict = useMemo(() => {
    if (checks.some((c) => !c.passed)) return "NON-COMPLIANT";
    if (checks.some((c) => c.conditional)) return "CONDITIONAL";
    return "COMPLIANT";
  }, [checks]);

  const verdictStyle = {
    COMPLIANT: {
      icon: ShieldCheck,
      color: "text-signal-ok",
      border: "border-signal-ok/45",
      bg: "bg-signal-ok/8",
      title: "Операция соответствует заданным условиям",
    },
    CONDITIONAL: {
      icon: TriangleAlert,
      color: "text-signal-warn",
      border: "border-signal-warn/45",
      bg: "bg-signal-warn/8",
      title: "Необходимо выполнить дополнительные условия",
    },
    "NON-COMPLIANT": {
      icon: ShieldX,
      color: "text-signal-alert",
      border: "border-signal-alert/45",
      bg: "bg-signal-alert/8",
      title: "Операция не соответствует установленным требованиям",
    },
  }[verdict];

  const VerdictIcon = verdictStyle.icon;

  /** Любое изменение параметра перезапускает проверку. */
  const rerun = () => {
    setChecking(true);
    setRunId((n) => n + 1);
    window.setTimeout(() => setChecking(false), 620);
  };

  const field =
    "w-full border border-line bg-surface px-3 py-2.5 text-sm text-ink transition-colors hover:border-line-strong focus:border-accent focus:outline-none";

  return (
    <div className="grid gap-px border border-line bg-line lg:grid-cols-2">
      {/* ================= Параметры операции ================= */}
      <div className="bg-surface p-6 lg:p-8">
        <p className="hud-label">ПАРАМЕТРЫ ОПЕРАЦИИ</p>
        <h3 className="mt-4 text-xl font-medium tracking-tight text-ink">
          Заявка на выполнение полёта
        </h3>

        <div className="mt-7 flex flex-col gap-6">
          {/* Высота */}
          <div>
            <div className="flex items-baseline justify-between">
              <label
                htmlFor="altitude"
                className="hud-label text-ink-muted"
              >
                Высота полёта
              </label>
              <span
                className={`font-mono text-sm tabular-nums ${
                  altitude > 120 ? "text-signal-alert" : "text-accent"
                }`}
              >
                {altitude} м
              </span>
            </div>
            <input
              id="altitude"
              type="range"
              min={10}
              max={200}
              step={5}
              value={altitude}
              onChange={(e) => {
                setAltitude(Number(e.target.value));
                rerun();
              }}
              className="mt-3 w-full accent-[var(--color-accent)]"
            />
            <div className="mt-1.5 flex justify-between font-mono text-[0.5625rem] tracking-wider text-ink-faint">
              <span>10 м</span>
              <span className="text-signal-warn">предел 120 м</span>
              <span>200 м</span>
            </div>
          </div>

          {/* Зона */}
          <div>
            <label htmlFor="zone" className="hud-label text-ink-muted">
              Воздушное пространство
            </label>
            <select
              id="zone"
              value={zone}
              onChange={(e) => {
                setZone(e.target.value as typeof zone);
                rerun();
              }}
              className={`${field} mt-2.5`}
            >
              {ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Категория */}
            <div>
              <label htmlFor="craft" className="hud-label text-ink-muted">
                Категория БВС
              </label>
              <select
                id="craft"
                value={craft}
                onChange={(e) => {
                  setCraft(e.target.value as typeof craft);
                  rerun();
                }}
                className={`${field} mt-2.5`}
              >
                {CRAFT.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Время */}
            <div>
              <label htmlFor="time" className="hud-label text-ink-muted">
                Время выполнения
              </label>
              <select
                id="time"
                value={time}
                onChange={(e) => {
                  setTime(e.target.value as typeof time);
                  rerun();
                }}
                className={`${field} mt-2.5`}
              >
                {TIME.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* BVLOS */}
          <label className="flex cursor-pointer items-start gap-3 border border-line bg-abyss p-4 transition-colors hover:border-line-strong">
            <input
              type="checkbox"
              checked={bvlos}
              onChange={(e) => {
                setBvlos(e.target.checked);
                rerun();
              }}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
            />
            <span>
              <span className="block text-sm text-ink">
                Полёт за пределами визуальной видимости
              </span>
              <span className="mt-1 block font-mono text-[0.625rem] tracking-wider text-ink-faint uppercase">
                BVLOS
              </span>
            </span>
          </label>
        </div>
      </div>

      {/* ================= Результат проверки ================= */}
      <div className="bg-surface p-6 lg:p-8">
        <div className="flex items-center justify-between gap-4">
          <p className="hud-label">РЕЗУЛЬТАТ ПРОВЕРКИ</p>
          {checking && (
            <span className="flex items-center gap-2 font-mono text-[0.625rem] tracking-[0.14em] text-accent">
              <Loader2 className="h-3 w-3 animate-spin" />
              АНАЛИЗ
            </span>
          )}
        </div>

        {/* Вердикт */}
        <div
          key={runId}
          className={`panel-corners mt-4 border ${verdictStyle.border} ${verdictStyle.bg} p-5 transition-all duration-500 ${
            checking ? "opacity-40" : "opacity-100"
          }`}
        >
          <div className="flex items-start gap-4">
            <VerdictIcon
              className={`mt-0.5 h-7 w-7 shrink-0 ${verdictStyle.color}`}
              strokeWidth={1.4}
              aria-hidden="true"
            />
            <div>
              <p
                className={`font-mono text-sm tracking-[0.18em] ${verdictStyle.color}`}
              >
                {verdict}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink">
                {verdictStyle.title}
              </p>
            </div>
          </div>
        </div>

        {/* Разбор по пунктам */}
        <ul
          className={`mt-6 divide-y divide-line border-y border-line transition-opacity duration-300 ${
            checking ? "opacity-40" : "opacity-100"
          }`}
        >
          {checks.map((check) => {
            const tone = !check.passed
              ? "bg-signal-alert"
              : check.conditional
                ? "bg-signal-warn"
                : "bg-signal-ok";

            return (
              <li key={check.name} className="flex items-start gap-3.5 py-3">
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 ${tone}`}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-[0.8125rem] text-ink">{check.name}</p>
                  <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-ink-muted">
                    {check.note}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Обязательная оговорка */}
        <p className="mt-6 border-l-2 border-line-strong pl-4 text-[0.75rem] leading-relaxed text-ink-faint">
          Демонстрация механики проверки на упрощённом наборе правил. Не
          является правовой оценкой: окончательное решение по операции
          относится к полномочиям уполномоченного государственного органа.
        </p>
      </div>
    </div>
  );
}
