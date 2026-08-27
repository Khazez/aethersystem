"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import { createAetherGrid, GRID_EXTENT } from "./grid3d";
import { createRoutes } from "./routes";
import { createDrone } from "./drone";

/**
 * Главная трёхмерная сцена сайта — AETHER GRID.
 *
 * Идея: воздушное пространство, ставшее цифровым. Прокрутка страницы
 * управляет переходом от разрозненности к единой инфраструктуре —
 * это главный тезис компании, рассказанный визуально.
 *
 * Фазы (progress от 0 до 1):
 *   0.00—0.25  ХАОС — узлы разбросаны, связей нет
 *   0.25—0.50  ИДЕНТИФИКАЦИЯ — узлы собираются, обретают место
 *   0.50—0.75  СЕТКА — пространство структурируется, видна решётка
 *   0.75—1.00  МАРШРУТЫ — проложены траектории, система работает
 *
 * Термины:
 *   WebGL — способ рисовать трёхмерную графику силами видеокарты
 *   прямо в браузере. three.js — библиотека, которая делает работу
 *   с ним посильной: сцена, камера, объекты, свет.
 */

export type SceneProgress = { current: number };

export default function AetherScene({
  /** Внешний источник прогресса 0→1. Обычно прокрутка страницы. */
  progressRef,
  className = "",
}: {
  progressRef: React.RefObject<SceneProgress>;
  className?: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    /* --- Базовая настройка ---------------------------------------------- */
    const scene = new THREE.Scene();

    // Туман скрывает дальние ячейки решётки. Без него сетка выглядит
    // плоской стеной; с ним появляется ощущение глубины пространства.
    scene.fog = new THREE.FogExp2(0x04070a, 0.0095);

    const camera = new THREE.PerspectiveCamera(
      52,
      mount.clientWidth / mount.clientHeight,
      0.1,
      600,
    );

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    // Ограничиваем плотность пикселей: на Retina без этого сцена
    // рисуется вчетверо большим разрешением и ощутимо тормозит.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    /* --- Освещение -------------------------------------------------------
       Сцена намеренно тёмная: светятся сами данные, а не источники.
       Направленный свет нужен только чтобы читался объём беспилотника. */
    scene.add(new THREE.AmbientLight(0x2a3f4d, 1.1));

    const keyLight = new THREE.DirectionalLight(0x9fd9ea, 1.5);
    keyLight.position.set(-30, 40, 20);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x4bc8e0, 0.9);
    rimLight.position.set(25, -12, -30);
    scene.add(rimLight);

    /* --- Содержимое сцены ------------------------------------------------ */
    const grid = createAetherGrid();
    scene.add(grid.group);

    const routes = createRoutes(GRID_EXTENT);
    scene.add(routes.group);

    const drone = createDrone();
    drone.scale.setScalar(0.85);
    scene.add(drone);

    /* --- Ключевые положения камеры ---------------------------------------
       Камера идёт от отдалённого взгляда на хаос — внутрь
       структурированного пространства. */
    const cameraPath: Array<{ pos: THREE.Vector3; look: THREE.Vector3 }> = [
      // Хаос: далёкий взгляд со стороны на разлетевшиеся данные.
      {
        pos: new THREE.Vector3(0, 16, 132),
        look: new THREE.Vector3(0, 0, 0),
      },
      // Идентификация: сближаемся, узлы собираются на глазах.
      {
        pos: new THREE.Vector3(-38, 24, 92),
        look: new THREE.Vector3(0, 2, 0),
      },
      // Сетка: смотрим на решётку сбоку и сверху — видна её структура
      // и эшелоны. Внутрь облака не заходим, иначе ближние узлы
      // расплываются в пятна и структура теряется.
      {
        pos: new THREE.Vector3(-52, 16, 58),
        look: new THREE.Vector3(4, -2, -6),
      },
      // Маршруты: скользим вдоль сетки на уровне эшелонов, так
      // траектории и беспилотник читаются на просвет.
      {
        pos: new THREE.Vector3(-30, 3, 30),
        look: new THREE.Vector3(18, 0, -34),
      },
    ];

    const camPos = new THREE.Vector3();
    const camLook = new THREE.Vector3();
    const dronePos = new THREE.Vector3();
    const droneTangent = new THREE.Vector3();
    const droneLookTarget = new THREE.Vector3();

    /** Плавное значение прогресса — сглаживает рывки прокрутки. */
    let smoothProgress = 0;

    const clock = new THREE.Clock();
    let frameId = 0;
    let running = true;

    const render = () => {
      if (!running) return;

      const time = clock.getElapsedTime();
      const target = progressRef.current?.current ?? 0;

      // Догоняем целевой прогресс постепенно: камера должна плыть,
      // а не дёргаться вслед за каждым щелчком колеса мыши.
      smoothProgress += (target - smoothProgress) * 0.055;

      /* --- Камера --- */
      const seg = smoothProgress * (cameraPath.length - 1);
      const i = Math.min(Math.floor(seg), cameraPath.length - 2);
      const f = THREE.MathUtils.smoothstep(seg - i, 0, 1);

      camPos.lerpVectors(cameraPath[i].pos, cameraPath[i + 1].pos, f);
      camLook.lerpVectors(cameraPath[i].look, cameraPath[i + 1].look, f);

      // Едва заметное покачивание — сцена ощущается живой, снятой
      // с борта, а не отрендеренной на штативе.
      camera.position.set(
        camPos.x + Math.sin(time * 0.25) * 1.6,
        camPos.y + Math.cos(time * 0.19) * 1.1,
        camPos.z,
      );
      camera.lookAt(camLook);

      /* --- Содержимое --- */
      grid.setPhase(smoothProgress);
      grid.update(time);

      routes.setPhase(smoothProgress);
      routes.update(time);

      // Решётка очень медленно поворачивается — это не вращение
      // объекта, а ощущение движения наблюдателя внутри пространства.
      grid.group.rotation.y = smoothProgress * 0.24 + time * 0.008;
      routes.group.rotation.y = grid.group.rotation.y;

      /* --- Беспилотник ---
         Появляется вместе с маршрутами: до того, как пространство
         структурировано, согласованного полёта быть не может. */
      const droneVisible = THREE.MathUtils.smoothstep(
        smoothProgress,
        0.5,
        0.85,
      );
      drone.visible = droneVisible > 0.02;

      if (drone.visible) {
        const t = (time * 0.045) % 1;
        routes.sampleLead(t, dronePos);
        routes.sampleLeadTangent(t, droneTangent);

        dronePos.applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          routes.group.rotation.y,
        );
        droneTangent.applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          routes.group.rotation.y,
        );

        drone.position.copy(dronePos);
        droneLookTarget.copy(dronePos).add(droneTangent);
        drone.lookAt(droneLookTarget);

        // Крен в повороте — как у настоящего летательного аппарата.
        drone.rotateZ(Math.sin(time * 0.6) * 0.14);

        // Размер подобран так, чтобы аппарат читался силуэтом с той
        // дистанции, на которой стоит камера в финальной фазе.
        drone.scale.setScalar(1.9 * droneVisible);
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(render);
    };

    /* --- Реакция на изменение размера окна ------------------------------- */
    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    /* --- Экономия ресурсов -----------------------------------------------
       Пока вкладка скрыта, рисовать незачем — это заметно экономит
       батарею ноутбука и не греет процессор впустую. */
    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frameId);
      } else if (!reduceMotion) {
        running = true;
        clock.getDelta();
        frameId = requestAnimationFrame(render);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (reduceMotion) {
      // Анимации отключены в системе — показываем один статичный кадр
      // в собранном, упорядоченном состоянии.
      smoothProgress = 1;
      running = true;
      render();
      running = false;
      cancelAnimationFrame(frameId);
    } else {
      frameId = requestAnimationFrame(render);
    }

    /* --- Уборка при уходе со страницы ------------------------------------ */
    return () => {
      running = false;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);

      grid.dispose();
      routes.dispose();
      drone.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
          obj.geometry.dispose();
          const m = obj.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m.dispose();
        }
      });

      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [progressRef]);

  return <div ref={mountRef} className={`h-full w-full ${className}`} />;
}
