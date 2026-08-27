import { Section, SectionHeading } from "@/components/Section";
import Reveal from "@/components/Reveal";
import type { Dictionary } from "@/i18n";

/**
 * Секция «Проблема»: почему разрозненные системы не справляются
 * с ростом числа беспилотных операций.
 */
export default function Problem({ t }: { t: Dictionary }) {
  const s = t.home.problem;

  return (
    <Section id="problem">
      <div className="container-page py-24 lg:py-32">
        <SectionHeading index="02" eyebrow={s.eyebrow} title={s.title} />

        <div className="mt-14 grid gap-14 lg:grid-cols-2 lg:gap-16">
          {/* --- Левая колонка: описание --- */}
          <div>
            <Reveal>
              <p className="text-pretty text-base leading-relaxed text-ink-muted lg:text-lg">
                {s.lead}
              </p>
            </Reveal>

            <Reveal delay={80}>
              <p className="mt-6 text-base leading-relaxed text-ink">
                {s.body}
              </p>
            </Reveal>

            {/* Вывод — выделен вертикальной линией акцентного цвета */}
            <Reveal delay={140}>
              <p className="mt-10 border-l-2 border-accent bg-accent/5 py-4 pl-6 text-base leading-relaxed text-ink">
                {s.solution}
              </p>
            </Reveal>
          </div>

          {/* --- Правая колонка: последствия --- */}
          <div>
            <Reveal>
              <h3 className="hud-label">{s.consequencesTitle}</h3>
            </Reveal>

            <ul className="mt-6 divide-y divide-line border-y border-line">
              {s.consequences.map((item, i) => (
                <Reveal key={item} as="li" delay={i * 45}>
                  <div className="flex items-baseline gap-4 py-3.5">
                    <span className="font-mono text-[0.625rem] tabular-nums text-signal-alert/70">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm leading-relaxed text-ink-muted">
                      {item}
                    </span>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>

        {/* --- Полоса показателей ---
            h-full здесь нужен и оставлен: обёртка появления сама
            является ячейкой сетки, и без него карточки разной высоты
            не выравниваются по нижней границе.

            А вот внутри колонок выше его быть НЕ должно: там родитель
            уже имеет заданную высоту, и каждый абзац растягивался на
            всю колонку — три абзаца давали тройную высоту и наезжали
            на этот блок. */}
        <dl className="mt-20 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {s.stats.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 70} className="h-full">
              <div className="bg-surface px-7 py-9">
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="block text-4xl font-medium tracking-tight text-accent tabular-nums lg:text-5xl">
                    {stat.value}
                  </span>
                  <span className="mt-3 block text-sm leading-snug text-ink-muted">
                    {stat.label}
                  </span>
                </dd>
              </div>
            </Reveal>
          ))}
        </dl>
      </div>
    </Section>
  );
}
