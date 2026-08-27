import type { ReactNode } from "react";
import Reveal from "./Reveal";

/**
 * Строительные блоки страниц. Все секции сайта собираются из них —
 * это гарантирует одинаковые отступы, размеры заголовков и ритм.
 */

export function Section({
  children,
  id,
  className = "",
  bordered = true,
}: {
  children: ReactNode;
  id?: string;
  className?: string;
  /** Тонкая линия сверху, отделяющая секцию от предыдущей. */
  bordered?: boolean;
}) {
  return (
    <section
      id={id}
      className={`relative ${bordered ? "border-t border-line" : ""} ${className}`}
    >
      {children}
    </section>
  );
}

/**
 * Заголовок секции: мелкая моноширинная метка сверху, крупный заголовок,
 * при необходимости — вводный абзац.
 */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
  index,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  /** Порядковый номер секции, например "01" — усиливает техническую подачу. */
  index?: string;
}) {
  const isCenter = align === "center";

  return (
    <header
      className={`max-w-3xl ${isCenter ? "mx-auto text-center" : ""}`}
    >
      {eyebrow && (
        <Reveal>
          <p
            className={`hud-label flex items-center gap-3 ${
              isCenter ? "justify-center" : ""
            }`}
          >
            {index && (
              <span className="text-accent/70 tabular-nums">{index}</span>
            )}
            <span className="h-px w-6 bg-line-strong" aria-hidden="true" />
            {eyebrow}
          </p>
        </Reveal>
      )}

      <Reveal delay={60}>
        <h2 className="mt-5 text-balance text-3xl leading-[1.15] font-medium tracking-tight text-ink sm:text-4xl lg:text-[2.75rem]">
          {title}
        </h2>
      </Reveal>

      {subtitle && (
        <Reveal delay={120}>
          <p className="mt-5 text-pretty text-base leading-relaxed text-ink-muted lg:text-lg">
            {subtitle}
          </p>
        </Reveal>
      )}
    </header>
  );
}

/**
 * Карточка-панель в приборной эстетике: тёмная поверхность, тонкая
 * граница, при наведении — подсветка границы фирменным цветом.
 */
export function Panel({
  children,
  className = "",
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  /** Реагировать на наведение курсора. */
  interactive?: boolean;
}) {
  return (
    <div
      className={`relative border border-line bg-surface ${
        interactive
          ? "transition-colors duration-300 hover:border-line-strong hover:bg-surface-2"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
