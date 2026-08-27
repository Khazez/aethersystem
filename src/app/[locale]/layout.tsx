import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import Header from "@/components/Header";
import SmoothScroll from "@/components/SmoothScroll";
import Footer from "@/components/Footer";
import { getDictionary } from "@/i18n";
import { locales, isLocale, localeHtmlLang } from "@/i18n/config";

/**
 * generateStaticParams заранее сообщает Next.js список языков,
 * чтобы он собрал /ru, /en и /kk как статические страницы.
 * Статическая страница отдаётся мгновенно — сервер ничего не вычисляет.
 */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/**
 * params приходит как Promise — в Next.js 16 параметры адреса
 * разрешаются асинхронно, поэтому их нужно дожидаться через await.
 */
type LocaleParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const t = getDictionary(locale);

  return {
    title: {
      default: t.meta.defaultTitle,
      template: t.meta.titleTemplate,
    },
    description: t.meta.defaultDescription,
    /* ⚠️ `alternates` здесь БЫЛИ и убраны 27.08.2026.
       Макет один на все страницы раздела и своего адреса не знает,
       поэтому каждая страница объявляла канонической ссылкой главную —
       то есть выдавала себя за её копию. Теперь каждая страница задаёт
       их сама через `alternates()` из `lib/seo.ts`. */
    openGraph: {
      title: t.meta.defaultTitle,
      description: t.meta.defaultDescription,
      siteName: t.meta.siteName,
      locale: localeHtmlLang[locale],
      type: "website",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleParams & { children: ReactNode }) {
  const { locale } = await params;

  // Адрес вида /de или /xyz — языка нет, показываем 404.
  if (!isLocale(locale)) notFound();

  const t = getDictionary(locale);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Плавная прокрутка + связка с анимациями. Ничего не рисует. */}
      <SmoothScroll />

      {/* Ссылка для тех, кто пользуется клавиатурой или скринридером:
          позволяет перепрыгнуть навигацию и попасть сразу к содержимому.
          Видна только при фокусе. Требование доступности. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:border focus:border-accent focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:text-ink"
      >
        {t.common.sectionLabel}
      </a>

      <Header locale={locale} t={t} />

      <main id="main" className="flex-1">
        {children}
      </main>

      <Footer locale={locale} t={t} />
    </div>
  );
}
