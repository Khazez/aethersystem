import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries/ru";
import ru from "./dictionaries/ru";
import en from "./dictionaries/en";
import kk from "./dictionaries/kk";

const dictionaries: Record<Locale, Dictionary> = { ru, en, kk };

/**
 * Возвращает словарь нужного языка.
 * Используется в серверных компонентах страниц: const t = getDictionary(locale)
 */
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export type { Dictionary };
export type { Locale };
