/**
 * Конфигурация языков сайта.
 *
 * "Локаль" (locale) — это язык + региональные правила. У нас три:
 * ru — русский, en — английский, kk — казахский.
 * Код языка попадает в адрес страницы: /ru/about, /en/about, /kk/about.
 */

export const locales = ["ru", "en", "kk"] as const;

export type Locale = (typeof locales)[number];

/** Язык по умолчанию — на него уходит редирект с корня сайта "/". */
export const defaultLocale: Locale = "ru";

/** Подписи в переключателе языка в шапке. */
export const localeNames: Record<Locale, string> = {
  ru: "РУ",
  en: "EN",
  kk: "ҚАЗ",
};

/** Атрибут lang для тега <html> — нужен поисковикам и скринридерам. */
export const localeHtmlLang: Record<Locale, string> = {
  ru: "ru-RU",
  en: "en-US",
  kk: "kk-KZ",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
