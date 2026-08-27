import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/seo";

/**
 * Шрифты подключаются через next/font — Next скачивает их при сборке
 * и раздаёт со своего домена. Так они грузятся быстрее и не зависят
 * от доступности внешних сервисов (важно для госучреждений с фильтрацией).
 *
 * cyrillic-ext нужен для казахских букв: ә, ғ, қ, ң, ө, ұ, ү, һ, і.
 *
 * ⚠️ Моноширинный шрифт менялся 27.08.2026: был JetBrains Mono, стал
 * IBM Plex Mono. Причина не вкусовая — **в JetBrains Mono нет казахских
 * букв** Қ Ә Ғ Ң Ұ Һ. Браузер подставлял их из системного шрифта, и
 * в слове получался разнобой: «ҚАЗ» в переключателе языка рисовалось
 * как Қ одним шрифтом и АЗ другим, разной ширины и насыщенности.
 *
 * Проверено замером: браузер отчитывался, что 12 из 19 казахских букв
 * рисует шрифтом Times New Roman. Подключение `cyrillic-ext` тут не
 * помогает — букв нет в самом шрифте, а не в его наборе.
 *
 * Касается не только казахской версии: казахские буквы есть и в
 * русских текстах — в адресе компании (Көктал, Ұлытау) и в фамилии
 * «Слямгазыұлы».
 *
 * IBM Plex Mono выбран из проверенных: покрывает все 19 букв, тоже
 * инженерный по духу, на мелких надписях с разрядкой почти неотличим.
 * Также подошли бы Roboto Mono, Noto Sans Mono, Source Code Pro.
 * Inter (основной шрифт) покрывает всё — его менять не нужно.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono-plex",
  weight: ["400", "500"],
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  /* Основа для всех относительных адресов в метаданных. Без неё
     Next.js подставляет адрес конкретной публикации (у каждой свой),
     и канонические ссылки указывают в никуда. */
  metadataBase: new URL(SITE_URL),
  title: "Aether System & Co. — Technology for the Next Airspace",
  description:
    "Цифровая инфраструктура для беспилотной и автономной авиации. Aether Nexus — единая платформа управления жизненным циклом БВС, воздушным движением и нормативным соответствием.",
};

export const viewport: Viewport = {
  themeColor: "#04070a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${inter.variable} ${plexMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-void text-ink">{children}</body>
    </html>
  );
}
