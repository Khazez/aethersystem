"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

import { isSceneEnabled } from "@/components/scene/quality";

/**
 * Обёртка, которая решает, грузить ли сцену полёта вообще.
 *
 * Зачем нужен отдельный файл: библиотека three.js вместе с
 * постобработкой весит около 600 КБ. Если импортировать сцену напрямую,
 * этот вес уедет и туда, где сцена всё равно не включается. Здесь
 * проверка выполняется ДО импорта, поэтому при отказе файл даже не
 * запрашивается.
 *
 * Отказ теперь только по двум причинам: системное «уменьшить движение»
 * и отсутствие поддержки трёхмерной графики. Ширина экрана больше ни на
 * что не влияет — на телефоне сцена работает, только в облегчённом виде
 * (см. `scene/quality.ts`).
 */

const FlightBackdrop = dynamic(() => import("./FlightBackdrop"), {
  ssr: false,
});

/** Результат кэшируем: создавать пробный canvas на каждую перерисовку незачем. */
let cached: boolean | null = null;

function readEnabled(): boolean {
  if (cached !== null) return cached;
  cached = isSceneEnabled();
  return cached;
}

/** Окружение за время жизни страницы не меняется — подписка пустая. */
const subscribeNever = () => () => {};

export default function FlightBackdropLazy() {
  /* На сервере ни экрана, ни WebGL нет, поэтому серверный снимок — false.
     В браузере значение считается один раз. */
  const enabled = useSyncExternalStore(
    subscribeNever,
    readEnabled,
    () => false,
  );

  return enabled ? <FlightBackdrop /> : null;
}
