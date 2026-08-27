import type { Metadata } from "next";
import { notFound } from "next/navigation";

import PageHero from "@/components/PageHero";
import CallToAction from "@/components/CallToAction";
import Reveal from "@/components/Reveal";
import Industries from "@/components/home/Industries";
import { Section, SectionHeading } from "@/components/Section";
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
    title: t.nav.solutions,
    description: t.solutions.hero.subtitle,
    alternates: alternates(locale, "solutions"),
  };
}

export default async function SolutionsPage({ params }: Params) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = getDictionary(locale);
  const s = t.solutions;

  return (
    <>
      <PageHero
        eyebrow={s.hero.eyebrow}
        title={s.hero.title}
        lead={s.hero.subtitle}
      />

      {/* --- Категории пользователей --- */}
      <Section className="bg-abyss">
        <div className="container-page py-24 lg:py-32">
          <SectionHeading
            index="01"
            eyebrow={s.hero.eyebrow}
            title={s.usersTitle}
          />

          <ul className="mt-16 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {s.users.map((user, i) => (
              <Reveal key={user.key} as="li" delay={(i % 3) * 60} className="h-full">
                <div className="group flex h-full flex-col bg-surface p-7 transition-colors duration-300 hover:bg-surface-2">
                  <span className="font-mono text-[0.625rem] tabular-nums text-accent/50">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-5 text-base font-medium tracking-tight text-ink">
                    {user.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                    {user.text}
                  </p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </Section>

      {/* --- Отрасли --- */}
      <Section>
        <div className="container-page py-24 lg:py-32">
          <SectionHeading
            index="02"
            eyebrow={t.home.industries.eyebrow}
            title={s.industriesTitle}
            subtitle={t.home.industries.subtitle}
          />
          <div className="mt-16">
            <Industries t={t} compact />
          </div>
        </div>
      </Section>

      {/* --- Единая цифровая цепочка --- */}
      <Section className="bg-abyss">
        <div className="container-page py-24 lg:py-32">
          <SectionHeading
            index="03"
            eyebrow={s.hero.eyebrow}
            title={s.chainTitle}
            subtitle={s.chainSubtitle}
          />

          <ol className="mt-16 grid gap-px border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
            {s.chain.map((step, i) => (
              <Reveal key={step} as="li" delay={(i % 5) * 45} className="h-full">
                <div className="group relative flex h-full flex-col justify-between gap-5 bg-surface p-5 transition-colors duration-300 hover:bg-surface-2">
                  <span className="font-mono text-[0.625rem] tabular-nums text-accent/60">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[0.8125rem] leading-snug text-ink-muted transition-colors group-hover:text-ink">
                    {step}
                  </span>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </Section>

      {/* --- Автономные операции --- */}
      <Section>
        <div className="container-page py-24 lg:py-32">
          <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
            <SectionHeading
              index="04"
              eyebrow={s.hero.eyebrow}
              title={s.autonomyTitle}
              subtitle={s.autonomySubtitle}
            />

            <ul className="flex flex-col divide-y divide-line border-y border-line">
              {s.autonomy.map((item, i) => (
                <Reveal key={item} as="li" delay={i * 45} className="h-full">
                  <div className="flex items-center gap-4 py-4">
                    <span className="font-mono text-[0.625rem] tabular-nums text-accent/60">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm text-ink-muted">{item}</span>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <CallToAction
        locale={locale}
        title={t.home.cta.title}
        subtitle={t.home.cta.subtitle}
        primaryLabel={t.home.cta.primary}
      />
    </>
  );
}
