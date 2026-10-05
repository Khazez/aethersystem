import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Город под маршрутом: вторая среда полёта после облаков.
 *
 * Зачем нужна смена среды: если облака стоят от первого экрана до
 * последнего, картинка не меняется и кажется, что аппарат висит на
 * месте. Смена показывает, что он действительно долетел.
 *
 * ── Фасады ───────────────────────────────────────────────────────
 *
 * Здесь настоящие фотограмметрические материалы, а не нарисованная
 * кодом сетка окон. Полный набор карт на каждый фасад: цвет, нормали
 * (рельеф простенков и рам), шероховатость и металличность (стекло
 * зеркальное, кирпич матовый).
 *
 * Два типа застройки, как в настоящем городе:
 *   glass — современная навесная стеклянная стена;
 *   brick — кирпичная застройка средней этажности.
 *
 * ЛИЦЕНЗИЯ: обе текстуры с ambientCG, **CC0 1.0 Universal** —
 * общественное достояние. Коммерческое использование без ограничений,
 * указание автора не требуется. Проверено по docs.ambientcg.com/license
 * перед загрузкой. Файлы лежат в репозитории (`public/textures/city/`),
 * от внешних сервисов сайт не зависит.
 *
 * Исходники 1024×1024 уменьшены до 512 и пережаты
 * (`scripts/shrink-textures.mjs`): 4,4 МБ → 328 КБ. Здания видны
 * с расстояния полёта, а фасад повторяется каждые несколько метров —
 * разрешение выше 512 там не читается, только весит.
 *
 * ── Геометрия ────────────────────────────────────────────────────
 *
 * Стены здания — четырёхгранная труба без крышек. Так фасад
 * непрерывно оборачивает дом, а на крыше не оказывается окон: крыша
 * кладётся отдельной плоскостью со своим материалом. Камера пролетает
 * прямо над крышами, и окна на них сразу выдали бы подделку.
 *
 * ── Производительность ───────────────────────────────────────────
 *
 * Здания одного типа сливаются в общую геометрию (mergeGeometries).
 * Весь город — четыре вызова отрисовки: стекло, кирпич, детали, земля.
 */

export type Cityscape = {
  group: THREE.Group;
  update: (time: number) => void;
  dispose: () => void;
};

/** Сколько зданий в городе. */
const BUILDING_COUNT = 190;

/** Сколько мировых единиц приходится на одну плитку фасада. */
const FACADE_TILE = 11;

/* ------------------------------------------------------------------ */
/*  Материалы                                                          */
/* ------------------------------------------------------------------ */

type MapSet = {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
  metalnessMap: THREE.Texture;
};

function loadMapSet(loader: THREE.TextureLoader, base: string): MapSet {
  const make = (kind: string, srgb = false) => {
    const t = loader.load(`/textures/city/${base}-${kind}.jpg`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    // Масштаб плитки уже вшит в UV геометрии, поэтому repeat не трогаем.
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  return {
    map: make("color", true),
    normalMap: make("normal"),
    roughnessMap: make("rough"),
    metalnessMap: make("metal"),
  };
}

/* ------------------------------------------------------------------ */
/*  Геометрия здания                                                   */
/* ------------------------------------------------------------------ */

/**
 * Стены здания: четырёхгранная труба без крышек.
 *
 * Фасад оборачивает дом непрерывно, шов приходится на угол и не виден.
 * UV домножаются на реальные размеры, поэтому окно на башне в 160 м
 * такое же, как на доме в 40 м, а не растянуто на всю стену.
 */
function makeWalls(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  yaw: number,
): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 4, 1, true);
  // Грани трубы по умолчанию смотрят по диагоналям — доворачиваем.
  geo.rotateY(Math.PI / 4);
  geo.scale(w * Math.SQRT2, h, d * Math.SQRT2);

  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const perimeter = 2 * (w + d);
  const su = perimeter / FACADE_TILE;
  const sv = h / FACADE_TILE;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  }
  uv.needsUpdate = true;

  geo.rotateY(yaw);
  geo.translate(x, y, z);
  return geo;
}

/** Плоская деталь: крыша, парапет, надстройка. */
function makeBox(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  yaw: number,
): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.rotateY(yaw);
  geo.translate(x, y, z);
  return geo;
}

/* ------------------------------------------------------------------ */
/*  Город                                                              */
/* ------------------------------------------------------------------ */

export function createCityscape(opts: {
  zFrom: number;
  zTo: number;
  /** Уровень крыш основной застройки. */
  roofLevel: number;
}): Cityscape {
  const { zFrom, zTo, roofLevel } = opts;
  const group = new THREE.Group();
  const disposables: Array<
    THREE.BufferGeometry | THREE.Material | THREE.Texture
  > = [];

  const loader = new THREE.TextureLoader();
  const glassMaps = loadMapSet(loader, "glass");
  const brickMaps = loadMapSet(loader, "brick");
  [glassMaps, brickMaps].forEach((set) =>
    Object.values(set).forEach((t) => disposables.push(t)),
  );

  /* Отражение неба приглушено до 0.85: при 1.35 стеклянные башни
     бликовали до белизны, и сам фасад переставал читаться. */
  const glassMat = new THREE.MeshStandardMaterial({
    ...glassMaps,
    envMapIntensity: 0.85,
    normalScale: new THREE.Vector2(0.8, 0.8),
  });
  const brickMat = new THREE.MeshStandardMaterial({
    ...brickMaps,
    envMapIntensity: 0.85,
    normalScale: new THREE.Vector2(1, 1),
  });

  /* Крыши и парапеты. Тёмные намеренно: настоящая кровля — это битум,
     гравий и оборудование, а не белый бетон. Светлые крыши с высоты
     выглядели снегом и забивали фасады, ради которых всё делалось. */
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x3c434a,
    roughness: 0.96,
    metalness: 0.06,
    envMapIntensity: 0.5,
  });
  disposables.push(glassMat, brickMat, trimMat);

  const glassParts: THREE.BufferGeometry[] = [];
  const brickParts: THREE.BufferGeometry[] = [];
  const trimParts: THREE.BufferGeometry[] = [];

  const depth = Math.abs(zTo - zFrom);

  for (let i = 0; i < BUILDING_COUNT; i++) {
    const x = (Math.random() - 0.5) * 660;
    const z = zFrom - Math.random() * depth;
    const yaw = (Math.random() - 0.5) * 0.55;

    // Стеклянные — башни повыше, кирпичные — застройка пониже.
    const isGlass = Math.random() > 0.42;
    const target = isGlass ? glassParts : brickParts;

    const kind = Math.random();
    let w = 18 + Math.random() * 26;
    let d = 18 + Math.random() * 26;

    if (isGlass && kind > 0.72) {
      /* Ступенчатая башня из трёх уменьшающихся секций: ровные
         параллелепипеды одной высоты читаются как забор. */
      let h = 54 + Math.random() * 48;
      let top = roofLevel;

      for (let s = 0; s < 3; s++) {
        target.push(makeWalls(w, h, d, x, top - h / 2, z, yaw));
        trimParts.push(makeBox(w + 1.4, 1.4, d + 1.4, x, top + 0.7, z, yaw));
        trimParts.push(makeBox(w, 0.6, d, x, top, z, yaw)); // крыша секции

        top -= h;
        h *= 0.72;
        w *= 0.74;
        d *= 0.74;
      }

      const mast = new THREE.CylinderGeometry(0.35, 0.55, 18, 6);
      mast.translate(x, roofLevel + 9, z);
      trimParts.push(mast);
    } else if (kind > 0.6) {
      // Плоская пластина: широкая и невысокая.
      w = 40 + Math.random() * 46;
      d = 16 + Math.random() * 14;
      const h = 26 + Math.random() * 32;
      target.push(makeWalls(w, h, d, x, roofLevel - h / 2, z, yaw));
      trimParts.push(makeBox(w + 1.4, 1.4, d + 1.4, x, roofLevel + 0.7, z, yaw));
      trimParts.push(makeBox(w, 0.6, d, x, roofLevel, z, yaw));
    } else {
      // Обычная башня.
      const h = isGlass ? 60 + Math.random() * 96 : 34 + Math.random() * 52;
      target.push(makeWalls(w, h, d, x, roofLevel - h / 2, z, yaw));
      trimParts.push(makeBox(w + 1.4, 1.4, d + 1.4, x, roofLevel + 0.7, z, yaw));
      trimParts.push(makeBox(w, 0.6, d, x, roofLevel, z, yaw));

      // Надстройки на крыше: выход лестницы, вентиляция.
      const boxes = 1 + Math.floor(Math.random() * 3);
      for (let b = 0; b < boxes; b++) {
        const bw = 3 + Math.random() * 6;
        const bh = 2 + Math.random() * 5;
        trimParts.push(
          makeBox(
            bw,
            bh,
            bw,
            x + (Math.random() - 0.5) * w * 0.5,
            roofLevel + bh / 2 + 1,
            z + (Math.random() - 0.5) * d * 0.5,
            yaw,
          ),
        );
      }
    }
  }

  /* Слияние: город рисуется за четыре вызова вместо шестисот. */
  const add = (parts: THREE.BufferGeometry[], mat: THREE.Material) => {
    if (parts.length === 0) return;
    const merged = mergeGeometries(parts, false);
    parts.forEach((g) => g.dispose());
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.frustumCulled = false;
    group.add(mesh);
    disposables.push(merged);
  };

  add(glassParts, glassMat);
  add(brickParts, brickMat);
  add(trimParts, trimMat);

  /* --- Земля: без неё город висит в пустоте --- */
  const groundGeo = new THREE.PlaneGeometry(2600, depth + 900);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x6b757e,
    roughness: 0.96,
    metalness: 0.04,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, roofLevel - 190, zFrom - depth / 2);
  group.add(ground);
  disposables.push(groundGeo, groundMat);

  return {
    group,
    update: () => {
      /* Город неподвижен: движение создаёт пролетающая мимо камера.
         Пустой метод оставлен, чтобы вызывающий код не разбирался,
         у какой среды покадровое обновление есть, а у какой нет. */
    },
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}
