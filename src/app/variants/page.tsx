import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Варианты первого экрана — Aether",
  robots: { index: false, follow: false },
};

/**
 * Витрина вариантов. Четыре принципиально разных подхода к первому
 * экрану — не оттенки одного, а разные способы подачи. Задача: выбрать
 * направление, а не доводить одно решение вслепую.
 */
const variants = [
  {
    id: "a",
    name: "ПРОЛЁТ",
    title: "Полёт сквозь пространство",
    text: "Камера непрерывно летит вперёд, воздушное пространство проносится мимо. Максимум скорости и глубины. Текст проступает прямо в потоке.",
    motion: "Непрерывное движение вперёд, ускорение при прокрутке",
  },
  {
    id: "b",
    name: "ЖИВОЙ ЭФИР",
    title: "Система работает прямо сейчас",
    text: "Диспетчерский экран в реальном времени: борта идут по маршрутам, счётчики тикают, приходят события, вспыхивают тревоги. Сайт выглядит как работающий продукт.",
    motion: "Постоянное движение данных, события каждые пару секунд",
  },
  {
    id: "c",
    name: "РАЗБОР",
    title: "Аппарат в разрезе",
    text: "Беспилотник в центре экрана: детали разлетаются и собираются обратно, к каждой выезжает подпись. Кинематографичный показ изделия.",
    motion: "Разлёт деталей, вращение, выезжающие выноски",
  },
  {
    id: "d",
    name: "КИНЕТИКА",
    title: "Слова в движении",
    text: "Главную работу делает типографика: крупный текст живёт, перестраивается и переписывается на глазах. Графика уходит на второй план.",
    motion: "Текст постоянно меняется и пересобирается",
  },
];

export default function VariantsIndex() {
  return (
    <div className="min-h-svh bg-void">
      <div className="container-page py-20 lg:py-28">
        <p className="hud-label text-accent">ВЫБОР НАПРАВЛЕНИЯ</p>
        <h1 className="mt-6 text-4xl font-medium tracking-tight text-ink lg:text-5xl">
          Четыре первых экрана
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-muted lg:text-lg">
          Разные способы подачи, а не оттенки одного. Откройте каждый,
          посмотрите на движение — и скажите, какое направление ближе.
          Дальше углубляем выбранное.
        </p>

        <ul className="mt-14 grid gap-px border border-line bg-line sm:grid-cols-2">
          {variants.map((v) => (
            <li key={v.id}>
              <Link
                href={`/variants/${v.id}`}
                className="group flex h-full flex-col bg-surface p-8 transition-colors duration-300 hover:bg-surface-2 lg:p-10"
              >
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-2xl text-accent/70">
                    {v.id.toUpperCase()}
                  </span>
                  <span className="hud-label">{v.name}</span>
                </div>

                <h2 className="mt-6 text-2xl font-medium tracking-tight text-ink">
                  {v.title}
                </h2>

                <p className="mt-4 text-sm leading-relaxed text-ink-muted lg:text-base">
                  {v.text}
                </p>

                <p className="mt-6 border-l-2 border-accent/40 pl-4 font-mono text-[0.6875rem] leading-relaxed tracking-wide text-accent/80 uppercase">
                  {v.motion}
                </p>

                <span className="mt-auto flex items-center gap-2.5 pt-8 text-sm text-accent">
                  Открыть
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
