"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Плавная прокрутка страницы + связка с анимациями GSAP.
 *
 * Зачем: обычная прокрутка в браузере идёт рывками — колесо мыши двигает
 * страницу ступеньками. Lenis сглаживает это, страница «едет» по инерции.
 * На сайте, где прокрутка управляет анимацией, рывки сразу заметны.
 *
 * Вторая задача — подружить Lenis и ScrollTrigger. ScrollTrigger (часть
 * GSAP) следит за положением страницы и запускает анимации. Но Lenis
 * двигает страницу по-своему, поэтому ScrollTrigger нужно пересчитывать
 * вручную на каждый кадр Lenis — иначе анимации отстают от прокрутки.
 *
 * При системной настройке «уменьшить движение» плавная прокрутка не
 * включается вовсе: остаётся обычная, к которой человек привык.
 */

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const lenis = new Lenis({
      // Насколько долго страница «доезжает» после броска колеса.
      duration: 1.05,
      smoothWheel: true,
      // Прокрутку пальцем на телефоне не трогаем: система делает это лучше,
      // а подмена ломает привычное ощущение и жесты браузера.
      syncTouch: false,
    });

    // Каждый сдвиг Lenis — повод пересчитать триггеры анимаций.
    lenis.on("scroll", ScrollTrigger.update);

    // Один общий кадровый цикл на GSAP и Lenis вместо двух параллельных.
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    // lagSmoothing(0) — не «подгонять» время после подтормаживания вкладки,
    // иначе привязанная к прокрутке анимация прыгает.
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
