"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

/**
 * Плавное появление блока, когда он попадает в видимую часть экрана.
 *
 * "use client" сверху означает: этот компонент выполняется в браузере
 * пользователя (остальные страницы сайта собираются на сервере заранее).
 * Браузерный код нужен здесь потому, что мы следим за прокруткой.
 *
 * Технически используется IntersectionObserver — встроенный в браузер
 * наблюдатель, который сообщает, когда элемент появился на экране.
 * Это дешевле, чем слушать каждое движение прокрутки.
 */
export default function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
}: {
  children: ReactNode;
  /** Задержка появления в миллисекундах — для каскада карточек. */
  delay?: number;
  /** Каким HTML-тегом отрисовать обёртку. */
  as?: ElementType;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-reveal", "shown");
            // Показали один раз — дальше следить не нужно.
            observer.unobserve(entry.target);
          }
        }
      },
      // rootMargin сдвигает границу срабатывания: элемент считается
      // видимым чуть раньше, чем реально доедет до края экрана.
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal=""
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
      className={className}
    >
      {children}
    </Tag>
  );
}
