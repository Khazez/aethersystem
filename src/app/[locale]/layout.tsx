import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import "@/app/globals.css";
import { fontVariables } from "@/app/fonts";
import { SITE_URL } from "@/lib/seo";

import Header from "@/components/Header";
import SmoothScroll from "@/components/SmoothScroll";
import Footer from "@/components/Footer";
import { getDictionary } from "@/i18n";
import { locales, isLocale, localeHtmlLang } from "@/i18n/config";

/**
 * КОРНЕВОЙ макет сайта: именно здесь живут <html> и <body>.
 *
 * ⚠️ До 30.08.2026 они лежали в `app/layout.tsx`, общем для всего
 * приложения. Тот макет лежит выше сегмента `[locale]` и языка
 * страницы не знает — параметры адреса до него не доходят. Поэтому
 * все страницы отдавали один и тот же `lang`, включая /ru и /en.
 * Для скринридера это значит, что казахский текст читался по
 * правилам чужого языка.
 *
 * Теперь `app/layout.tsx` нет вовсе, а корней два: этот (сайт,
 * язык из адреса) и `(dev)/layout.tsx` (служебные страницы).
 * Next.js разрешает такое, когда общего корня нет.
 *
 * Следствия переноса, чтобы не удивляться:
 * - перенаправление с `/` на язык по умолчанию переехало в
 *   `next.config.ts` — страницы `app/page.tsx` больше нет, ей негде
 *   было бы взять <html>;
 * - страница 404 для адреса без языка (например `/qwerty`) лежит
 *   в `app/global-not-found.tsx` и рисует свой <html> сама.
 *
 * generateStaticParams заранее сообщает Next.js список языков,
 * чтобы он собрал /ru, /en и /kk как статические страницы.
 * Статическая страница отдаётся мгновенно — сервер ничего не вычисляет.
 */
/**
 * ⚠️ Список языков закрыт: адрес с любым другим значением (`/de`,
 * `/qwerty`) сразу отдаёт 404, не заходя в этот макет.
 *
 * Без этой строки Next считает такой адрес «языком de» и заходит
 * внутрь, а макет вызывает notFound(). Раньше это работало: 404
 * оборачивалась общим корневым макетом. Теперь корень — сам этот
 * файл, и оборачивать нечем: посетитель получал голую служебную
 * заглушку Next вместо нашей страницы. Проверено запросом, а не
 * предположением.
 */
export const dynamicParams = false;

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
    /* Основа для всех относительных адресов в метаданных. Без неё
       Next.js подставляет адрес конкретной публикации (у каждой свой),
       и канонические ссылки указывают в никуда. */
    metadataBase: new URL(SITE_URL),
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

export const viewport: Viewport = {
  themeColor: "#04070a",
  width: "device-width",
  initialScale: 1,
};

export default async function LocaleLayout({
  children,
  params,
}: LocaleParams & { children: ReactNode }) {
  const { locale } = await params;

  // Адрес вида /de или /xyz — языка нет, показываем 404.
  if (!isLocale(locale)) notFound();

  const t = getDictionary(locale);

  return (
    /* Язык в полной форме (kk-KZ, а не kk): так же он записан в
       ссылках hrefLang, и расхождения между ними быть не должно. */
    <html
      lang={localeHtmlLang[locale]}
      className={`${fontVariables} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-void text-ink">
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
      </body>
    </html>
  );
}
