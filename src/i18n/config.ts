/**
 * Конфигурация языков сайта.
 *
 * "Локаль" (locale) — это язык + региональные правила. У нас три:
 * kk — казахский, ru — русский, en — английский.
 * Код языка попадает в адрес страницы: /kk/about, /ru/about, /en/about.
 *
 * ⚠️ Порядок в массиве `locales` — не оформление. По нему строится
 * переключатель языков в шапке, карта сайта и языковые ссылки hreflang.
 * Заказчик 29.08.2026 попросил порядок «казахский, русский, английский»
 * — менять только по его слову.
 */

export const locales = ["kk", "ru", "en"] as const;

export type Locale = (typeof locales)[number];

/**
 * Язык по умолчанию — на него уходит редирект с корня сайта "/",
 * на нём же показывается страница 404 по несуществующему адресу.
 *
 * С 29.08.2026 это казахский: заказчик просил, чтобы сайт по умолчанию
 * открывался на государственном языке. Было "ru".
 */
export const defaultLocale: Locale = "kk";

/** Подписи в переключателе языка в шапке. */
export const localeNames: Record<Locale, string> = {
  kk: "ҚАЗ",
  ru: "РУ",
  en: "EN",
};

/** Атрибут lang для тега <html> — нужен поисковикам и скринридерам. */
export const localeHtmlLang: Record<Locale, string> = {
  kk: "kk-KZ",
  ru: "ru-RU",
  en: "en-US",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
