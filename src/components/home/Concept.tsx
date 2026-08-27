import { Section, SectionHeading } from "@/components/Section";
import Reveal from "@/components/Reveal";
import type { Dictionary } from "@/i18n";

/**
 * Секция «Ключевая концепция»: единая цифровая среда и цифровой
 * жизненный цикл одной операции — от аппарата до технической истории.
 */
export default function Concept({ t }: { t: Dictionary }) {
  const s = t.home.concept;

  return (
    <Section>
      <div className="container-page py-24 lg:py-32">
        <SectionHeading
          index="03"
          eyebrow={s.eyebrow}
          title={s.title}
          subtitle={s.subtitle}
        />

        {/* --- Восемь связанных сущностей --- */}
        <Reveal delay={100} className="h-full">
          <ul className="mt-14 flex flex-wrap items-center gap-x-3 gap-y-3">
            {s.chain.map((item, i) => (
              <li key={item} className="flex items-center gap-3">
                <span className="border border-line bg-surface px-4 py-2.5 font-mono text-[0.6875rem] tracking-[0.16em] text-ink uppercase">
                  {item}
                </span>
                {i < s.chain.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="font-mono text-accent/50"
                  >
                    +
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Reveal>

      </div>
    </Section>
  );
}
