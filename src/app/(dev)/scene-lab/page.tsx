import type { Metadata } from "next";

import FlightBackdrop from "@/components/home/FlightBackdrop";
import LabControls from '@/components/scene/LabControls';

/**
 * Стенд для отладки сцены полёта.
 *
 * ── Зачем ─────────────────────────────────────────────────────────
 *
 * На главной сцену окружает то, что мешает её отлаживать: содержание
 * поверх неё, полупрозрачные подложки и — главное — плавная прокрутка
 * Lenis. Она перехватывает мгновенные переходы, и снимок, снятый после
 * `scrollTo`, оказывается совсем не на той отметке, которую заказывали.
 * Из-за этого 4 сентября я трижды отчитался «работает», глядя на кадры
 * из другого места страницы.
 *
 * Здесь ничего этого нет: голая сцена, обычная прокрутка, а сверху —
 * показания. Отладив кадр тут, переношу на главную.
 *
 * ⚠️ Страница служебная, из поиска закрыта. На сайт она не ведёт
 * ниоткуда: попасть можно только по прямому адресу.
 */

export const metadata: Metadata = {
  title: "Стенд сцены",
  robots: { index: false, follow: false },
};

/** Сколько экранов прокрутки: столько же примерно на главной. */
const SCREENS = 12;

export default function SceneLabPage() {
  return (
    <>
      <FlightBackdrop />
      <LabControls/>

      {/* Отметки прокрутки, чтобы глазом видеть, где находишься. */}
      <div className="relative z-10">
        {Array.from({ length: SCREENS }, (_, i) => (
          <section
            key={i}
            className="flex h-screen items-start justify-end p-6"
          >
            <span className="font-mono text-[0.6875rem] tracking-[0.16em] text-ink-faint">
              {String(i + 1).padStart(2, "0")} / {SCREENS}
            </span>
          </section>
        ))}

        {/* Площадка посадки: сцена ищет именно этот признак. */}
        <section data-landing-stage className="h-screen" />
      </div>

    </>
  );
}
