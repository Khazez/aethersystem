"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

import { createQuadDrone, createVertiport } from "@/components/scene/drones";
import { createCityscape } from "@/components/scene/city";
import { loadAircraftModel } from "@/components/scene/loadModel";
import { isSceneEnabled, readQuality } from "@/components/scene/quality";

/**
 * Фон всей главной страницы: аппарат летит сквозь облака.
 *
 * Отличие от обычной сцены в секции: холст закреплён на весь экран
 * (position: fixed) и живёт под всей страницей. Поэтому полёт идёт
 * от первого экрана до последнего блока — прокрутка ведёт аппарат
 * через всё содержание, а не только внутри одной секции.
 *
 * Аппарат виден и работает сразу при открытии: винты крутятся, огни
 * мигают, аппарат покачивается — ещё до того, как тронули прокрутку.
 * Прокрутка добавляет к этому продвижение вперёд по коридору.
 *
 * Облака построены кодом: текстура рисуется на canvas при запуске.
 * Ни одного скачанного файла — для госзаказа права на материалы
 * должны быть чистыми, а вес остаётся в килобайтах.
 */

/** Длина облачного коридора в единицах сцены. */
const CORRIDOR = 2600;

/* Сколько облачных клубов расставлять — решает профиль качества
   (`scene/quality.ts`): на телефоне их втрое меньше. Облака
   полупрозрачные и лежат друг на друге, поэтому каждая точка экрана
   закрашивается по многу раз — на мобильном видеочипе это самая
   дорогая часть кадра. */

/* Границы сред вдоль маршрута. Полёт начинается в облаках, затем они
   расходятся и внизу открывается город. Если облака стоят от первого
   экрана до последнего, картинка не меняется и кажется, что аппарат
   висит на месте. */
const CLOUDS_TO = -1500;
const CITY_FROM = -1150;
const CITY_TO = -2750;
/** Уровень крыш: город проходит заметно ниже маршрута. */
const ROOF_LEVEL = -62;

/** Рисует текстуру облака: несколько мягких пятен со случайным смещением. */
function makeCloudTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);

  for (let i = 0; i < 22; i++) {
    const x = size / 2 + (Math.random() - 0.5) * size * 0.58;
    const y = size / 2 + (Math.random() - 0.5) * size * 0.44;
    const r = size * (0.09 + Math.random() * 0.19);

    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,0.26)");
    g.addColorStop(0.55, "rgba(255,255,255,0.09)");
    g.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}


/**
 * Карта окружения: панорама неба с облачным слоем и мягким солнцем.
 *
 * Зачем она нужна: без отражений окружения корпус освещается только
 * лампами сцены и выглядит нарисованным. Отражения дают материалу
 * «где он находится» — именно это отличает съёмку от мультика.
 * Рисуется кодом, файлов не требует.
 */
function makeEnvTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;

  /* Дневное небо. Ночная схема прятала отсутствие детализации, но и
     сама выглядела глухо: в темноте не читались ни фасады, ни аппарат.
     Днём всё видно — и требования к качеству геометрии выше. */
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#2f6ea8"); // зенит
  sky.addColorStop(0.34, "#7fa9cd"); // небо
  sky.addColorStop(0.5, "#c3d5e3"); // дымка у горизонта
  sky.addColorStop(0.56, "#b9c4cc"); // горизонт
  sky.addColorStop(1, "#5f6a72"); // земля внизу
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Облачная гряда у горизонта — отражается в стекле фасадов.
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * w;
    const y = h * (0.3 + Math.random() * 0.16);
    const r = h * (0.05 + Math.random() * 0.1);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,0.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Солнце. Мягкое: жёсткое давало выжженное пятно на корпусе.
  const sun = ctx.createRadialGradient(
    w * 0.26,
    h * 0.22,
    0,
    w * 0.26,
    h * 0.22,
    h * 0.4,
  );
  sun.addColorStop(0, "rgba(255,247,225,0.75)");
  sun.addColorStop(0.35, "rgba(255,247,225,0.22)");
  sun.addColorStop(1, "rgba(255,247,225,0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Небо как фон сцены.
 *
 * Отдельная текстура от той, что даёт отражения. Причина: в отражениях
 * небо должно быть ярким, иначе стекло фасадов выглядит грязным. А как
 * фон яркое небо не годится — сайт тёмный, и белый текст на светлом
 * поле не читается.
 *
 * Здесь небо приглушено к зениту и светлеет к горизонту — так снимают
 * с поляризационным фильтром и так выглядит небо с высоты. День
 * очевиден, но верх кадра остаётся тёмным под текст.
 */
function makeSkyTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 256;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#080e14"); // зенит — почти чёрный
  g.addColorStop(0.3, "#14252f"); // верх неба
  g.addColorStop(0.46, "#33566b"); // небо
  g.addColorStop(0.54, "#8ba7ba"); // дымка у горизонта
  g.addColorStop(0.62, "#5f7382"); // за горизонтом
  g.addColorStop(1, "#1b242b"); // земля вдали
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * План съёмки: где стоит камера относительно аппарата, куда смотрит
 * и какой у неё угол обзора.
 *
 * Раньше камера всю дорогу висела в одной точке позади аппарата —
 * менялся только фон, и полёт читался как «дрон гуляет на месте».
 * Теперь каждый участок прокрутки — свой план, как в монтаже.
 */
type Shot = {
  name: string;
  /** Смещение камеры относительно аппарата. */
  offset: [number, number, number];
  /** Точка взгляда — тоже относительно аппарата. */
  look: [number, number, number];
  fov: number;
  /** Доворот камеры в радианах: уводит аппарат от центра кадра.
      Положительное значение смещает его вправо — туда, где на странице
      нет текста. Доворот надёжнее смещения точки взгляда: он работает
      в системе координат камеры и не зависит от её положения. */
  frame: number;
};

/* Аппарат летит в сторону -Z, значит «позади» — это +Z. */
/* Соотношение сторон, под которое подбирались планы съёмки.
   Все `fov` и `frame` ниже осмысленны именно при нём. */
const SHOT_ASPECT = 16 / 9;

/** Предел вертикального угла: шире — заметное искажение перспективы. */
const MAX_FOV = 66;

/**
 * Подгонка угла обзора под вертикальный экран.
 *
 * `fov` у камеры — угол по ВЕРТИКАЛИ, а по горизонтали он получается
 * умножением на соотношение сторон. На мониторе 16:9 это расширяет
 * кадр, на телефоне 9:19 — наоборот, сужает вдвое с лишним. Планы,
 * снятые для монитора, на телефоне режут аппарат краем кадра.
 *
 * Полная компенсация (сохранить горизонтальный угол как на мониторе)
 * даёт около 105° по вертикали — это уже рыбий глаз. Поэтому проходим
 * лишь часть пути и упираемся в предел.
 */
function fitFov(fov: number, aspect: number): number {
  if (aspect >= SHOT_ASPECT) return fov;
  const half = THREE.MathUtils.degToRad(fov) / 2;
  const hHalf = Math.atan(Math.tan(half) * SHOT_ASPECT);
  const wanted =
    2 * THREE.MathUtils.radToDeg(Math.atan(Math.tan(hHalf) / aspect));
  return Math.min(MAX_FOV, fov + (wanted - fov) * 0.35);
}

/**
 * Насколько сохранять доворот кадра.
 *
 * Доворот отводит аппарат вбок, освобождая место под текстовую колонку
 * слева. На вертикальном экране колонки нет — текст лежит во всю
 * ширину поверх сцены, — а доворот выносит аппарат за край. Поэтому на
 * узком кадре он ослабляется пропорционально: аппарат встаёт ближе к
 * середине, но не строго по центру (это выглядело бы как каталожный
 * снимок, а не как кадр из полёта).
 */
function frameScale(aspect: number): number {
  if (aspect >= SHOT_ASPECT) return 1;
  return Math.max(0.15, aspect / SHOT_ASPECT);
}

/**
 * Насколько поднять аппарат в кадре на вертикальном экране.
 *
 * На мониторе текст занимает левую колонку, а аппарат отведён вправо
 * доворотом кадра — они не пересекаются. На телефоне колонки нет: текст
 * лежит во всю ширину, и ослабленный доворот (см. `frameScale`) сводит
 * аппарат ровно на строки.
 *
 * Разводим их по вертикали вместо горизонтали: камера смотрит НИЖЕ
 * аппарата, и он поднимается в верхнюю часть кадра, над текстом.
 *
 * Величина считается в единицах сцены от того, какой кусок мира
 * попадает в кадр на этом расстоянии: `2 * d * tan(fov / 2)` — полная
 * высота кадра, берём от неё пятую часть. Поэтому смещение одинаково
 * выглядит и на общем плане, и на крупном.
 */
function portraitLift(
  aspect: number,
  fovDeg: number,
  distance: number,
): number {
  if (aspect >= SHOT_ASPECT) return 0;
  const frameH = 2 * distance * Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2);
  /* Чем уже кадр, тем сильнее развод. Доля 0.3 подобрана по снимкам
     экрана: при 0.2 аппарат ложился на заголовок, при 0.4 уходил под
     шапку сайта. */
  const k = 1 - aspect / SHOT_ASPECT;
  return frameH * 0.3 * k;
}

const SHOTS: Shot[] = [
  // 1. Общий сзади-сбоку. Слева заголовок — аппарат уводим вправо.
  { name: "обзорный", offset: [-16, 6, 44], look: [0, 0, -8], fov: 50, frame: 0.3 },
  // 2. Верхний: аппарат идёт над облачным слоем.
  { name: "верхний", offset: [-10, 34, 30], look: [0, -6, -8], fov: 52, frame: 0.26 },
  // 3. Крупный: видно подвес камеры, винты, опоры.
  { name: "крупный", offset: [-12, 4, 26], look: [0, 0, -2], fov: 40, frame: 0.34 },
  // 4. Встречный: камера впереди, аппарат идёт на зрителя.
  { name: "встречный", offset: [6, 3, -40], look: [0, 0, 16], fov: 46, frame: -0.16 },
  // 5. Профиль: аппарат пересекает кадр сбоку.
  { name: "профиль", offset: [40, 3, 4], look: [0, 0, 0], fov: 42, frame: 0.1 },

  /* Последние два плана — снижение. Оба сзади и сверху: камера впереди
     аппарата здесь недопустима, там стоит посадочная площадка, и камера
     оказывалась бы внутри неё. */
  { name: "заход", offset: [-34, 26, 60], look: [0, -12, -10], fov: 50, frame: 0.22 },
  { name: "посадочный", offset: [-40, 22, 74], look: [0, -10, -8], fov: 46, frame: 0.2 },
];

/** Плавная ступенька: разгон и торможение без рывков на краях. */
function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/**
 * Финальная обработка кадра: виньетка и зерно.
 *
 * Оба приёма — из киносъёмки. Виньетка притемняет углы, собирая взгляд
 * к центру. Зерно добавляет едва заметный шум: идеально чистый градиент
 * выдаёт компьютерную картинку, лёгкий шум читается как плёнка.
 * Значения намеренно малы — это госзаказ, эффект не должен бросаться
 * в глаза.
 */
const FinishShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uVignette: { value: 1.05 },
    uGrain: { value: 0.032 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uVignette;
    uniform float uGrain;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // Виньетка: расстояние от центра кадра.
      vec2 d = vUv - 0.5;
      float vig = smoothstep(0.85, 0.28, length(d) * uVignette);
      color.rgb *= mix(0.72, 1.0, vig);

      // Зерно: псевдослучайный шум, меняющийся во времени.
      float n = fract(sin(dot(vUv * uTime, vec2(12.9898, 78.233))) * 43758.5453);
      color.rgb += (n - 0.5) * uGrain;

      gl_FragColor = color;
    }
  `,
};

export default function FlightBackdrop() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    /* Ограниченное движение или отсутствие трёхмерной графики — фона
       нет. Ширина экрана больше ни на что не влияет: на телефоне сцена
       работает, просто в облегчённом виде. Содержание страницы от фона
       не зависит в любом случае — оно самостоятельное. */
    if (!isSceneEnabled()) return;

    /** Настройки под устройство: телефон получает облегчённый набор. */
    const q = readQuality();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: q.antialias,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }

    const scene = new THREE.Scene();
    // Туман прячет дальний край коридора: облака уходят в дымку,
    // а не обрываются стеной.
    // Дневная дымка: светлая, а не чёрная.
    // Дымка лёгкая: плотная съедала и облака, и детали города.
    scene.fog = new THREE.FogExp2(0x8ea7ba, 0.00034);

    const camera = new THREE.PerspectiveCamera(
      58,
      window.innerWidth / window.innerHeight,
      0.1,
      3000,
    );

    /* Предел плотности точек. У телефона она доходит до 3 — без
       предела кадр стоил бы вшестеро дороже, чем на мониторе. */
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, q.maxPixelRatio));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    /* Плёночная тональная компрессия. Без неё яркие места выбиваются
       в плоское белое пятно, а картинка выглядит «компьютерной». ACES —
       стандарт кинопроизводства, он сжимает света мягко. */
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;

    mount.appendChild(renderer.domElement);

    /* --- Небо ---------------------------------------------------------
       Настоящий снимок неба (HDR-панорама) вместо нарисованного
       градиента. Он делает сразу две вещи: даёт фон с настоящими
       облаками и освещает всю сцену — фасады, аппарат, площадку.

       Освещение снимком (image-based lighting) — то, чем сцена
       отличается от «компьютерной картинки»: свет приходит со всех
       сторон неба, как в жизни, а не от двух-трёх ламп.

       Источник: Poly Haven, лицензия **CC0** (общественное достояние),
       коммерческое использование разрешено, указание автора не
       требуется. Проверено на polyhaven.com/license перед загрузкой.
       Файл лежит в репозитории — от внешнего сервиса сайт не зависит.

       До загрузки (1,4 МБ) работает нарисованный запасной вариант,
       чтобы экран не пустовал. */
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    const envSource = makeEnvTexture();
    const envTarget = pmrem.fromEquirectangular(envSource);
    scene.environment = envTarget.texture;

    const skySource = makeSkyTexture();
    scene.background = skySource;

    let realSky: THREE.Texture | null = null;
    let realEnv: THREE.WebGLRenderTarget | null = null;

    new RGBELoader().load(
      "/textures/sky/sky.hdr",
      (hdr) => {
        hdr.mapping = THREE.EquirectangularReflectionMapping;
        realSky = hdr;
        realEnv = pmrem.fromEquirectangular(hdr);
        scene.background = hdr;
        scene.environment = realEnv.texture;
        /* Приглушение фона. Сначала стояло 0.34 — снимок неба тонул,
           и разницы с прежним нарисованным фоном не было видно вовсе.
           0.85 показывает настоящие облака; читаемость текста держат
           градиенты поверх сцены, а не глухое затемнение всего кадра. */
        scene.backgroundIntensity = 0.85;
      },
      undefined,
      () => {
        /* Небо не загрузилось — остаёмся с нарисованным. Это не
           поломка: содержание страницы от фона не зависит. */
      },
    );

    /* Свет собран как на съёмке: тёплый рисующий сверху-слева, холодный
       заполняющий от облаков снизу и белый контровой сзади, чтобы
       отделить тёмный корпус от тёмного фона.

       Прежняя бирюзовая лампа в 0x4bc8e0 красила весь аппарат в
       мультяшный цвет — убрана. Оттенок остался только у ходовых огней,
       где он оправдан. */
    /* Постобработка. Сама сцена рисуется не на экран, а в буфер,
       затем к ней применяются свечение, виньетка и зерно. Без этого
       слоя веб-сцена выглядит сырой — свет не «переливается» через
       края ярких мест, а картинка остаётся стерильной. */
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    /* Затенение в углублениях (GTAO) пробовали и убрали.
       Замер: 1,8 кадр/с без него против 0,7 с ним — эффект утраивает
       стоимость кадра. Картинку он улучшает заметно, но фоновая сцена
       не может стоить столько: сайт должен открываться и на слабом
       офисном ноутбуке. Если понадобится — включать только на мощных
       машинах, по отдельной проверке производительности. */


    /* Свечение только на действительно ярких местах: ходовые огни и
       кромки облаков на солнце. Порог 0.72 — ниже него ничего не
       светится, иначе засветится весь кадр. */
    /* На телефоне свечение выключено: это отдельные проходы отрисовки
       в уменьшенные буферы, и отнимают они больше, чем добавляют. */
    const bloom = q.bloom
      ? new UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          0.2, // сила
          0.8, // радиус
          0.9, // порог яркости — ниже него ничего не светится
        )
      : null;
    if (bloom) composer.addPass(bloom);

    const finish = new ShaderPass(FinishShader);
    composer.addPass(finish);

    // Переводит результат в пространство экрана с учётом тональной
    // компрессии. Без него цвета уедут.
    composer.addPass(new OutputPass());

    /* Дневная схема света: яркое солнце сверху-слева, холодный
       заполняющий от неба, слабый контровой. */
    scene.add(new THREE.AmbientLight(0x8fa8bd, 1.5));

    const keyLight = new THREE.DirectionalLight(0xfff4e2, 2.6);
    keyLight.position.set(-40, 55, 25);
    scene.add(keyLight);

    // Отражённый свет неба снизу.
    const fillLight = new THREE.DirectionalLight(0xa8c4da, 1.1);
    fillLight.position.set(25, -35, 10);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.9);
    rimLight.position.set(20, 12, -55);
    scene.add(rimLight);

    /* --- Облака ------------------------------------------------------- */
    const cloudTexture = makeCloudTexture();
    const clouds: THREE.Sprite[] = [];
    const cloudSpin: number[] = [];

    for (let i = 0; i < q.cloudCount; i++) {
      const material = new THREE.SpriteMaterial({
        map: cloudTexture,
        transparent: true,
        depthWrite: false,
        fog: true,
        // Днём облака светлые, с лёгким холодным подтоном в тенях.
        color: new THREE.Color().setHSL(
          0.56 + Math.random() * 0.04,
          0.1,
          0.82 + Math.random() * 0.16,
        ),
        opacity: 0.34 + Math.random() * 0.36,
      });

      const sprite = new THREE.Sprite(material);
      const scale = 100 + Math.random() * 200;
      sprite.scale.set(scale, scale * (0.6 + Math.random() * 0.3), 1);
      /* Облака лежат СЛОЕМ ПОД маршрутом, а не вокруг него.
         Раньше камера летела внутри облаков: они закрывали небо
         целиком, и настоящая панорама была не видна вовсе — сцена
         выглядела так же, как со старым нарисованным фоном.
         Теперь аппарат идёт над облачным полем: сверху настоящее
         небо, снизу кромка облаков. Так и снимают с высоты.

         Облака занимают только начало маршрута и к концу расходятся —
         дальше внизу открывается город. */
      const t = Math.random();
      sprite.position.set(
        (Math.random() - 0.5) * 620,
        -34 - Math.random() * 150,
        60 + t * (CLOUDS_TO - 60),
      );
      // К дальнему краю облачность редеет, а не обрывается стеной.
      material.opacity *= 1 - t * 0.45;

      cloudSpin.push((Math.random() - 0.5) * 0.12);
      scene.add(sprite);
      clouds.push(sprite);
    }

    /* --- Город --------------------------------------------------------
       Вторая среда полёта: приходит на смену облакам. */
    const city = createCityscape({
      zFrom: CITY_FROM,
      zTo: CITY_TO,
      roofLevel: ROOF_LEVEL,
    });
    scene.add(city.group);

    /* --- Посадочная площадка -------------------------------------------
       Стоит в конце коридора: полёт должен чем-то заканчиваться.
       Аппарат садится на неё на последних процентах прокрутки. */
    /* Площадка поднята над крышами: аппарат садится не в чистом поле,
       а на вертипорт над городом. */
    const PAD_Y = -34;
    const PAD_Z = CITY_TO + 260;

    const vertiport = createVertiport();
    vertiport.group.position.set(0, PAD_Y, PAD_Z);
    scene.add(vertiport.group);

    /* --- Аппарат -------------------------------------------------------
       В кадре должна быть только настоящая модель заказчика
       (`public/models/drone.glb`). Пока она грузится, аппарата в небе
       нет вовсе.

       Раньше на это время подставлялся квадрокоптер, построенный кодом.
       От этого отказались: он заметно грубее настоящего, и первые
       секунды посетитель видел именно его. Небо, облака и город
       выглядят хорошо и сами по себе — пустое небо лучше плохого
       аппарата.

       Модель из кода осталась **аварийным** вариантом: если файл не
       отдался (нет на сервере, оборвалась связь), лучше показать
       упрощённый аппарат, чем пустой полёт без главного героя. */
    const droneHolder = new THREE.Group();
    scene.add(droneHolder);

    const drone = droneHolder;

    /** Что сейчас в кадре. Пока файл не пришёл — ничего. */
    let aircraft: ReturnType<typeof createQuadDrone> | null = null;
    let disposed = false;

    /** Аварийная подстановка: аппарат из кода вместо ненайденного файла. */
    const fallbackToBuiltIn = () => {
      if (disposed || aircraft) return;
      aircraft = createQuadDrone();
      aircraft.group.scale.setScalar(5);
      droneHolder.add(aircraft.group);
    };

    loadAircraftModel("/models/drone.glb", { targetSize: 17 })
      .then((loaded) => {
        if (!loaded) {
          fallbackToBuiltIn();
          return;
        }
        /* Страницу могли закрыть, пока файл грузился. Тогда сцена уже
           разобрана, и добавлять в неё модель нельзя — она осталась бы
           висеть в памяти вместе со всеми своими текстурами. */
        if (disposed) {
          loaded.dispose();
          return;
        }
        aircraft = loaded;
        droneHolder.add(loaded.group);
      })
      .catch(() => {
        fallbackToBuiltIn();
      });

    /* --- Кадровый цикл -------------------------------------------------- */
    /** Пустая секция внизу страницы, над которой происходит посадка. */
    const stageEl = document.querySelector<HTMLElement>("[data-landing-stage]");

    const clock = new THREE.Clock();
    let frameId = 0;
    let running = true;
    let smooth = 0;

    /** Доля прокрученной страницы, 0 в самом верху и 1 в самом низу. */
    const readProgress = () => {
      const max =
        document.documentElement.scrollHeight - window.innerHeight;
      return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    };

    const draw = () => {
      if (!running) return;
      const time = clock.getElapsedTime();

      // Камера догоняет прокрутку плавно — иначе картинка дёргается
      // вслед за колесом мыши.
      smooth += (readProgress() - smooth) * 0.055;

      const z = 40 - smooth * CORRIDOR;

      /* --- Посадка ---
         Считается не от доли прокрутки, а от положения пустой секции
         внизу страницы: она специально оставлена прозрачной, чтобы
         посадку было видно целиком, а не за текстом. Когда секция
         занимает экран — аппарат стоит на площадке.

         Привязка к элементу, а не к числу, переживает правки содержания:
         добавится блок — посадка сама сдвинется.

         Обратное движение колеса само проигрывает взлёт: всё считается
         от текущего положения, отдельной анимации не нужно. */
      let landingRaw = 0;
      if (stageEl) {
        const r = stageEl.getBoundingClientRect();
        landingRaw = (window.innerHeight - r.top) / window.innerHeight;
      }
      const landing = smoothstep(landingRaw);

      /* Покачивание затухает по мере снижения: у стоящего на площадке
         аппарата его быть не должно. */
      const alive = 1 - landing;

      const flyX = Math.sin(time * 0.42) * 5;
      const flyY = -3 + Math.cos(time * 0.33) * 3;

      /* Продвижение вперёд тоже гасится посадкой: иначе аппарат
         «садится», но продолжает уезжать по коридору и проскакивает
         площадку. К концу посадки он стоит ровно на ней. */
      drone.position.set(
        flyX * alive,
        flyY * alive + (PAD_Y + 1.4) * landing,
        (z - 46) * alive + PAD_Z * landing,
      );
      drone.rotation.set(
        (-0.1 + Math.sin(time * 0.4) * 0.05) * alive,
        Math.sin(time * 0.22) * 0.14 * alive,
        Math.sin(time * 0.5) * 0.14 * alive,
      );

      vertiport.update(time);
      city.update(time);

      // Винты и огни — независимо от прокрутки.
      // Аппарата может ещё не быть: файл модели грузится.
      aircraft?.update(time);

      /* --- Монтаж: какой сейчас план и переход к следующему ---
         Прокрутка делится на равные участки, по одному на план.
         В конце участка камера переезжает на следующую точку. */
      const span = 1 / (SHOTS.length - 1);
      const raw = Math.min(0.999999, smooth) / span;
      const index = Math.floor(raw);
      const withinShot = raw - index;

      const from = SHOTS[index];
      const to = SHOTS[Math.min(SHOTS.length - 1, index + 1)];

      // Первые две трети участка план держится, последняя треть — переезд.
      const HOLD = 0.62;
      const k = smoothstep((withinShot - HOLD) / (1 - HOLD));

      const mix = (a: number, b: number) => a + (b - a) * k;

      camera.position.set(
        drone.position.x + mix(from.offset[0], to.offset[0]),
        drone.position.y + mix(from.offset[1], to.offset[1]),
        drone.position.z + mix(from.offset[2], to.offset[2]),
      );

      const fov = fitFov(mix(from.fov, to.fov), camera.aspect);
      if (Math.abs(camera.fov - fov) > 0.01) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }

      /* Расстояние от камеры до аппарата — по нему считается, насколько
         поднять его в кадре на вертикальном экране. */
      const lift = portraitLift(
        camera.aspect,
        fov,
        camera.position.distanceTo(drone.position),
      );

      camera.lookAt(
        drone.position.x + mix(from.look[0], to.look[0]),
        drone.position.y + mix(from.look[1], to.look[1]) - lift,
        drone.position.z + mix(from.look[2], to.look[2]),
      );
      camera.rotateY(mix(from.frame, to.frame) * frameScale(camera.aspect));

      // Лёгкое дыхание камеры: даже статичный план не мертвеет.
      camera.position.x += Math.sin(time * 0.21) * 1.4;
      camera.position.y += Math.cos(time * 0.17) * 1.0;

      for (let i = 0; i < clouds.length; i++) {
        clouds[i].material.rotation += cloudSpin[i] * 0.004;
      }

      finish.uniforms.uTime.value = time;
      composer.render();
      frameId = requestAnimationFrame(draw);
    };

    /* Изменение размера окна.

       На телефоне это событие приходит постоянно: при прокрутке
       браузер прячет и показывает адресную строку, и высота окна
       скачет на десятки точек. Перестраивать буферы отрисовки на
       каждый такой скачок — заметный рывок картинки на ровном месте.
       Поэтому высоту пересчитываем только при заметном изменении,
       а ширину — всегда: смена ориентации телефона меняет именно её. */
    let lastW = window.innerWidth;
    let lastH = window.innerHeight;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w === lastW && Math.abs(h - lastH) < 120) return;

      lastW = w;
      lastH = h;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      bloom?.setSize(w, h);
    };
    window.addEventListener("resize", resize);

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frameId);
      } else {
        running = true;
        frameId = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    frameId = requestAnimationFrame(draw);

    return () => {
      running = false;
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);

      clouds.forEach((s) => {
        s.material.dispose();
        scene.remove(s);
      });
      cloudTexture.dispose();
      aircraft?.dispose();
      /* Город и площадка освобождаются здесь, при уходе со страницы.
         Раньше эти два вызова стояли внутри загрузки модели аппарата —
         то есть город и вертипорт разбирались в тот момент, когда
         догружался дрон, прямо посреди работающей сцены. */
      vertiport.dispose();
      city.dispose();
      envSource.dispose();
      skySource.dispose();
      realSky?.dispose();
      realEnv?.dispose();
      envTarget.dispose();
      pmrem.dispose();

      composer.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      data-flight-backdrop
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
