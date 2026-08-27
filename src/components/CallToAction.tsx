import Link from "next/link";
import { ArrowRight } from "lucide-react";

import AirspaceNetwork from "./AirspaceNetwork";
import Reveal from "./Reveal";
import { href } from "@/lib/nav";
import type { Locale } from "@/i18n/config";

/**
 * Завершающий блок-призыв. Используется в конце большинства страниц,
 * поэтому вынесен в общий компонент, а тексты передаются снаружи.
 */
export default function CallToAction({
  locale,
  title,
  subtitle,
  primaryLabel,
}: {
  locale: Locale;
  title: string;
  subtitle: string;
  primaryLabel: string;
}) {
  return (
    <section className="relative isolate overflow-hidden border-t border-line">
      <div className="absolute inset-0 -z-10">
        {/* Сеть узлов приглушена, а градиент сделан полупрозрачным:
            на главной за этим блоком садится аппарат, и сплошной фон
            скрывал бы посадку целиком. */}
        <div className="absolute inset-0 opacity-15">
          <AirspaceNetwork density={0.55} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-void/80 via-void/45 to-void/75" />
      </div>

      <div className="container-page py-24 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <h2 className="text-balance text-3xl leading-tight font-medium tracking-tight text-ink sm:text-4xl lg:text-[2.75rem]">
              {title}
            </h2>
          </Reveal>

          <Reveal delay={80}>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-ink-muted lg:text-lg">
              {subtitle}
            </p>
          </Reveal>

          <Reveal delay={160}>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href={href(locale, "/contacts")}
                className="group inline-flex items-center justify-center gap-2.5 border border-accent bg-accent/12 px-6 py-3.5 text-sm tracking-wide text-accent transition-colors hover:bg-accent/20"
              >
                {primaryLabel}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>

            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
