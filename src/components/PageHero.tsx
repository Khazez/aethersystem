import DepthBackdrop, { type BackdropScene } from "./DepthBackdrop";
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
  scene = "nodes",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  lead?: string;
  /** Мотив подложки. У каждого раздела свой — см. DepthBackdrop. */
  scene?: BackdropScene;
}) {
  return (
    <section className="relative isolate overflow-hidden pt-18">
      <div className="absolute inset-0 -z-10">
        {/* ⚠️ Непрозрачность и градиент подобраны так, чтобы сцену
            было видно. Прежние `opacity-40` и градиент до сплошного
            `void` гасили её почти целиком — отсюда и было замечание
            «фон скучный». Затемнение теперь рисует сама сцена, по
            своей глубине; здесь остаётся только полоса под шапкой
            и мягкий переход к содержанию. */}
        <div className="absolute inset-0 opacity-80">
          <DepthBackdrop scene={scene} />
        </div>
        <div className="bg-grid bg-grid-fade absolute inset-0 opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-void/70 via-transparent to-void" />
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
