import { notFound } from "next/navigation";

import FlightBackdropLazy from "@/components/home/FlightBackdropLazy";
import FlightStops from "@/components/home/FlightStops";
import Problem from "@/components/home/Problem";
import Concept from "@/components/home/Concept";
import LifecycleScene from "@/components/home/LifecycleScene";
import Modules from "@/components/home/Modules";
import GridSection from "@/components/home/GridSection";
import Industries from "@/components/home/Industries";
import Roadmap from "@/components/home/Roadmap";
import CallToAction from "@/components/CallToAction";

import { alternates } from "@/lib/seo";
import { getDictionary } from "@/i18n";
import { isLocale, locales } from "@/i18n/config";

/* Заголовок и описание главной берутся из макета — они там и заданы.
   Здесь задаются только адреса языковых версий: макет их задать не
   может, он один на все страницы раздела и своего адреса не знает. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { alternates: alternates(locale) };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = getDictionary(locale);

  return (
    <>
      {/* Полёт идёт фоном под всей страницей: прокрутка ведёт аппарат
          от первого экрана до последнего блока, через всё содержание. */}
      <FlightBackdropLazy />

      {/* Содержание лежит поверх сцены. */}
      <div className="relative z-10">
        <FlightStops locale={locale} t={t} />

        {/* Ниже идёт содержание. Одна общая полупрозрачная подложка:
            полёт просвечивает, но текст читается. Раньше секции имели
            собственные подложки разной плотности — на дневной сцене
            это давало резкие горизонтальные полосы. */}
        <div className="relative bg-void/58">
          <Problem t={t} />
        <Concept t={t} />
        <LifecycleScene
          title={t.home.concept.lifecycleTitle}
          steps={t.home.concept.lifecycle}
          counterLabel={t.home.concept.lifecycleStep}
        />
        <Modules locale={locale} t={t} />
        <GridSection t={t} />
        <Industries t={t} index="06" />
        <Roadmap t={t} />
          <CallToAction
            locale={locale}
            title={t.home.cta.title}
            subtitle={t.home.cta.subtitle}
            primaryLabel={t.home.cta.primary}
          />
        </div>

        {/* ============================================================
            Площадка посадки. Секция намеренно пустая и прозрачная:
            здесь аппарат садится на вертипорт, и посадку должно быть
            видно целиком — спереди, а не фоном за текстом.
            Высота секции задаёт длину снижения.
            ============================================================ */}
        <section
          data-landing-stage
          aria-hidden="true"
          className="relative hidden h-svh motion-safe:block"
        />
      </div>
    </>
  );
}
