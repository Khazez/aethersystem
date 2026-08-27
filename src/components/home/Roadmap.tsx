import { Section, SectionHeading } from "@/components/Section";
import Reveal from "@/components/Reveal";
import type { Dictionary } from "@/i18n";

/**
 * Секция «Этапы развития рынка» — шесть стадий перехода к цифровой
 * экосистеме автономной авиации. Оформлена как временная шкала.
 */
export default function Roadmap({ t }: { t: Dictionary }) {
  const s = t.home.roadmap;

  return (
    <Section>
      <div className="container-page py-24 lg:py-32">
        <SectionHeading
          index="07"
          eyebrow={s.eyebrow}
          title={s.title}
          subtitle={s.subtitle}
        />

        <ol className="mt-16">
          {s.stages.map((stage, i) => (
            <Reveal key={stage.key} as="li" delay={i * 70} className="h-full">
              <div className="group relative grid gap-4 border-t border-line py-8 sm:grid-cols-[8rem_1fr] sm:gap-10 lg:grid-cols-[10rem_20rem_1fr] lg:py-10">
                {/* Номер этапа */}
                <div className="flex items-center gap-4">
                  <span className="font-mono text-2xl tracking-[0.1em] text-accent/80 lg:text-3xl">
                    {stage.key}
                  </span>
                  <span
                    aria-hidden="true"
                    className="hidden h-px flex-1 bg-line-strong transition-colors duration-500 group-hover:bg-accent/40 lg:block"
                  />
                </div>

                <h3 className="text-lg font-medium tracking-tight text-ink lg:text-xl">
                  {stage.title}
                </h3>

                <p className="text-sm leading-relaxed text-ink-muted lg:max-w-2xl lg:text-base">
                  {stage.text}
                </p>
              </div>
            </Reveal>
          ))}
          {/* Замыкающая линия шкалы */}
          <li aria-hidden="true" className="border-t border-line" />
        </ol>
      </div>
    </Section>
  );
}
