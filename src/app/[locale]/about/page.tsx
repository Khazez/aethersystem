import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Network, Link2, Landmark, Lock } from "lucide-react";

import PageHero from "@/components/PageHero";
import CallToAction from "@/components/CallToAction";
import Reveal from "@/components/Reveal";
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
    title: t.nav.about,
    description: t.about.philosophy.text,
    alternates: alternates(locale, "about"),
  };
}

const valueIcons = {
  augment: Network,
  connect: Link2,
  authority: Landmark,
  security: Lock,
} as const;

export default async function AboutPage({ params }: Params) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = getDictionary(locale);
  const a = t.about;

  return (
    <>
      <PageHero
        eyebrow={a.hero.eyebrow}
        title={a.hero.title}
        subtitle={a.hero.subtitle}
        /* спокойный мотив для страницы о компании */
        scene="terrain"
      />

      {/* --- Кто мы --- */}
      <Section>
        <div className="container-page py-24 lg:py-32">
          <div className="grid gap-12 lg:grid-cols-[22rem_1fr] lg:gap-20">
            <Reveal>
              <h2 className="text-2xl font-medium tracking-tight text-ink lg:sticky lg:top-32 lg:text-3xl">
                {a.intro.title}
              </h2>
            </Reveal>

            <div className="flex flex-col gap-6">
              {a.intro.paragraphs.map((p, i) => (
                <Reveal key={i} delay={i * 80} className="h-full">
                  <p
                    className={`text-pretty leading-relaxed ${
                      i === 0
                        ? "text-lg text-ink lg:text-xl"
                        : "text-base text-ink-muted"
                    }`}
                  >
                    {p}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* --- Главная идея --- */}
      <Section className="bg-abyss">
        <div className="container-page py-24 lg:py-32">
          <SectionHeading
            index="01"
            eyebrow={a.philosophy.eyebrow}
            title={a.philosophy.title}
          />
          <Reveal delay={120} className="h-full">
            <p className="mt-10 max-w-4xl border-l-2 border-accent bg-accent/5 py-5 pl-6 text-base leading-relaxed text-ink lg:pl-8 lg:text-lg">
              {a.philosophy.text}
            </p>
          </Reveal>
        </div>
      </Section>

      {/* --- Принципы --- */}
      <Section>
        <div className="container-page py-24 lg:py-32">
          <SectionHeading
            index="02"
            eyebrow={a.values.eyebrow}
            title={a.values.title}
          />

          <ul className="mt-16 grid gap-px border border-line bg-line sm:grid-cols-2">
            {a.values.items.map((item, i) => {
              const Icon = valueIcons[item.key as keyof typeof valueIcons];
              return (
                <Reveal key={item.key} as="li" delay={(i % 2) * 80} className="h-full">
                  <div className="group flex h-full flex-col bg-surface p-8 transition-colors duration-300 hover:bg-surface-2 lg:p-10">
                    <Icon
                      className="h-7 w-7 text-accent/70 transition-colors duration-300 group-hover:text-accent"
                      strokeWidth={1.3}
                      aria-hidden="true"
                    />
                    <h3 className="mt-7 text-lg font-medium tracking-tight text-ink">
                      {item.title}
                    </h3>
                    <p className="mt-4 text-sm leading-relaxed text-ink-muted lg:text-base">
                      {item.text}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </ul>
        </div>
      </Section>

      {/* --- Стратегическая цель --- */}
      <Section className="bg-abyss">
        <div className="container-page py-24 lg:py-32">
          <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
            <div>
              <SectionHeading
                index="03"
                eyebrow={a.goal.eyebrow}
                title={a.goal.title}
              />
              <Reveal delay={120} className="h-full">
                <p className="mt-8 text-base leading-relaxed text-ink-muted lg:text-lg">
                  {a.goal.text}
                </p>
              </Reveal>
            </div>

            <div>
              <SectionHeading
                index="04"
                eyebrow={a.vision.eyebrow}
                title={a.vision.title}
              />
              <div className="mt-8 flex flex-col gap-5">
                {a.vision.paragraphs.map((p, i) => (
                  <Reveal key={i} delay={120 + i * 80} className="h-full">
                    <p className="text-base leading-relaxed text-ink-muted lg:text-lg">
                      {p}
                    </p>
                  </Reveal>
                ))}
              </div>
            </div>
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
