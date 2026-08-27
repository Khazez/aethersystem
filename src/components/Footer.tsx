import Link from "next/link";

import { Logo } from "./Logo";
import { href, footerNav } from "@/lib/nav";
import { EMAIL, PHONE } from "@/lib/company";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";

export default function Footer({
  locale,
  t,
}: {
  locale: Locale;
  t: Dictionary;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-line bg-abyss">
      <div className="container-page py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:gap-8">
          {/* --- Колонка компании --- */}
          <div className="max-w-sm">
            <Logo />
            <p className="mt-6 font-mono text-[0.6875rem] tracking-[0.2em] text-accent/80 uppercase">
              {t.footer.tagline}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              {t.footer.description}
            </p>
          </div>

          {/* --- Навигация --- */}
          <nav aria-label={t.footer.navTitle}>
            <h2 className="hud-label">{t.footer.navTitle}</h2>
            <ul className="mt-5 flex flex-col gap-3">
              {footerNav(t).map((item) => (
                <li key={item.path}>
                  <Link
                    href={href(locale, item.path)}
                    className="text-sm text-ink-muted transition-colors hover:text-accent"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* --- Элементы платформы (не ссылки: отдельных страниц пока нет) --- */}
          <div>
            <h2 className="hud-label">{t.footer.productTitle}</h2>
            <ul className="mt-5 flex flex-col gap-3">
              {t.footer.productLinks.map((name) => (
                <li key={name} className="text-sm text-ink-muted">
                  {name}
                </li>
              ))}
            </ul>
          </div>

          {/* --- Связь ---
              Почта и телефон стоят прямо здесь, а не только на странице
              контактов: форм на сайте нет, и это единственный путь до
              компании — он должен быть виден с любой страницы. */}
          <div>
            <h2 className="hud-label">{t.footer.contactTitle}</h2>
            <ul className="mt-5 flex flex-col gap-3">
              <li>
                <a
                  href={`mailto:${EMAIL}`}
                  className="text-sm break-words text-ink-muted transition-colors hover:text-accent"
                >
                  {EMAIL}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${PHONE.href}`}
                  className="text-sm whitespace-nowrap text-ink-muted transition-colors hover:text-accent"
                >
                  {PHONE.display}
                </a>
              </li>
              <li>
                <Link
                  href={href(locale, "/contacts")}
                  className="text-sm text-ink-muted transition-colors hover:text-accent"
                >
                  {t.nav.contacts}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* --- Нижняя строка --- */}
        <div className="mt-14 flex flex-col gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-ink-faint">
            © {year} {t.meta.siteName}. {t.footer.rights}
          </p>
          <p className="font-mono text-[0.6875rem] tracking-[0.2em] text-ink-faint uppercase">
            Digital Infrastructure for Autonomous Aviation
          </p>
        </div>
      </div>
    </footer>
  );
}
