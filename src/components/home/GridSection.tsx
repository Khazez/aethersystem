import { Section, SectionHeading } from "@/components/Section";
import Reveal from "@/components/Reveal";
import GridVisual from "@/components/GridVisual";
import type { Dictionary } from "@/i18n";

/**
 * Секция Aether Grid — воздушное пространство как цифровая сетка.
 */
export default function GridSection({ t }: { t: Dictionary }) {
  const s = t.home.grid;

  return (
    <Section>
      <div className="container-page py-24 lg:py-32">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center lg:gap-20">
          {/* --- Текст --- */}
          <div>
            <SectionHeading
              index="05"
              eyebrow={s.eyebrow}
              title={s.title}
              subtitle={s.subtitle}
            />

            <div className="mt-10">
              <Reveal>
                <h3 className="hud-label">{s.usedFor}</h3>
              </Reveal>

              <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {s.items.map((item, i) => (
                  <Reveal key={item} as="li" delay={i * 50}>
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="h-1 w-1 shrink-0 bg-accent"
                      />
                      <span className="text-sm text-ink-muted">{item}</span>
                    </div>
                  </Reveal>
                ))}
              </ul>
            </div>
          </div>

          {/* --- Визуализация сетки --- */}
          <Reveal delay={120}>
            <GridVisual
              legendFree={s.legendFree}
              legendLoaded={s.legendLoaded}
              legendRestricted={s.legendRestricted}
            />
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
