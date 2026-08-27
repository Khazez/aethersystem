import {
  Zap,
  Fuel,
  Mountain,
  Wheat,
  Truck,
  Building2,
  Waypoints,
  Siren,
} from "lucide-react";

import { Section, SectionHeading } from "@/components/Section";
import Reveal from "@/components/Reveal";
import type { Dictionary } from "@/i18n";

const icons = {
  energy: Zap,
  oilgas: Fuel,
  mining: Mountain,
  agro: Wheat,
  logistics: Truck,
  construction: Building2,
  infrastructure: Waypoints,
  emergency: Siren,
} as const;

/**
 * Секция «Отрасли» — где применяется платформа.
 * Используется и на главной, и на странице «Решения».
 */
export default function Industries({
  t,
  index,
  compact = false,
}: {
  t: Dictionary;
  index?: string;
  /** Компактный режим — без заголовка секции (для вложенного использования). */
  compact?: boolean;
}) {
  const s = t.home.industries;

  const list = (
    <ul className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
      {s.items.map((item, i) => {
        const Icon = icons[item.key as keyof typeof icons];

        return (
          <Reveal key={item.key} as="li" delay={(i % 4) * 60} className="h-full">
            <div className="group flex h-full flex-col bg-surface p-7 transition-colors duration-300 hover:bg-surface-2">
              <Icon
                className="h-6 w-6 text-accent/70 transition-colors duration-300 group-hover:text-accent"
                strokeWidth={1.4}
                aria-hidden="true"
              />
              <h3 className="mt-6 text-base font-medium text-ink">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                {item.text}
              </p>
            </div>
          </Reveal>
        );
      })}
    </ul>
  );

  if (compact) return list;

  return (
    <Section>
      <div className="container-page py-24 lg:py-32">
        <SectionHeading
          index={index}
          eyebrow={s.eyebrow}
          title={s.title}
          subtitle={s.subtitle}
        />
        <div className="mt-16">{list}</div>
      </div>
    </Section>
  );
}
