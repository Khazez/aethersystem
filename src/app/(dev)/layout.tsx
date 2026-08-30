import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";
import { fontVariables } from "@/app/fonts";
import { SITE_URL } from "@/lib/seo";

/**
 * Корневой макет служебных страниц — `/prototype` и `/variants`.
 *
 * ── Зачем отдельный корень ────────────────────────────────────────
 *
 * Тег <html> обязан объявлять язык страницы. У самого сайта язык
 * берётся из адреса (`/kk`, `/ru`, `/en`), поэтому <html> живёт в
 * `[locale]/layout.tsx`. Служебные страницы лежат вне сегмента
 * `[locale]` и своим языком не управляют — у них он всегда русский.
 *
 * Next.js разрешает несколько корневых макетов, если нет общего
 * `app/layout.tsx`: корнем становится верхний макет каждой группы
 * маршрутов. Скобки в имени `(dev)` означают, что папка на адрес
 * НЕ влияет: страница остаётся `/prototype`, а не `/dev/prototype`.
 *
 * ⚠️ Переход между двумя корнями (например с `/ru` на `/prototype`)
 * перезагружает страницу целиком, а не подменяет её часть. Для
 * служебных страниц это неважно.
 *
 * Индексацию тут не запрещаем — она уже запрещена в метаданных самих
 * страниц (`robots: { index: false }`).
 */

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
};

export const viewport: Viewport = {
  themeColor: "#04070a",
  width: "device-width",
  initialScale: 1,
};

export default function DevLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className={`${fontVariables} h-full`} suppressHydrationWarning>
      <body className="min-h-full bg-void text-ink">{children}</body>
    </html>
  );
}
