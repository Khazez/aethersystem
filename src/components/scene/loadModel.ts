import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

import type { Aircraft } from "./drones";

/**
 * Загрузка готовой 3D-модели аппарата вместо построенной кодом.
 *
 * Формат: **.glb** (или .gltf). Это стандарт для веба — модель, материалы
 * и текстуры лежат в одном файле, three.js читает его напрямую.
 * Форматы .fbx, .obj, .max, .blend напрямую не годятся: их нужно
 * сначала пересохранить в .glb (бесплатно это делает Blender:
 * File → Export → glTF 2.0).
 *
 * Куда класть файл: `public/models/drone.glb`.
 * После этого сцена подхватит его сама, без правок кода.
 * Если файла нет — используется модель, построенная кодом.
 *
 * ⚠️ ЛИЦЕНЗИЯ. Это госзаказ, поэтому модель нельзя брать откуда попало.
 * Годится только та, у которой в лицензии разрешено коммерческое
 * использование: CC0 ((общественное достояние), CC-BY (нужно указать
 * автора) или купленная. НЕ годится: «CC-BY-NC» (запрещено коммерческое
 * использование), «только для личных проектов», модели без указания
 * лицензии вообще. При проверке заказчиком за каждый материал нужно
 * уметь показать основание.
 */

/** Как модель встраивается в сцену: приведение размера и разворота. */
export type ModelFit = {
  /** Наибольший габарит модели после подгонки, в единицах сцены. */
  targetSize: number;
  /** Доворот вокруг вертикали, если нос модели смотрит не туда. */
  yaw?: number;
};

/**
 * Ищет в модели вращающиеся части по типовым именам узлов.
 * Экспортёры называют винты по-разному, поэтому проверяем несколько
 * вариантов и на разных языках.
 */
function findRotors(root: THREE.Object3D): THREE.Object3D[] {
  const names = [
    "propeller",
    "prop",
    "rotor",
    "blade",
    "airscrew",
    "винт",
    "лопаст",
  ];
  const found: THREE.Object3D[] = [];

  root.traverse((obj) => {
    const n = obj.name.toLowerCase();
    if (names.some((k) => n.includes(k))) found.push(obj);
  });

  return found;
}

/**
 * Приводит модель к нужному размеру и ставит её центр в начало координат.
 * Без этого модель может оказаться размером с дом или с песчинку —
 * единицы измерения у разных авторов свои.
 */
function fitModel(model: THREE.Object3D, fit: ModelFit) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const largest = Math.max(size.x, size.y, size.z) || 1;
  const scale = fit.targetSize / largest;

  model.scale.setScalar(scale);
  // Сдвигаем так, чтобы центр модели совпал с началом координат.
  model.position.set(
    -center.x * scale,
    -center.y * scale,
    -center.z * scale,
  );
}

/**
 * Пытается загрузить модель. Возвращает null, если файла нет —
 * это не ошибка, а штатный случай: значит, работаем с моделью из кода.
 */
export async function loadAircraftModel(
  url: string,
  fit: ModelFit,
): Promise<Aircraft | null> {
  /* Раньше здесь стоял предварительный запрос HEAD — «есть ли файл» —
     чтобы отсутствующая модель не сорила в консоли ошибками сети.
     Убран 25.08.2026: замер на живом сайте показал, что эта проверка
     стоит около двух секунд чистого ожидания, потому что загрузка
     начинается только после её ответа. А аппарата в небе всё это время
     нет — заглушку из кода мы убрали намеренно.

     Отсутствие файла и так обработано ниже: `loadAsync` бросает
     исключение, мы возвращаем null и остаёмся с моделью из кода.
     Единственная плата — одна строка в консоли браузера, когда файла
     действительно нет. Проверки это учитывают (см. `isExpected`
     в `scripts/scene-test.mjs`). */
  const loader = new GLTFLoader();

  /* Многие модели сжаты алгоритмом Draco. Декодер подключаем с локальной
     копии, а не с чужого CDN: на госсайте внешние загрузки могут быть
     заблокированы фильтрацией, да и зависеть от чужого сервера нельзя. */
  const draco = new DRACOLoader();
  draco.setDecoderPath("/draco/");
  loader.setDRACOLoader(draco);

  let gltf;
  try {
    gltf = await loader.loadAsync(url);
  } catch (e) {
    console.warn("[Aether] модель не загрузилась, работаем с моделью из кода:", e);
    draco.dispose();
    return null;
  }

  const group = new THREE.Group();
  const model = gltf.scene;

  fitModel(model, fit);
  if (fit.yaw) model.rotation.y = fit.yaw;

  model.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      // Модели часто приходят с отключённым отсечением — на дальних
      // планах это лишняя работа для видеокарты.
      obj.frustumCulled = true;
      const mat = obj.material as THREE.MeshStandardMaterial;
      // Отражения окружения сцены применяются и к загруженной модели.
      if (mat && "envMapIntensity" in mat) mat.envMapIntensity = 1.15;
    }
  });

  const wrapper = new THREE.Group();
  wrapper.add(model);
  group.add(wrapper);

  const rotors = findRotors(model);

  return {
    group,
    update: () => {
      // Если у модели нашлись винты — крутим их.
      for (const r of rotors) r.rotation.y += 1.2;
    },
    dispose: () => {
      model.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          const m = obj.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m?.dispose();
        }
      });
      draco.dispose();
    },
  };
}
