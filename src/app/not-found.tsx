import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import AirspaceNetwork from "@/components/AirspaceNetwork";
import { getDictionary } from "@/i18n";
import { defaultLocale } from "@/i18n/config";

/**
 * Страница «маршрут не найден».
 *
 * Язык здесь определить нельзя — адрес некорректный, поэтому
 * показываем язык по умолчанию.
 */
export default function NotFound() {
  const t = getDictionary(defaultLocale);

  return (
    <div className="relative isolate flex min-h-svh items-center overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 opacity-35">
          <AirspaceNetwork density={0.6} />
        </div>
        <div className="bg-grid bg-grid-fade absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-void/60 via-void/85 to-void" />
      </div>

      <div className="container-page py-24">
        <div className="max-w-xl">
          <p className="font-mono text-6xl tracking-[0.1em] text-accent/70 lg:text-7xl">
            {t.notFound.code}
          </p>

          <h1 className="mt-8 text-3xl font-medium tracking-tight text-ink lg:text-4xl">
            {t.notFound.title}
          </h1>

          <p className="mt-5 text-base leading-relaxed text-ink-muted">
            {t.notFound.text}
          </p>

          <Link
            href={`/${defaultLocale}`}
            className="group mt-10 inline-flex items-center gap-2.5 border border-accent bg-accent/12 px-6 py-3.5 text-sm tracking-wide text-accent transition-colors hover:bg-accent/20"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
            {t.notFound.cta}
          </Link>
        </div>
      </div>
    </div>
  );
}
