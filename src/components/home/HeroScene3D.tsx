"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import { createAetherGrid, GRID_EXTENT } from "@/components/scene/grid3d";
import { createRoutes } from "@/components/scene/routes";
import { createDrone } from "@/components/scene/drone";

/**
 * Первый экран главной в объёме: камера летит вместе с беспилотником
 * сквозь цифровую сетку воздушного пространства.
 *
 * Отличие от сцены на /prototype: там прокрутка управляла камерой, и без
 * прокрутки экран стоял. Здесь полёт идёт сам — первый экран обязан
 * двигаться до того, как посетитель тронул колесо мыши.
 *
 * Камера держится позади и сбоку от аппарата, поэтому он крупный и
 * читается силуэтом. В прежнем прототипе беспилотник занимал 176 пикселей
 * в углу панели и выглядел плоской загогулиной.
 *
 * Модель, сетка и маршруты построены кодом (three.js), а не скачаны
 * готовым файлом: для госзаказа важна чистота прав на все материалы.
 * Вся сцена весит килобайты вместо мегабайт — открывается на слабом
 * интернете.
 *
 * Если WebGL недоступен, компонент вообще не монтируется — решение
 * принимает LiveHero и показывает вместо сцены двумерную карту.
 */

/** Есть ли в браузере рабочий WebGL. Проверяется до монтирования сцены. */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

export default function HeroScene3D({ className = "" }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    /* --- Основа сцены --------------------------------------------------- */
    const scene = new THREE.Scene();
    // Туман прячет дальние ячейки: без него решётка выглядит плоской стеной.
    scene.fog = new THREE.FogExp2(0x04070a, 0.011);

    const camera = new THREE.PerspectiveCamera(
      54,
      mount.clientWidth / Math.max(1, mount.clientHeight),
      0.1,
      600,
    );

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }

    // Ограничиваем плотность пикселей: на экранах с высоким DPI сцена
    // иначе рисуется вчетверо большим числом точек и греет ноутбук.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x3a5a6b, 1.55));

    const keyLight = new THREE.DirectionalLight(0xbfe8f5, 2.3);
    keyLight.position.set(-30, 40, 20);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x4bc8e0, 1.7);
    rimLight.position.set(25, -12, -30);
    scene.add(rimLight);

    /* --- Содержимое: сетка, маршруты, аппарат ---------------------------- */
    const grid = createAetherGrid();
    scene.add(grid.group);

    const routes = createRoutes(GRID_EXTENT);
    scene.add(routes.group);

    const drone = createDrone();
    scene.add(drone);

    // Сетка и маршруты сразу в проявленном состоянии: на первом экране
    // нечему «проявляться» — прокрутки ещё не было.
    grid.setPhase(1);
    routes.setPhase(1);

    /* --- Полёт ----------------------------------------------------------- */
    const dronePos = new THREE.Vector3();
    const droneTangent = new THREE.Vector3();
    const lookAhead = new THREE.Vector3();
    const camTarget = new THREE.Vector3();
    const sideways = new THREE.Vector3();
    const worldUp = new THREE.Vector3(0, 1, 0);

    /** Сколько секунд длится полный проход по маршруту. */
    const LAP_SECONDS = 46;

    const place = (time: number) => {
      const t = (time / LAP_SECONDS) % 1;

      routes.sampleLead(t, dronePos);
      routes.sampleLeadTangent(t, droneTangent);
      droneTangent.normalize();

      drone.position.copy(dronePos);
      lookAhead.copy(dronePos).add(droneTangent);
      drone.lookAt(lookAhead);
      // Лёгкий крен — аппарат не едет по рельсам, а летит.
      drone.rotateZ(Math.sin(time * 0.5) * 0.16);
      drone.scale.setScalar(1.5);

      /* Камера идёт позади, выше и левее аппарата. Смещение влево нужно,
         чтобы аппарат встал в правой части кадра — слева лежит заголовок. */
      sideways.crossVectors(droneTangent, worldUp).normalize();

      camTarget
        .copy(dronePos)
        .addScaledVector(droneTangent, -15)
        .addScaledVector(sideways, -6)
        .addScaledVector(worldUp, 1.6);

      if (reduceMotion) {
        camera.position.copy(camTarget);
      } else {
        // Камера догоняет цель плавно — иначе она дёргается на изгибах.
        camera.position.lerp(camTarget, 0.045);
      }
      camera.lookAt(dronePos);

      /* Доворот камеры влево уводит аппарат в правую часть кадра.
         Смещать саму камеру вбок было ненадёжно: маршрут изгибается, и
         аппарат то и дело заезжал на текстовую колонку слева. Доворот
         работает в системе координат камеры, поэтому кадр держится
         одинаково на любом участке маршрута. */
      camera.rotateY(0.26);
    };

    /* --- Кадровый цикл ---------------------------------------------------- */
    let frameId = 0;
    let running = true;
    const clock = new THREE.Clock();

    const draw = () => {
      if (!running) return;
      const time = clock.getElapsedTime();

      grid.update(time);
      routes.update(time);
      place(time);

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(draw);
    };

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // Скрытая вкладка не должна крутить сцену и жечь батарею.
    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frameId);
      } else if (!reduceMotion) {
        running = true;
        clock.start();
        frameId = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (reduceMotion) {
      // Один статичный кадр: движения нет, но экран не пустой.
      grid.update(0);
      routes.update(0);
      place(6);
      renderer.render(scene, camera);
      running = false;
    } else {
      frameId = requestAnimationFrame(draw);
    }

    /* --- Уборка ----------------------------------------------------------- */
    return () => {
      running = false;
      cancelAnimationFrame(frameId);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);

      grid.dispose();
      routes.dispose();
      drone.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
          obj.geometry?.dispose();
          const m = obj.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m?.dispose();
        }
      });

      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} aria-hidden="true" className={className} />;
}
