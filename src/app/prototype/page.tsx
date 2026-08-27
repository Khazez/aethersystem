import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";

import ScrollStage, { type StageChapter } from "@/components/scene/ScrollStage";
import PrototypeHero from "./PrototypeHero";
import ComplianceDemo from "@/components/scene/ComplianceDemo";

/**
 * ПРОТОТИП главного экрана — отдельная страница, чтобы сравнить
 * с текущим вариантом, ничего в нём не сломав.
 *
 * Адрес: /prototype
 *
 * Здесь только русский язык: цель — оценить подачу и анимацию,
 * а не готовить раздел к публикации. Если вариант принимается,
 * тексты переезжают в словари и получают переводы.
 */

export const metadata: Metadata = {
  title: "Прототип — Aether System & Co.",
  robots: { index: false, follow: false },
};

/**
 * Четыре фазы: путь от разрозненности к единой инфраструктуре.
 * Это главный тезис компании, рассказанный движением сцены.
 */
const chapters: StageChapter[] = [
  {
    index: "01",
    label: "ИСХОДНОЕ СОСТОЯНИЕ",
    title: "Данные существуют. Связи — нет.",
    text: "В одной операции беспилотного воздушного судна участвуют владелец, оператор, производитель, страховая компания, государственный орган, таможня и ещё десяток сторон. Каждая ведёт свои записи в своей системе.",
  },
  {
    index: "02",
    label: "ЦИФРОВАЯ ИДЕНТИЧНОСТЬ",
    title: "Каждый аппарат обретает цифровой профиль.",
    text: "Идентификатор, производитель, владелец, оператор, документы, разрешения, история эксплуатации и обслуживания. Разрозненные записи собираются в один цифровой объект.",
  },
  {
    index: "03",
    label: "AETHER GRID",
    title: "Воздушное пространство становится структурой.",
    text: "Пространство представляется цифровой сеткой: каждая ячейка несёт координаты, высотный диапазон, статус, ограничения, текущую загрузку и уровень риска. Это основа для машинной обработки.",
  },
  {
    index: "04",
    label: "ЕДИНЫЙ КОНТУР",
    title: "Операции проходят по согласованным маршрутам.",
    text: "Проверка требований, проверка пространства, разрешение, полёт, мониторинг, подтверждение результата, расчёт, техническая история — связанная цепочка вместо разрозненных согласований.",
  },
];

export default function PrototypePage() {
  return (
    <div className="bg-void">
      {/* --- Служебная шапка прототипа --- */}
      <div className="fixed top-0 right-0 left-0 z-50 border-b border-line bg-void/85 backdrop-blur-xl">
        <div className="container-page flex h-14 items-center justify-between gap-4">
          <span className="hud-label text-accent">
            ПРОТОТИП · ВАРИАНТ ГЛАВНОГО ЭКРАНА
          </span>
          <Link
            href="/ru"
            className="group inline-flex items-center gap-2 border border-line px-3.5 py-1.5 text-[0.8125rem] text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            К текущей версии
          </Link>
        </div>
      </div>

      <PrototypeHero />

      <ScrollStage chapters={chapters} scrollHint="ПРОКРУТИТЕ ВНИЗ" />

      {/* --- Живая проверка соответствия --- */}
      <section className="border-t border-line bg-abyss">
        <div className="container-page py-24 lg:py-32">
          <div className="max-w-3xl">
            <p className="hud-label flex items-center gap-3">
              <span className="text-accent tabular-nums">05</span>
              <span aria-hidden="true" className="h-px w-8 bg-accent/50" />
              REGULATORY COMPLIANCE ENGINE
            </p>
            <h2 className="mt-6 text-balance text-3xl leading-tight font-medium tracking-tight text-ink lg:text-4xl">
              Проверьте операцию сами
            </h2>
            <p className="mt-5 text-base leading-relaxed text-ink-muted lg:text-lg">
              Модуль нормативного соответствия переводит применимые правила в
              структурированные цифровые проверки. Задайте параметры полёта —
              и увидите, как формируется результат.
            </p>
          </div>

          <div className="mt-12">
            <ComplianceDemo />
          </div>
        </div>
      </section>

      {/* --- Что дальше --- */}
      <section className="border-t border-line">
        <div className="container-page py-24 lg:py-32">
          <div className="max-w-2xl">
            <p className="hud-label">КОНЕЦ ПРОТОТИПА</p>
            <h2 className="mt-6 text-3xl font-medium tracking-tight text-ink lg:text-4xl">
              Дальше идёт содержательная часть сайта
            </h2>
            <p className="mt-5 text-base leading-relaxed text-ink-muted lg:text-lg">
              Здесь прототип заканчивается. Если подача принимается — этот
              приём распространяется на остальные разделы: модули платформы,
              отрасли, дорожная карта.
            </p>

            <Link
              href="/ru"
              className="group mt-9 inline-flex items-center gap-2.5 border border-accent bg-accent/12 px-6 py-3.5 text-sm tracking-wide text-accent transition-colors hover:bg-accent/20"
            >
              Сравнить с текущей версией
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
