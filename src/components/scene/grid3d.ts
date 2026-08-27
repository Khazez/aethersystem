import * as THREE from "three";

/**
 * AETHER GRID — воздушное пространство как объёмная цифровая структура.
 *
 * Это главный визуальный образ сайта. В документе компании воздушное
 * пространство описано как сетка, где каждая ячейка содержит координаты,
 * высотный диапазон, статус, ограничения, загрузку и уровень риска.
 * Здесь этот образ показан буквально: решётка ячеек, висящая в темноте,
 * с эшелонами по высоте.
 *
 * Технически используется InstancedMesh — способ нарисовать тысячи
 * одинаковых объектов за одну команду видеокарте. Если создавать
 * каждую ячейку отдельным объектом, браузер задохнётся уже на сотне;
 * так их спокойно держится несколько тысяч.
 */

export type GridCellState = "idle" | "active" | "restricted";

export type AetherGrid = {
  group: THREE.Group;
  /** Плавно переводит сетку между состояниями сцены (0 → 1). */
  setPhase: (phase: number) => void;
  /** Покадровое обновление. */
  update: (time: number) => void;
  dispose: () => void;
};

/** Размеры решётки: по ширине, по глубине, по высоте (эшелоны). */
const COLS = 14;
const ROWS = 14;
const LEVELS = 4;

/** Шаг между центрами ячеек. */
const STEP = 6;
const LEVEL_STEP = 7;

export function createAetherGrid(): AetherGrid {
  const group = new THREE.Group();

  /* --- Ячейки ------------------------------------------------------------
     Каждая ячейка — куб, нарисованный только рёбрами. Сплошные кубы
     превратили бы сцену в мутную кашу; рёбра дают ощущение структуры,
     сквозь которую видно. */
  const cellGeometry = new THREE.BoxGeometry(
    STEP * 0.86,
    LEVEL_STEP * 0.5,
    STEP * 0.86,
  );
  const edges = new THREE.EdgesGeometry(cellGeometry);

  const cellMaterial = new THREE.LineBasicMaterial({
    color: 0x4bc8e0,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // InstancedMesh не работает с линиями, поэтому рёбра всех ячеек
  // объединяются в одну геометрию вручную — это тоже один вызов отрисовки.
  const positions: number[] = [];
  const colors: number[] = [];
  const cellCenters: THREE.Vector3[] = [];
  const cellStates: GridCellState[] = [];

  const edgePos = edges.getAttribute("position");

  /** Стабильный статус ячейки — одинаковый при каждой загрузке. */
  const stateFor = (index: number): GridCellState => {
    const h = (index * 2654435761) % 1000;
    if (h < 45) return "restricted";
    if (h < 210) return "active";
    return "idle";
  };

  const colorIdle = new THREE.Color(0x2c4a5a);
  const colorActive = new THREE.Color(0x4bc8e0);
  const colorRestricted = new THREE.Color(0xe0554f);

  let index = 0;
  for (let level = 0; level < LEVELS; level++) {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const state = stateFor(index);
        cellStates.push(state);

        const cx = (col - (COLS - 1) / 2) * STEP;
        const cy = (level - (LEVELS - 1) / 2) * LEVEL_STEP;
        const cz = (row - (ROWS - 1) / 2) * STEP;
        cellCenters.push(new THREE.Vector3(cx, cy, cz));

        const color =
          state === "restricted"
            ? colorRestricted
            : state === "active"
              ? colorActive
              : colorIdle;

        for (let v = 0; v < edgePos.count; v++) {
          positions.push(
            edgePos.getX(v) + cx,
            edgePos.getY(v) + cy,
            edgePos.getZ(v) + cz,
          );
          colors.push(color.r, color.g, color.b);
        }

        index++;
      }
    }
  }

  const gridGeometry = new THREE.BufferGeometry();
  gridGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  gridGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(colors, 3),
  );

  cellMaterial.vertexColors = true;
  const gridLines = new THREE.LineSegments(gridGeometry, cellMaterial);
  group.add(gridLines);

  cellGeometry.dispose();
  edges.dispose();

  /* --- Узлы: воздушные суда в ячейках ------------------------------------
     Светящиеся точки, отмечающие занятые ячейки. Здесь InstancedMesh
     уместен — это одинаковые сферы. */
  const nodeCount = Math.min(
    190,
    cellStates.filter((s) => s !== "idle").length,
  );

  const nodeGeometry = new THREE.SphereGeometry(0.26, 8, 6);
  const nodeMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const nodes = new THREE.InstancedMesh(
    nodeGeometry,
    nodeMaterial,
    nodeCount,
  );
  nodes.instanceColor = new THREE.InstancedBufferAttribute(
    new Float32Array(nodeCount * 3),
    3,
  );

  /** Исходные позиции узлов — от них считается «разлёт» в фазе хаоса. */
  const nodeHome: THREE.Vector3[] = [];
  const nodeScatter: THREE.Vector3[] = [];
  const nodePhase: number[] = [];

  const dummy = new THREE.Object3D();
  let placed = 0;

  for (let i = 0; i < cellStates.length && placed < nodeCount; i++) {
    if (cellStates[i] === "idle") continue;

    const home = cellCenters[i].clone();
    nodeHome.push(home);

    // Куда узел смещён, пока система разрознена: далеко и беспорядочно.
    const seed = (i * 9301 + 49297) % 233280;
    const r = seed / 233280;
    nodeScatter.push(
      new THREE.Vector3(
        home.x + (r - 0.5) * 120,
        home.y + (((seed >> 3) % 100) / 100 - 0.5) * 90,
        home.z + (((seed >> 7) % 100) / 100 - 0.5) * 120,
      ),
    );
    nodePhase.push(r * Math.PI * 2);

    const color =
      cellStates[i] === "restricted" ? colorRestricted : colorActive;
    nodes.setColorAt(placed, color);

    dummy.position.copy(home);
    dummy.updateMatrix();
    nodes.setMatrixAt(placed, dummy.matrix);

    placed++;
  }

  if (nodes.instanceColor) nodes.instanceColor.needsUpdate = true;
  nodes.instanceMatrix.needsUpdate = true;
  group.add(nodes);

  /* --- Состояние сцены --------------------------------------------------- */
  let phase = 0;

  const setPhase = (p: number) => {
    phase = THREE.MathUtils.clamp(p, 0, 1);
  };

  const update = (time: number) => {
    /* Фаза 0 — хаос: узлы разбросаны, сетки почти не видно.
       Фаза 1 — порядок: узлы в своих ячейках, сетка проявлена. */
    const order = THREE.MathUtils.smoothstep(phase, 0, 1);

    // Сетка проступает по мере наведения порядка.
    cellMaterial.opacity = 0.04 + order * 0.2;

    for (let i = 0; i < placed; i++) {
      const home = nodeHome[i];
      const scatter = nodeScatter[i];

      // Лёгкое покачивание — сцена должна дышать, а не стоять.
      const drift = Math.sin(time * 0.4 + nodePhase[i]) * 0.5;

      dummy.position.set(
        THREE.MathUtils.lerp(scatter.x, home.x, order),
        THREE.MathUtils.lerp(scatter.y, home.y, order) + drift,
        THREE.MathUtils.lerp(scatter.z, home.z, order),
      );

      // В хаосе узлы крупнее и тревожнее, в порядке — аккуратные точки.
      const scale = THREE.MathUtils.lerp(1.35, 1, order);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      nodes.setMatrixAt(i, dummy.matrix);
    }
    nodes.instanceMatrix.needsUpdate = true;
  };

  const dispose = () => {
    gridGeometry.dispose();
    cellMaterial.dispose();
    nodeGeometry.dispose();
    nodeMaterial.dispose();
  };

  return { group, setPhase, update, dispose };
}

/** Габариты решётки — нужны сцене, чтобы выставить камеру и туман. */
export const GRID_EXTENT = {
  width: COLS * STEP,
  depth: ROWS * STEP,
  height: LEVELS * LEVEL_STEP,
};
