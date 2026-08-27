import AirspaceNetwork from "./AirspaceNetwork";
import Reveal from "./Reveal";

/**
 * Шапка внутренней страницы. Единый вид для всех разделов, кроме главной:
 * метка раздела, крупный заголовок, при необходимости — подзаголовок
 * и вводный абзац.
 */
export default function PageHero({
  eyebrow,
  title,
  subtitle,
  lead,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  lead?: string;
}) {
  return (
    <section className="relative isolate overflow-hidden pt-18">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 opacity-40">
          <AirspaceNetwork density={0.55} />
        </div>
        <div className="bg-grid bg-grid-fade absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-void/55 via-void/80 to-void" />
      </div>

      <div className="container-page py-20 lg:py-28">
        <div className="max-w-4xl">
          <Reveal>
            <p className="hud-label flex items-center gap-3">
              <span className="status-dot h-1.5 w-1.5 rounded-full bg-accent" />
              {eyebrow}
            </p>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-6 text-balance text-4xl leading-[1.1] font-medium tracking-tight text-ink sm:text-5xl lg:text-[3.5rem]">
              {title}
            </h1>
          </Reveal>

          {subtitle && (
            <Reveal delay={150}>
              <p className="mt-6 font-mono text-[0.75rem] tracking-[0.24em] text-accent/80 uppercase">
                {subtitle}
              </p>
            </Reveal>
          )}

          {lead && (
            <Reveal delay={210}>
              <p className="mt-7 max-w-2xl text-pretty text-base leading-relaxed text-ink-muted lg:text-lg">
                {lead}
              </p>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
