import * as THREE from "three";

/**
 * Согласованные маршруты в объёмной сетке.
 *
 * Показывают работу UTM: по структурированному пространству проложены
 * траектории, по ним движутся воздушные суда. Пока система разрознена
 * (фаза 0), маршрутов нет — они проявляются вместе с порядком.
 *
 * Каждый маршрут рисуется дважды: тусклая линия всего пути и яркий
 * «бегунок» — короткий отрезок, идущий вдоль неё. Бегунок читается как
 * активное движение, а не как статичная схема.
 */

export type Routes = {
  group: THREE.Group;
  setPhase: (phase: number) => void;
  update: (time: number) => void;
  dispose: () => void;
  /** Точка на главном маршруте — по ней летит модель беспилотника. */
  sampleLead: (t: number, target: THREE.Vector3) => void;
  /** Направление движения в той же точке — чтобы развернуть модель. */
  sampleLeadTangent: (t: number, target: THREE.Vector3) => void;
};

const ROUTE_COUNT = 7;

export function createRoutes(extent: {
  width: number;
  depth: number;
  height: number;
}): Routes {
  const group = new THREE.Group();

  const curves: THREE.CatmullRomCurve3[] = [];
  const trails: THREE.Line[] = [];
  const runners: THREE.Mesh[] = [];
  const runnerSpeed: number[] = [];

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x4bc8e0,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const runnerGeometry = new THREE.SphereGeometry(0.62, 10, 8);

  for (let i = 0; i < ROUTE_COUNT; i++) {
    /* Маршрут строится из нескольких опорных точек, между которыми
       проводится плавная кривая. Точки берутся детерминированно —
       сцена должна быть одинаковой при каждой загрузке. */
    const seed = (i * 7919 + 104729) % 100000;
    const rnd = (n: number) => (((seed >> n) % 1000) / 1000 - 0.5) * 2;

    const startX = rnd(0) * extent.width * 0.5;
    const endX = rnd(3) * extent.width * 0.5;
    const level = rnd(5) * extent.height * 0.34;

    const points = [
      new THREE.Vector3(startX, level, -extent.depth * 0.62),
      new THREE.Vector3(
        startX + rnd(7) * 22,
        level + rnd(9) * 7,
        -extent.depth * 0.2,
      ),
      new THREE.Vector3(rnd(11) * 26, level + rnd(2) * 5, 0),
      new THREE.Vector3(
        endX + rnd(4) * 22,
        level + rnd(6) * 7,
        extent.depth * 0.2,
      ),
      new THREE.Vector3(endX, level, extent.depth * 0.62),
    ];

    const curve = new THREE.CatmullRomCurve3(points);
    curves.push(curve);

    const trail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(90)),
      lineMaterial,
    );
    group.add(trail);
    trails.push(trail);

    const runner = new THREE.Mesh(
      runnerGeometry,
      new THREE.MeshBasicMaterial({
        color: i === 0 ? 0x9fe8f6 : 0x4bc8e0,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    group.add(runner);
    runners.push(runner);
    runnerSpeed.push(0.05 + ((seed >> 8) % 100) / 1600);
  }

  let phase = 0;

  const setPhase = (p: number) => {
    phase = THREE.MathUtils.clamp(p, 0, 1);
  };

  const update = (time: number) => {
    // Маршруты появляются во второй половине перехода к порядку:
    // сначала пространство должно структурироваться, и только потом
    // по нему прокладываются согласованные траектории.
    const visible = THREE.MathUtils.smoothstep(phase, 0.45, 1);

    lineMaterial.opacity = visible * 0.62;

    for (let i = 0; i < runners.length; i++) {
      const t = (time * runnerSpeed[i] + i * 0.17) % 1;
      curves[i].getPointAt(t, runners[i].position);

      const material = runners[i].material as THREE.MeshBasicMaterial;
      material.opacity = visible * (i === 0 ? 1 : 0.75);

      const scale = 1 + Math.sin(time * 2.4 + i) * 0.14;
      runners[i].scale.setScalar(scale * visible);
    }
  };

  /** Положение на ведущем маршруте — для модели беспилотника. */
  const sampleLead = (t: number, target: THREE.Vector3) => {
    curves[0].getPointAt(THREE.MathUtils.clamp(t, 0, 1), target);
  };

  const sampleLeadTangent = (t: number, target: THREE.Vector3) => {
    curves[0].getTangentAt(THREE.MathUtils.clamp(t, 0, 1), target);
  };

  const dispose = () => {
    lineMaterial.dispose();
    runnerGeometry.dispose();
    for (const trail of trails) trail.geometry.dispose();
    for (const runner of runners)
      (runner.material as THREE.Material).dispose();
  };

  return {
    group,
    setPhase,
    update,
    dispose,
    sampleLead,
    sampleLeadTangent,
  };
}
