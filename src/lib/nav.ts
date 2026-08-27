import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";

/** Путь внутри сайта с учётом текущего языка: href("ru", "/about") → "/ru/about" */
export function href(locale: Locale, path: string): string {
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

export type NavItem = { path: string; label: string };

/**
 * Основные пункты меню в шапке.
 *
 * Контактов здесь нет намеренно: они вынесены в отдельную кнопку справа,
 * рядом с переключателем языка. Раньше пункт стоял в обоих местах и
 * дублировался в одной строке.
 */
export function mainNav(t: Dictionary): NavItem[] {
  return [
    { path: "/about", label: t.nav.about },
    { path: "/product", label: t.nav.product },
    { path: "/solutions", label: t.nav.solutions },
    { path: "/team", label: t.nav.team },
  ];
}

/** Пункты в подвале. Форм на сайте нет — обращения идут на контакты. */
export function footerNav(t: Dictionary): NavItem[] {
  return [
    { path: "/", label: t.nav.home },
    ...mainNav(t),
    /* Контакты сюда НЕ добавляем: в подвале для них есть отдельная
       колонка «Связь». Иначе пункт задвоится. */
  ];
}
