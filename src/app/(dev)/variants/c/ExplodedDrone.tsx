"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Аппарат в разрезе: узлы разлетаются по мере прокрутки.
 *
 * Модель собрана из четырёх групп — планер, полезная нагрузка, силовая
 * установка, связь. Каждая имеет собственное направление разлёта.
 * Активный узел подсвечивается, остальные приглушаются: внимание
 * ведётся по разделам сами собой.
 */

type PartGroup = {
  group: THREE.Group;
  /** Направление и дальность разлёта. */
  offset: THREE.Vector3;
  materials: THREE.MeshStandardMaterial[];
  lines: THREE.LineBasicMaterial[];
};

export default function ExplodedDrone({
  progressRef,
  activeIndex,
}: {
  progressRef: React.RefObject<{ value: number }>;
  activeIndex: number;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  /* Активный узел кладём в ref, чтобы цикл отрисовки читал его без
     пересоздания сцены. Присваивание идёт в эффекте, а не прямо в
     теле компонента: менять ref во время отрисовки нельзя. */
  const activeRef = useRef(activeIndex);
  useEffect(() => {
    activeRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x04070a, 0.016);

    const camera = new THREE.PerspectiveCamera(
      40,
      mount.clientWidth / mount.clientHeight,
      0.1,
      300,
    );
    camera.position.set(0, 2.5, 22);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x2f4453, 1.3));
    const key = new THREE.DirectionalLight(0xc4e4f2, 2.2);
    key.position.set(-10, 14, 12);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x4bc8e0, 1.5);
    rim.position.set(11, -4, -9);
    scene.add(rim);

    const root = new THREE.Group();
    scene.add(root);

    const bodyColor = 0x1c2a36;

    /** Создаёт группу узла: сама деталь плюс её светящийся контур. */
    const makePart = (
      geometry: THREE.BufferGeometry,
      offset: THREE.Vector3,
      position: THREE.Vector3,
      color = bodyColor,
    ): PartGroup => {
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.55,
        metalness: 0.75,
        flatShading: true,
      });
      const mesh = new THREE.Mesh(geometry, material);

      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x8fdcef,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry, 22),
        lineMaterial,
      );

      const group = new THREE.Group();
      group.add(mesh);
      group.add(outline);
      group.position.copy(position);
      root.add(group);

      return { group, offset, materials: [material], lines: [lineMaterial] };
    };

    /* --- Планер: треугольное крыло --- */
    const wingShape = new THREE.Shape();
    const span = 5.4;
    wingShape.moveTo(0, -4.2);
    wingShape.lineTo(span * 0.42, -2.4);
    wingShape.lineTo(span, 2.6);
    wingShape.lineTo(span * 0.6, 3.2);
    wingShape.lineTo(span * 0.18, 2.2);
    wingShape.lineTo(0, 2.7);
    wingShape.lineTo(-span * 0.18, 2.2);
    wingShape.lineTo(-span * 0.6, 3.2);
    wingShape.lineTo(-span, 2.6);
    wingShape.lineTo(-span * 0.42, -2.4);
    wingShape.closePath();

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
      depth: 0.5,
      bevelEnabled: true,
      bevelThickness: 0.14,
      bevelSize: 0.16,
      bevelSegments: 2,
    });
    wingGeo.rotateX(Math.PI / 2);
    wingGeo.center();

    const parts: PartGroup[] = [];

    // 0 — планер: остаётся на месте, остальные разлетаются от него
    parts.push(
      makePart(wingGeo, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)),
    );

    // 1 — полезная нагрузка: уходит вниз
    const payloadGeo = new THREE.SphereGeometry(0.62, 18, 14);
    parts.push(
      makePart(
        payloadGeo,
        new THREE.Vector3(0, -4.4, 0),
        new THREE.Vector3(0, -0.35, -2.4),
        0x101a24,
      ),
    );

    // 2 — силовая установка: два блока уходят вверх
    const powerGeo = new THREE.BoxGeometry(1.5, 0.55, 2.4);
    const powerLeft = makePart(
      powerGeo,
      new THREE.Vector3(-1.6, 4.2, 0),
      new THREE.Vector3(-1.9, 0.32, 0.6),
    );
    const powerRight = makePart(
      powerGeo,
      new THREE.Vector3(1.6, 4.2, 0),
      new THREE.Vector3(1.9, 0.32, 0.6),
    );
    parts.push(powerLeft);
    parts.push(powerRight);

    // 3 — связь и навигация: кили расходятся в стороны
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(1.3, 0);
    finShape.lineTo(0.85, 1.05);
    finShape.lineTo(0, 0.7);
    finShape.closePath();
    const finGeo = new THREE.ExtrudeGeometry(finShape, {
      depth: 0.12,
      bevelEnabled: false,
    });
    finGeo.center();
    finGeo.rotateY(Math.PI / 2);

    const finLeft = makePart(
      finGeo,
      new THREE.Vector3(-5.2, 1.4, 0),
      new THREE.Vector3(-4.4, 0.5, 1.8),
    );
    const finRight = makePart(
      finGeo,
      new THREE.Vector3(5.2, 1.4, 0),
      new THREE.Vector3(4.4, 0.5, 1.8),
    );
    parts.push(finLeft);
    parts.push(finRight);

    /** Какой узел к какому разделу относится. */
    const partSection = [0, 1, 2, 2, 3, 3];

    const home = parts.map((p) => p.group.position.clone());

    const clock = new THREE.Clock();
    let frameId = 0;
    let running = true;
    let smooth = 0;

    const render = () => {
      if (!running) return;
      const time = clock.getElapsedTime();
      const target = progressRef.current?.value ?? 0;
      smooth += (target - smooth) * 0.07;

      // Аппарат непрерывно поворачивается: прокрутка задаёт основной
      // разворот, плюс лёгкое собственное вращение.
      root.rotation.y = smooth * Math.PI * 1.15 + time * 0.06;
      root.rotation.x = 0.22 + Math.sin(time * 0.4) * 0.05;
      root.position.y = Math.sin(time * 0.6) * 0.3;

      /* Разлёт нарастает к середине прокрутки и частично собирается
         обратно к концу — узлы «дышат», а не просто расходятся. */
      const explode = Math.sin(smooth * Math.PI) * 0.85 + smooth * 0.35;

      parts.forEach((part, i) => {
        part.group.position.set(
          home[i].x + part.offset.x * explode,
          home[i].y + part.offset.y * explode,
          home[i].z + part.offset.z * explode,
        );

        // Активный раздел горит ярче, остальные приглушены.
        const isActive = partSection[i] === activeRef.current;
        const targetOpacity = isActive ? 0.95 : 0.22;
        for (const line of part.lines) {
          line.opacity += (targetOpacity - line.opacity) * 0.08;
        }
        for (const m of part.materials) {
          const targetEmissive = isActive ? 0.32 : 0.02;
          m.emissive.setHex(0x4bc8e0);
          m.emissiveIntensity += (targetEmissive - m.emissiveIntensity) * 0.08;
        }
      });

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
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

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
      render();
      running = false;
      cancelAnimationFrame(frameId);
    } else {
      frameId = requestAnimationFrame(render);
    }

    return () => {
      running = false;
      cancelAnimationFrame(frameId);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);

      root.traverse((obj) => {
        if (
          obj instanceof THREE.Mesh ||
          obj instanceof THREE.LineSegments
        ) {
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

  return <div ref={mountRef} className="h-full w-full" />;
}
