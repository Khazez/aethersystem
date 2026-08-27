import Link from "next/link";
import {
  Fingerprint,
  Database,
  Radar,
  ShieldCheck,
  Layers,
  Grid3x3,
  Crosshair,
  BrainCircuit,
  GitBranch,
  Boxes,
  Landmark,
  Store,
  ArrowRight,
} from "lucide-react";

import { Section, SectionHeading } from "@/components/Section";
import Reveal from "@/components/Reveal";
import { href } from "@/lib/nav";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";

/**
 * Иконки для модулей платформы. Ключ совпадает с ключом в словаре,
 * поэтому иконки не зависят от языка и порядка элементов.
 * Стиль line-иконок выдержан единый — набор lucide.
 */
const icons = {
  identity: Fingerprint,
  registry: Database,
  utm: Radar,
  compliance: ShieldCheck,
  airspace: Layers,
  grid: Grid3x3,
  conformance: Crosshair,
  ai: BrainCircuit,
  lifecycle: GitBranch,
  fleet: Boxes,
  government: Landmark,
  marketplace: Store,
} as const;

export default function Modules({
  locale,
  t,
}: {
  locale: Locale;
  t: Dictionary;
}) {
  const s = t.home.modules;

  return (
    <Section id="platform">
      <div className="container-page py-24 lg:py-32">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            index="04"
            eyebrow={s.eyebrow}
            title={s.title}
            subtitle={s.subtitle}
          />

          <Reveal delay={160} className="h-full">
            <Link
              href={href(locale, "/product")}
              className="group inline-flex shrink-0 items-center gap-2.5 border border-line px-5 py-3 text-sm text-ink-muted transition-colors hover:border-accent/50 hover:text-accent"
            >
              {s.cta}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>

        <ul className="mt-16 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {s.items.map((item, i) => {
            const Icon = icons[item.key as keyof typeof icons];

            return (
              <Reveal key={item.key} as="li" delay={(i % 3) * 60} className="h-full">
                <div className="group flex h-full flex-col bg-surface p-7 transition-colors duration-300 hover:bg-surface-2">
                  <div className="flex items-start justify-between gap-4">
                    <Icon
                      className="h-6 w-6 shrink-0 text-accent/70 transition-colors duration-300 group-hover:text-accent"
                      strokeWidth={1.4}
                      aria-hidden="true"
                    />
                    <span className="font-mono text-[0.625rem] tabular-nums text-ink-faint">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <h3 className="mt-6 text-base font-medium tracking-tight text-ink">
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
      </div>
    </Section>
  );
}
