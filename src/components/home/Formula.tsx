import { Section, SectionHeading } from "@/components/Section";
import Reveal from "@/components/Reveal";
import type { Dictionary } from "@/i18n";

/**
 * Секция «Connect · Control · Comply · Operate · Analyze» —
 * пять функций, вокруг которых построена архитектура платформы.
 */
export default function Formula({ t }: { t: Dictionary }) {
  const s = t.home.formula;

  return (
    <Section>
      <div className="container-page py-24 lg:py-32">
        <SectionHeading
          index="01"
          eyebrow={s.eyebrow}
          title={s.title}
          subtitle={s.subtitle}
        />

        <ol className="mt-16 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
          {s.items.map((item, i) => (
            <Reveal key={item.key} as="li" delay={i * 70} className="h-full">
              <div className="group relative flex h-full flex-col bg-surface p-7 transition-colors duration-300 hover:bg-surface-2">
                {/* Номер шага */}
                <span className="font-mono text-[0.625rem] tracking-[0.24em] text-ink-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>

                {/* Английский ключ — фирменная терминология платформы */}
                <span className="mt-5 font-mono text-[0.6875rem] tracking-[0.22em] text-accent">
                  {item.key}
                </span>

                <h3 className="mt-3 text-lg font-medium text-ink">
                  {item.title}
                </h3>

                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                  {item.text}
                </p>

                {/* Индикатор снизу: заполняется при наведении */}
                <span
                  aria-hidden="true"
                  className="mt-auto block h-px w-full bg-line-strong pt-0"
                >
                  <span className="block h-px w-0 bg-accent transition-all duration-500 group-hover:w-full" />
                </span>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </Section>
  );
}
