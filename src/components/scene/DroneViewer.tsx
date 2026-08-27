"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { createDrone } from "./drone";

/**
 * Осмотр беспилотного воздушного судна — интерактивная модель.
 *
 * Аппарат медленно вращается сам; его можно взять мышью и повернуть,
 * как настоящее изделие в руках. Это не декорация: платформа начинается
 * с Digital Identity — цифрового профиля конкретного аппарата, — и
 * осмотр модели буквально показывает объект, вокруг которого строится
 * весь цифровой контур.
 *
 * Рядом идёт формуляр: те самые поля цифрового профиля из описания
 * продукта (идентификатор, производитель, категория, статус).
 */
export default function DroneViewer({ className = "" }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      38,
      mount.clientWidth / mount.clientHeight,
      0.1,
      200,
    );
    camera.position.set(0, 3.4, 15);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    /* Освещение: холодный ключевой свет сверху-слева и контровой
       акцентного цвета сзади — он очерчивает силуэт на тёмном фоне. */
    scene.add(new THREE.AmbientLight(0x33485a, 1.4));

    const key = new THREE.DirectionalLight(0xc4e4f2, 2.1);
    key.position.set(-8, 12, 9);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x4bc8e0, 1.6);
    rim.position.set(9, -3, -8);
    scene.add(rim);

    const drone = createDrone();
    scene.add(drone);

    /* --- Управление вращением ------------------------------------------
       targetYaw/Pitch — куда модель должна повернуться, yaw/pitch — где
       она сейчас. Модель догоняет цель плавно, поэтому вращение мышью
       ощущается упругим, а не рывками. */
    let yaw = 0;
    let pitch = 0.18;
    let targetYaw = 0;
    let targetPitch = 0.18;

    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    /** Пока пользователь не трогал модель, она вращается сама. */
    let autoRotate = true;

    const canvas = renderer.domElement;
    canvas.style.touchAction = "none";
    canvas.style.cursor = "grab";

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      autoRotate = false;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
      setDragging(true);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      targetYaw += (e.clientX - lastX) * 0.008;
      // Наклон ограничен, иначе модель переворачивается вверх ногами.
      targetPitch = Math.max(
        -0.6,
        Math.min(0.9, targetPitch + (e.clientY - lastY) * 0.006),
      );
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onPointerUp = () => {
      isDragging = false;
      canvas.style.cursor = "grab";
      setDragging(false);
      // Через несколько секунд покоя модель снова начинает вращаться.
      window.setTimeout(() => {
        if (!isDragging) autoRotate = true;
      }, 2600);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    const clock = new THREE.Clock();
    let frameId = 0;
    let running = true;

    const render = () => {
      if (!running) return;
      const time = clock.getElapsedTime();

      if (autoRotate) targetYaw += 0.0032;

      yaw += (targetYaw - yaw) * 0.09;
      pitch += (targetPitch - pitch) * 0.09;

      drone.rotation.y = yaw;
      drone.rotation.x = pitch;
      // Едва заметное покачивание — аппарат «висит» в воздухе.
      drone.position.y = Math.sin(time * 0.7) * 0.22;
      drone.rotation.z = Math.sin(time * 0.5) * 0.05;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(render);
    };

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frameId);
      } else if (!reduceMotion) {
        running = true;
        frameId = requestAnimationFrame(render);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (reduceMotion) {
      running = true;
      render();
      running = false;
      cancelAnimationFrame(frameId);
    } else {
      frameId = requestAnimationFrame(render);
    }

    return () => {
      running = false;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);

      drone.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.LineSegments) {
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
  }, []);

  /** Поля цифрового профиля — из раздела Digital Identity описания. */
  const profile = [
    ["ИДЕНТИФИКАТОР", "KZ-UAS-04127"],
    ["КАТЕГОРИЯ", "FIXED WING · BVLOS"],
    ["ОПЕРАТОР", "ВЕРИФИЦИРОВАН"],
    ["РАЗРЕШЕНИЕ", "COMPLIANT"],
  ];

  return (
    <div className="relative">
      <div className={`relative ${className}`}>
        <div ref={mountRef} className="h-full w-full" />

        {/* Уголковые засечки — рамка технического осмотра */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {[
            "top-0 left-0 border-t border-l",
            "top-0 right-0 border-t border-r",
            "bottom-0 left-0 border-b border-l",
            "bottom-0 right-0 border-b border-r",
          ].map((pos) => (
            <span
              key={pos}
              className={`absolute h-4 w-4 border-accent/40 ${pos}`}
            />
          ))}
        </div>

        {/* Подсказка про взаимодействие */}
        <p
          className={`pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[0.5625rem] tracking-[0.18em] whitespace-nowrap uppercase transition-opacity duration-300 ${
            dragging ? "text-accent opacity-100" : "text-ink-faint opacity-80"
          }`}
        >
          {dragging ? "осмотр аппарата" : "потяните, чтобы повернуть"}
        </p>
      </div>

      {/* Формуляр цифрового профиля */}
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {profile.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-2">
            <dt className="hud-label text-[0.5rem]">{k}</dt>
            <dd className="font-mono text-[0.5625rem] tracking-[0.08em] text-accent">
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
