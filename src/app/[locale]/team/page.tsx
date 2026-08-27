import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import { Section, SectionHeading } from "@/components/Section";
import { href } from "@/lib/nav";
import { LEADERSHIP } from "@/lib/company";
import { alternates } from "@/lib/seo";
import { getDictionary } from "@/i18n";
import { isLocale, locales } from "@/i18n/config";

type Params = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return {
    title: t.nav.team,
    description: t.team.hero.subtitle,
    alternates: alternates(locale, "team"),
  };
}

/**
 * Страница команды.
 *
 * Показано руководство компании — данные получены от заказчика
 * 27.08.2026. Имена лежат в `lib/company.ts` (они одинаковы на всех
 * языках), должности — в словарях, привязанные к человеку по `id`.
 *
 * Фотографий заказчик не присылал, поэтому карточки текстовые. Это
 * осознанный выбор, а не недоделка: сетка с пустыми рамками под
 * портреты выглядит хуже, чем аккуратная типографика без них. Когда
 * фото появятся, в карточку добавляется портрет сверху — сетка уже
 * рассчитана на это.
 */
export default async function TeamPage({ params }: Params) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = getDictionary(locale);

  return (
    <>
      <PageHero
        eyebrow={t.team.hero.eyebrow}
        title={t.team.hero.title}
        lead={t.team.hero.subtitle}
      />

      <Section className="bg-abyss">
        <div className="container-page py-24 lg:py-32">
          <SectionHeading
            index="01"
            eyebrow={t.team.hero.eyebrow}
            title={t.team.leadershipTitle}
          />

          <ul className="mt-14 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {LEADERSHIP.map((person, i) => (
              <Reveal key={person.id} as="li" delay={i * 70} className="h-full">
                <div className="flex h-full flex-col bg-surface p-8">
                  {/* Номер вместо портрета: карточка не должна выглядеть
                      так, будто фотография не загрузилась. */}
                  <p className="font-mono text-[0.6875rem] tracking-[0.28em] text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </p>

                  <h3 className="mt-6 text-balance text-xl leading-snug font-medium tracking-tight text-ink">
                    {/* На английской версии — латиница: кириллическое
                        имя в англоязычном тексте читается как недоделка. */}
                    {locale === "en" ? person.nameLatin : person.name}
                  </h3>

                  {/* Распорка прижимает черту и должность к низу карточки.
                      Без неё они вставали сразу под именем, а имена
                      разной длины: «Бекмухамбетов Даулет Айдарканович»
                      переносится на две строки, остальные нет — и черты
                      в соседних карточках оказывались на разной высоте.
                      Отступ сверху задаёт минимальный зазор на случай
                      длинного имени. */}
                  <div className="mt-6 grow" aria-hidden="true" />

                  <div className="h-px w-12 bg-accent/50" />

                  <p className="mt-5 text-pretty text-sm leading-relaxed text-ink-muted">
                    {t.team.roles[person.id]}
                  </p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </Section>

      {/* --- Связаться --- */}
      <Section>
        <div className="container-page py-24 lg:py-32">
          <Reveal>
            <div className="panel-corners mx-auto max-w-2xl border border-line bg-surface p-10 text-center lg:p-14">
              <h2 className="text-2xl font-medium tracking-tight text-ink">
                {t.team.ctaTitle}
              </h2>

              <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-ink-muted lg:text-base">
                {t.team.ctaText}
              </p>

              <Link
                href={href(locale, "/contacts")}
                className="group mt-9 inline-flex min-h-11 items-center gap-2.5 border border-accent bg-accent/12 px-6 py-3.5 text-sm tracking-wide text-accent transition-colors hover:bg-accent/20"
              >
                {t.common.contactUs}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
