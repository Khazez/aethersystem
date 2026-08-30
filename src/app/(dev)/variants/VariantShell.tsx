import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

/** Служебная шапка вариантов — чтобы легко переключаться между ними. */
export default function VariantShell({
  id,
  name,
  children,
}: {
  id: string;
  name: string;
  children: ReactNode;
}) {
  const all = ["a", "b", "c", "d"];

  return (
    <div className="bg-void">
      <div className="fixed inset-x-0 top-0 z-50 border-b border-line bg-void/85 backdrop-blur-xl">
        <div className="container-page flex h-12 items-center justify-between gap-4">
          <Link
            href="/variants"
            className="group flex items-center gap-2 text-[0.8125rem] text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Все варианты
          </Link>

          <span className="hud-label hidden text-accent sm:block">
            ВАРИАНТ {id.toUpperCase()} · {name}
          </span>

          <nav className="flex items-center gap-1">
            {all.map((v) => (
              <Link
                key={v}
                href={`/variants/${v}`}
                aria-current={v === id ? "page" : undefined}
                className={`border px-2.5 py-1 font-mono text-[0.6875rem] tracking-[0.16em] transition-colors ${
                  v === id
                    ? "border-accent bg-accent/12 text-accent"
                    : "border-line text-ink-muted hover:border-line-strong hover:text-ink"
                }`}
              >
                {v.toUpperCase()}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {children}
    </div>
  );
}
