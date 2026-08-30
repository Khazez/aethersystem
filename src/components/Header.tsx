"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, Check, ArrowUpRight } from "lucide-react";

import { Logo } from "./Logo";
import { href, mainNav } from "@/lib/nav";
import { PLATFORM_URL } from "@/lib/company";
import { locales, localeNames, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";

export default function Header({
  locale,
  t,
}: {
  locale: Locale;
  t: Dictionary;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const nav = mainNav(t);

  /* Шапка становится непрозрачной после прокрутки — чтобы текст под ней
     не просвечивал. Пока страница вверху, шапка «растворена» в hero. */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Любой переход по ссылке закрывает открытые меню.
     Вызывается прямо из обработчика клика, а не через эффект на адресе:
     эффект сработал бы уже после отрисовки новой страницы и вызвал бы
     лишний повторный рендер. */
  const closeMenus = () => {
    setMobileOpen(false);
    setLangOpen(false);
  };

  /* Пока открыто мобильное меню, страница под ним не должна прокручиваться. */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  /* Escape закрывает меню — привычное поведение, требование доступности. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        setLangOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** Текущий путь без языкового префикса: "/ru/about" → "/about" */
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}/, "") || "/";

  const isActive = (path: string) =>
    path === "/"
      ? pathWithoutLocale === "/"
      : pathWithoutLocale.startsWith(path);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
          scrolled || mobileOpen
            ? "border-b border-line bg-void/92 backdrop-blur-xl"
            : "border-b border-transparent"
        }`}
      >
        <div className="container-page flex h-18 items-center justify-between gap-6 py-4">
          <Link
            href={href(locale, "/")}
            aria-label={t.meta.siteName}
            onClick={closeMenus}
            className="shrink-0"
          >
            <Logo />
          </Link>

          {/* --- Навигация (десктоп) --- */}
          <nav
            aria-label={t.nav.menu}
            className="hidden items-center gap-1 lg:flex"
          >
            {nav.map((item) => (
              <Link
                key={item.path}
                href={href(locale, item.path)}
                aria-current={isActive(item.path) ? "page" : undefined}
                className={`relative px-3.5 py-2 text-[0.8125rem] tracking-wide transition-colors ${
                  isActive(item.path)
                    ? "text-ink"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {item.label}
                {isActive(item.path) && (
                  <span className="absolute inset-x-3.5 -bottom-0.5 h-px bg-accent" />
                )}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {/* --- Переключатель языка --- */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangOpen((v) => !v)}
                aria-expanded={langOpen}
                aria-haspopup="menu"
                aria-label={t.nav.language}
                className="flex items-center gap-1.5 border border-line px-3 py-2 font-mono text-[0.6875rem] tracking-[0.16em] text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
              >
                {localeNames[locale]}
              </button>

              {langOpen && (
                <>
                  {/* Прозрачный слой: клик мимо меню закрывает его */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setLangOpen(false)}
                    aria-hidden="true"
                  />
                  <ul
                    role="menu"
                    className="absolute right-0 z-20 mt-1 min-w-36 border border-line bg-surface py-1 shadow-2xl shadow-black/60"
                  >
                    {locales.map((code) => (
                      <li key={code} role="none">
                        <Link
                          role="menuitem"
                          href={`/${code}${pathWithoutLocale === "/" ? "" : pathWithoutLocale}`}
                          onClick={closeMenus}
                          className={`flex items-center justify-between gap-4 px-3.5 py-2 font-mono text-[0.6875rem] tracking-[0.16em] transition-colors hover:bg-surface-2 ${
                            code === locale ? "text-accent" : "text-ink-muted"
                          }`}
                        >
                          {localeNames[code]}
                          {code === locale && <Check className="h-3 w-3" />}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {/* --- Вход в сам продукт. ---

                Стоит отдельно от разделов меню намеренно: разделы
                рассказывают о компании, эта ссылка уводит в рабочую
                систему на другом сервере. Стиль вторичный — главным
                призывом сайта остаётся связаться с компанией.

                target="_blank" — новая вкладка: посетитель уходит в
                другую систему, и сайт компании при этом не закрывается.
                rel="noopener noreferrer" — открытая страница не получает
                доступа к нашей и не узнаёт, откуда пришёл посетитель. */}
            <a
              href={PLATFORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 border border-line-strong px-4 py-2 text-[0.8125rem] tracking-wide text-ink-muted transition-colors hover:border-accent/60 hover:text-accent sm:inline-flex"
            >
              {t.nav.platform}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only"> ({t.nav.platformHint})</span>
            </a>

            {/* --- Кнопка связи. Форм на сайте нет: ведём на контакты. --- */}
            <Link
              href={href(locale, "/contacts")}
              className="hidden border border-accent/40 bg-accent/8 px-4 py-2 text-[0.8125rem] tracking-wide text-accent transition-colors hover:border-accent hover:bg-accent/15 sm:inline-block"
            >
              {t.nav.contacts}
            </Link>

            {/* --- Кнопка мобильного меню --- */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? t.nav.close : t.nav.menu}
              className="border border-line p-2 text-ink-muted transition-colors hover:text-ink lg:hidden"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* --- Мобильное меню --- */}
      {mobileOpen && (
        <div className="fixed inset-0 top-18 z-40 overflow-y-auto border-t border-line bg-void lg:hidden">
          <nav aria-label={t.nav.menu} className="container-page py-8">
            <ul className="flex flex-col">
              {[{ path: "/", label: t.nav.home }, ...nav].map((item) => (
                <li key={item.path} className="border-b border-line">
                  <Link
                    href={href(locale, item.path)}
                    aria-current={isActive(item.path) ? "page" : undefined}
                    onClick={closeMenus}
                    className={`flex items-center justify-between py-4 text-lg transition-colors ${
                      isActive(item.path) ? "text-accent" : "text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3">
              {/* Платформа первой: на телефоне до низа меню долистывают
                  не все, а это единственный вход в сам продукт. */}
              <a
                href={PLATFORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenus}
                className="flex items-center justify-center gap-2 border border-line-strong px-5 py-3.5 text-center text-ink"
              >
                {t.nav.platform}
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only"> ({t.nav.platformHint})</span>
              </a>

              <Link
                href={href(locale, "/contacts")}
                onClick={closeMenus}
                className="border border-accent/40 bg-accent/8 px-5 py-3.5 text-center text-accent"
              >
                {t.nav.contacts}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
