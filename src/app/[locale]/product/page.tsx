import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Fingerprint,
  GitBranch,
  Radar,
  Route,
  Layers,
  ShieldCheck,
  BrainCircuit,
  FileCheck2,
  Activity,
  Crosshair,
  TriangleAlert,
  Landmark,
  Container,
  Boxes,
  Store,
  Plug,
  Smartphone,
  MonitorCog,
  Building2,
  ShoppingCart,
} from "lucide-react";

import PageHero from "@/components/PageHero";
import CallToAction from "@/components/CallToAction";
import Reveal from "@/components/Reveal";
import { Section, SectionHeading } from "@/components/Section";
import { ProductJsonLd } from "@/components/StructuredData";
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
    title: t.product.hero.title,
    description: t.product.hero.lead,
    alternates: alternates(locale, "product"),
  };
}

/** Иконка для каждого блока возможностей — по ключу из словаря. */
const capabilityIcons = {
  identity: Fingerprint,
  lifecycle: GitBranch,
  utm: Radar,
  flight: Route,
  airspace: Layers,
  compliance: ShieldCheck,
  ai: BrainCircuit,
  authorisation: FileCheck2,
  monitoring: Activity,
  conformance: Crosshair,
  conflict: TriangleAlert,
  government: Landmark,
  customs: Container,
  fleet: Boxes,
  market: Store,
  gateway: Plug,
} as const;

const interfaceIcons = {
  operator: Smartphone,
  control: MonitorCog,
  government: Landmark,
  business: Building2,
  market: ShoppingCart,
} as const;

export default async function ProductPage({ params }: Params) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = getDictionary(locale);
  const p = t.product;

  return (
    <>
      {/* Карточка продукта для поиска: запрос «Aether Nexus» должен
          приводить сюда. Ставится только здесь, не на каждой странице. */}
      <ProductJsonLd name={p.hero.title} description={p.hero.subtitle ?? p.hero.lead ?? ""} />

      <PageHero
        eyebrow={p.hero.eyebrow}
        title={p.hero.title}
        subtitle={p.hero.subtitle}
        lead={p.hero.lead}
        /* Aether Grid — это сам продукт */
        scene="grid"
      />

      {/* --- Aether Core: архитектурные слои --- */}
      <Section className="bg-abyss">
        <div className="container-page py-24 lg:py-32">
          <SectionHeading
            index="01"
            eyebrow={p.stack.eyebrow}
            title={p.stack.title}
            subtitle={p.stack.subtitle}
          />

          <div className="mt-14 border border-line bg-surface p-6 lg:p-10">
            {/* Ядро */}
            <Reveal className="h-full">
              <div className="panel-corners border border-accent/40 bg-accent/8 px-6 py-5 text-center">
                <p className="hud-label text-accent/70">CORE</p>
                <p className="mt-2 font-mono text-sm tracking-[0.2em] text-accent">
                  AETHER CORE
                </p>
              </div>
            </Reveal>

            {/* Соединительная линия */}
            <div
              aria-hidden="true"
              className="mx-auto h-8 w-px bg-line-strong"
            />

            {/* Слои */}
            <ul className="grid gap-px bg-line sm:grid-cols-3 lg:grid-cols-6">
              {p.stack.layers.map((layer, i) => (
                <Reveal key={layer} as="li" delay={i * 40} className="h-full">
                  <div className="group flex h-full items-center justify-center bg-surface-2 px-4 py-6 text-center transition-colors duration-300 hover:bg-surface">
                    <span className="font-mono text-[0.6875rem] leading-snug tracking-[0.14em] text-ink-muted uppercase transition-colors group-hover:text-accent">
                      {layer}
                    </span>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* --- Возможности платформы --- */}
      <Section>
        <div className="container-page py-24 lg:py-32">
          <SectionHeading
            index="02"
            eyebrow={p.hero.eyebrow}
            title={p.capabilitiesTitle}
          />

          <div className="mt-16 flex flex-col">
            {p.capabilities.map((cap, i) => {
              const Icon =
                capabilityIcons[cap.key as keyof typeof capabilityIcons];

              return (
                <Reveal key={cap.key} className="h-full">
                  <article className="group grid gap-8 border-t border-line py-10 lg:grid-cols-[3.5rem_22rem_1fr] lg:gap-10 lg:py-14">
                    {/* Номер и иконка */}
                    <div className="flex items-center gap-5 lg:flex-col lg:items-start lg:gap-6">
                      <span className="font-mono text-[0.6875rem] tabular-nums text-ink-faint">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <Icon
                        className="h-7 w-7 shrink-0 text-accent/70 transition-colors duration-300 group-hover:text-accent"
                        strokeWidth={1.3}
                        aria-hidden="true"
                      />
                    </div>

                    {/* Заголовок и описание */}
                    <div>
                      <h3 className="text-xl font-medium tracking-tight text-ink lg:text-2xl">
                        {cap.title}
                      </h3>
                      <p className="mt-4 text-sm leading-relaxed text-ink-muted lg:text-base">
                        {cap.text}
                      </p>
                    </div>

                    {/* Пункты */}
                    <ul className="flex flex-col gap-2.5 lg:pt-1">
                      {cap.points.map((point) => (
                        <li key={point} className="flex items-start gap-3.5">
                          <span
                            aria-hidden="true"
                            className="mt-2 h-1 w-1 shrink-0 bg-accent/60"
                          />
                          <span className="text-sm leading-relaxed text-ink-muted">
                            {point}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </article>
                </Reveal>
              );
            })}
            <div aria-hidden="true" className="border-t border-line" />
          </div>
        </div>
      </Section>

      {/* --- Интерфейсы --- */}
      <Section className="bg-abyss">
        <div className="container-page py-24 lg:py-32">
          <SectionHeading
            index="03"
            eyebrow={p.interfaces.eyebrow}
            title={p.interfaces.title}
          />

          <ul className="mt-16 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
            {p.interfaces.items.map((item, i) => {
              const Icon =
                interfaceIcons[item.key as keyof typeof interfaceIcons];
              return (
                <Reveal key={item.key} as="li" delay={i * 60} className="h-full">
                  <div className="group flex h-full flex-col bg-surface p-7 transition-colors duration-300 hover:bg-surface-2">
                    <Icon
                      className="h-6 w-6 text-accent/70 transition-colors duration-300 group-hover:text-accent"
                      strokeWidth={1.4}
                      aria-hidden="true"
                    />
                    <h3 className="mt-6 font-mono text-[0.75rem] tracking-[0.16em] text-ink">
                      {item.name}
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

      {/* --- Экосистема --- */}
      <Section>
        <div className="container-page py-24 lg:py-32">
          <SectionHeading
            index="04"
            eyebrow={p.ecosystem.eyebrow}
            title={p.ecosystem.title}
          />

          <ul className="mt-16 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
            {p.ecosystem.items.map((item, i) => (
              <Reveal key={item.key} as="li" delay={(i % 5) * 50} className="h-full">
                <div className="group flex h-full flex-col justify-between gap-6 bg-surface p-6 transition-colors duration-300 hover:bg-surface-2">
                  <span className="font-mono text-[0.625rem] tabular-nums text-accent/50">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-[0.9375rem] font-medium text-ink">
                      {item.name}
                    </h3>
                    <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-muted">
                      {item.text}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </Section>

      {/* --- Безопасность --- */}
      <Section className="bg-abyss">
        <div className="container-page py-24 lg:py-32">
          <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
            <div>
              <SectionHeading
                index="05"
                eyebrow={p.security.eyebrow}
                title={p.security.title}
                subtitle={p.security.subtitle}
              />
            </div>

            <div>
              <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {p.security.items.map((item, i) => (
                  <Reveal key={item} as="li" delay={i * 40} className="h-full">
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-2 h-1 w-1 shrink-0 bg-accent"
                      />
                      <span className="text-sm leading-relaxed text-ink-muted">
                        {item}
                      </span>
                    </div>
                  </Reveal>
                ))}
              </ul>

              <div className="mt-12">
                <Reveal className="h-full">
                  <h3 className="hud-label">{p.security.separationTitle}</h3>
                </Reveal>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {p.security.separation.map((role, i) => (
                    <Reveal key={role} as="li" delay={i * 50} className="h-full">
                      <span className="inline-block border border-line bg-surface px-3.5 py-2 font-mono text-[0.6875rem] tracking-[0.12em] text-ink-muted">
                        {role}
                      </span>
                    </Reveal>
                  ))}
                </ul>
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
