"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

import {createTransportTerminal,TERMINAL_DECK_HEIGHT} from '@/components/scene/transportTerminal';
import { createFleetModel } from "@/components/scene/fleet";
import { attachTaxiAsset } from "@/components/scene/taxiAsset";
import {flightFleetOrder,fleetFlightPose,landingMotion,landingCameraPose} from "@/components/scene/fleetMotion";
import { createCityscape } from "@/components/scene/city";
import {presentationFlight} from '@/components/scene/presentationFlight';
import {cityRoutePose} from '@/components/scene/astana/routeLayout';
import { sceneDisabledReason, readQuality } from "@/components/scene/quality";

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
const CITY_FROM = -220;
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
  if(aspect<.8)return 0;
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
  // 2. The axis opens behind the aircraft; retain room for its full rotor span.
  { name: "Нуржол — установочный", offset: [-58, 28, 124], look: [0, -8, -70], fov: 50, frame: 0.025 },
  // 3. Крупный: видно подвес камеры, винты, опоры.
  { name: "крупный", offset: [-14, 6, 34], look: [0, 0, -2], fov: 44, frame: 0.20 },
  // Stay on the same side of the aircraft: interpolation to a head-on camera
  // crossed through its hull and filled the entire city shot with the cargo box.
  { name: "городской общий", offset: [-42, 25, 74], look: [0, -20, -80], fov: 50, frame: .08 },
  // 5. Профиль: аппарат пересекает кадр сбоку.
  { name: "такси — облачная презентация", offset: [-26, 10, 62], look: [0, 1, -3], fov: 48, frame: 0.20 },

  /* Последние два плана — снижение. Оба сзади и сверху: камера впереди
     аппарата здесь недопустима, там стоит посадочная площадка, и камера
     оказывалась бы внутри неё. */
  { name: "заход", offset: [-34, 26, 60], look: [0, -12, -10], fov: 50, frame: 0.22 },
  { name: "посадочный", offset: [-28, 16, 48], look: [0, -4, 0], fov: 44, frame: 0.1 },
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
    uGrain: { value: 0.006 },
    uCloudCover: { value: 0 },
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
    uniform float uCloudCover;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // Виньетка: расстояние от центра кадра.
      vec2 d = vUv - 0.5;
      float vig = 1.0 - smoothstep(0.28, 0.85, length(d) * uVignette);
      color.rgb *= mix(0.72, 1.0, vig);

      // Зерно: псевдослучайный шум, меняющийся во времени.
      float n = fract(sin(dot(vUv * uTime, vec2(12.9898, 78.233))) * 43758.5453);
      color.rgb += (n - 0.5) * uGrain;
      // Cover the geographical cut before the city is removed. HTML stays readable.
      float billow = sin(vUv.x * 9.0 + vUv.y * 4.0) * .025
        + sin(vUv.y * 13.0 - vUv.x * 5.0) * .018;
      color.rgb = mix(color.rgb, vec3(.63, .70, .75) + billow, uCloudCover);

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
    const disabledReason=sceneDisabledReason();
    if (disabledReason) {mount.dataset.sceneState=disabledReason;return;}

    /** Настройки под устройство: телефон получает облегчённый набор. */
    const q = readQuality();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: q.antialias,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      mount.dataset.sceneState='webgl-unavailable';
      return;
    }

    const scene = new THREE.Scene();
    // Туман прячет дальний край коридора: облака уходят в дымку,
    // а не обрываются стеной.
    // Дневная дымка: светлая, а не чёрная.
    // Дымка лёгкая: плотная съедала и облака, и детали города.
    scene.fog = new THREE.FogExp2(0xa5bac8, 0.00024);

    const camera = new THREE.PerspectiveCamera(
      58,
      window.innerWidth / window.innerHeight,
      2,
      50000,
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
    renderer.shadowMap.enabled=q.shadowMapSize>0;
    renderer.shadowMap.type=THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate=false;
    renderer.info.autoReset=false;
    scene.environmentIntensity=.4;

    mount.appendChild(renderer.domElement);
    mount.dataset.sceneState='rendering';

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

    let disposed=false;
    new HDRLoader().load(
      "/textures/sky/sky.hdr",
      (hdr) => {
        if(disposed){hdr.dispose();return;}
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
    if(q.level==='full')for(const target of [composer.renderTarget1,composer.renderTarget2]){
      target.depthTexture=new THREE.DepthTexture(target.width,target.height,THREE.UnsignedIntType);
    }

    const ao=q.level==='full'?new GTAOPass(scene,camera,640,360):null;
    if(ao){ao.blendIntensity=.55;ao.updateGtaoMaterial({radius:1.8,thickness:1,distanceExponent:1.5});composer.addPass(ao);}


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
    const outputPass=new OutputPass();composer.addPass(outputPass);
    ao?.setSize(Math.floor(window.innerWidth*.5),Math.floor(window.innerHeight*.5));

    /* Дневная схема света: яркое солнце сверху-слева, холодный
       заполняющий от неба, слабый контровой. */
    scene.add(new THREE.HemisphereLight(0xd6e5ed,0x55574c,.24));

    const keyLight = new THREE.DirectionalLight(0xffedd3, 3.1);
    keyLight.castShadow=q.shadowMapSize>0;
    keyLight.shadow.mapSize.set(q.shadowMapSize||1024,q.shadowMapSize||1024);
    Object.assign(keyLight.shadow.camera,{left:-280,right:280,top:280,bottom:-280,near:20,far:1400});
    keyLight.shadow.camera.updateProjectionMatrix();keyLight.shadow.normalBias=.07;keyLight.shadow.bias=-.00006;
    scene.add(keyLight.target);
    keyLight.position.set(-40, 55, 25);
    scene.add(keyLight);

    // Ground bounce comes from the hemisphere; no lamp below every building.
    const rimLight = new THREE.DirectionalLight(0xdce7ec, .08);
    rimLight.position.set(20, 12, -55);
    scene.add(rimLight);

    /* --- Облака ------------------------------------------------------- */
    const cloudTexture = makeCloudTexture();
    const clouds: THREE.Sprite[] = [];
    const cloudSpin: number[] = [];
    const cloudOpacity: number[] = [];

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
      cloudOpacity.push(material.opacity);

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
      quality:q.level==='full'?'high':'medium',
      layout:'landmark-route',
      // Load the same reconstructed landmarks on preview and public hosts.
      // Keep the explicit procedural query option for side-by-side comparison.
      landmarkAssets:new URLSearchParams(window.location.search).get('landmarks')!=='procedural',
    });
    scene.add(city.group);
    mount.dataset.terrain='cloud-stage';

    /* --- Посадочная площадка -------------------------------------------
       Стоит в конце коридора: полёт должен чем-то заканчиваться.
       Аппарат садится на неё на последних процентах прокрутки. */
    /* Площадка поднята над крышами: аппарат садится не в чистом поле,
       а на вертипорт над городом. */
    const PAD_Z = CITY_TO - 80;
    const terminal=createTransportTerminal(ROOF_LEVEL-190,PAD_Z);scene.add(terminal.group);
    const PAD_Y=terminal.touchdown.y;
    terminal.group.visible=false;
    // A standalone destination needs its own ground, not the removed Almaty district.
    const arrivalGroundGeometry=new THREE.PlaneGeometry(3000,3000);
    const arrivalGroundMaterial=new THREE.MeshStandardMaterial({color:0x7d8889,roughness:1});
    const arrivalGround=new THREE.Mesh(arrivalGroundGeometry,arrivalGroundMaterial);
    arrivalGround.rotation.x=-Math.PI/2;arrivalGround.position.set(0,ROOF_LEVEL-190+.2,PAD_Z);
    arrivalGround.receiveShadow=true;arrivalGround.visible=false;scene.add(arrivalGround);
    const terminalMaterials=new Map<THREE.Material,{opacity:number;transparent:boolean;depthWrite:boolean}>();
    terminal.group.traverse(o=>{const mesh=o as THREE.Mesh;if(mesh.isMesh)for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])terminalMaterials.set(m,{opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite});});
    terminalMaterials.set(arrivalGroundMaterial,{opacity:1,transparent:false,depthWrite:true});
    const arrivalClouds=Array.from({length:q.level==='full'?36:18},(_,i)=>{
      const angle=i*2.399963,ring=160+(i%5)*52;
      const material=new THREE.SpriteMaterial({map:cloudTexture,color:0xc5d1d7,transparent:true,depthWrite:false,opacity:0,fog:false});
      const sprite=new THREE.Sprite(material);sprite.scale.set(220+(i%4)*45,110+(i%3)*35,1);
      sprite.visible=false;scene.add(sprite);
      return {sprite,x:Math.cos(angle)*ring,z:Math.sin(angle)*ring,y:PAD_Y-38+(i%4)*13};
    });

    /* Existing three-model fleet. Preserve fallback geometry and rotor nodes.
       The separate sceneEngine viewer still loads the preserved drone GLBs. */
    const droneHolder = new THREE.Group();
    scene.add(droneHolder);

    const drone = droneHolder;

    /** Independent carriers let models exit without moving the camera anchor. */
    const fleet=flightFleetOrder.map(kind=>{
      const aircraft=createFleetModel(kind);
      const taxiAsset=kind==='taxi'?attachTaxiAsset(aircraft.group):null;
      const bounds=new THREE.Box3().setFromObject(aircraft.group),size=bounds.getSize(new THREE.Vector3());
      const scale=17/Math.max(size.x,size.z),center=bounds.getCenter(new THREE.Vector3());
      aircraft.group.scale.setScalar(scale);
      aircraft.group.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
      const carrier=new THREE.Group();carrier.add(aircraft.group);scene.add(carrier);
      return {aircraft,carrier,taxiAsset};
    });
    const anchorPosition=new THREE.Vector3();
    const terminalCamera=new THREE.Vector3(),cameraTarget=new THREE.Vector3();
    const terminalLook=terminal.touchdown.clone().add(new THREE.Vector3(0,4,-5));
    let lastFrameTime=0,lastShadowTime=-10,lastShadowZ=Infinity;

    /* --- Кадровый цикл -------------------------------------------------- */
    /** Пустая секция внизу страницы, над которой происходит посадка. */
    const stageEl = document.querySelector<HTMLElement>("[data-landing-stage]");

    const clockStart=performance.now();
    let frameId = 0;
    let running = true;
    let smooth = 0;

    /** Доля прокрученной страницы, 0 в самом верху и 1 в самом низу. */
    const readProgress = () => {
      const max =
        document.documentElement.scrollHeight - window.innerHeight;
      return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    };
    // Open at the actual scroll position, including browser history restore.
    // Changing a shot never restarts an approach from the edge of the city.
    smooth = readProgress();
    let adaptiveStep=0,sampledFrames=0,sampledAt=0,slowWindows=0,fastWindows=0,renderTotal=0;
    const applyAdaptiveQuality=()=>{
      const ratio=Math.min(devicePixelRatio,adaptiveStep===2?1:adaptiveStep===1?1.25:q.maxPixelRatio);
      renderer.setPixelRatio(ratio);composer.setPixelRatio(ratio);
      if(ao)ao.setSize(Math.floor(innerWidth*(adaptiveStep===0?.5:.33)),Math.floor(innerHeight*(adaptiveStep===0?.5:.33)));
      city.setQuality(adaptiveStep===0&&q.level==='full'?'high':'medium');
      if(bloom)bloom.enabled=adaptiveStep===0;
      mount.dataset.quality=['full','balanced','economy'][adaptiveStep];
    };

    const draw = () => {
      if (!running) return;
      const time = (performance.now()-clockStart)/1000;
      const dt=Math.min(1,Math.max(0,time-lastFrameTime));lastFrameTime=time;

      // Камера догоняет прокрутку плавно — иначе картинка дёргается
      // вслед за колесом мыши.
      smooth += (readProgress() - smooth) * (1-Math.exp(-3.4*dt));

      const route=cityRoutePose(Math.min(smooth,.565),CITY_FROM,CITY_TO);
      const cityEntry=smoothstep((smooth-.09)/.06);
      const z=(40-smooth*CORRIDOR)*(1-cityEntry)+route.z*cityEntry;

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
      const approach=landingMotion(landingRaw);
      const presentation=presentationFlight(smooth,landingRaw);

      /* Покачивание затухает по мере снижения: у стоящего на площадке
         аппарата его быть не должно. */
      const alive = 1 - approach.align;

      const flyX = (Math.sin(time * 0.32)*1.4+route.x*cityEntry)*(1-presentation.hover);
      const flyY = THREE.MathUtils.lerp(-3-smoothstep((smooth-.09)/.075)*122,PAD_Y+70,presentation.hover)+Math.cos(time*.28)*.25;
      const flyZ = THREE.MathUtils.lerp(z-46,PAD_Z+60,presentation.hover);

      /* Продвижение вперёд тоже гасится посадкой: иначе аппарат
         «садится», но продолжает уезжать по коридору и проскакивает
         площадку. К концу посадки он стоит ровно на ней. */
      drone.position.set(
        flyX * alive,
        flyY * alive + (PAD_Y + 28*(1-approach.descend)) * approach.align,
        flyZ * alive + PAD_Z * approach.align,
      );
      drone.rotation.set(
        (-0.035 + Math.sin(time * 0.4) * 0.015) * alive,
        Math.sin(time * 0.22) * 0.045 * alive,
        Math.sin(time * 0.5) * 0.025 * alive,
      );

      // Винты и огни — независимо от прокрутки.
      // Аппарата может ещё не быть: файл модели грузится.

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
      // Establish the destination before descending, then settle on pad + lounge.
      const terminalView=presentation.hover*smoothstep((landingRaw+.45)/.65);
      const arrivalShot=landingCameraPose(landingRaw,{x:drone.position.x,y:drone.position.y-PAD_Y,z:drone.position.z-PAD_Z},camera.aspect);
      terminalCamera.set(arrivalShot.x,PAD_Y+arrivalShot.y,PAD_Z+arrivalShot.z);
      terminalLook.set(arrivalShot.lookX,terminal.touchdown.y-TERMINAL_DECK_HEIGHT+arrivalShot.lookY,PAD_Z+arrivalShot.lookZ);
      camera.position.lerp(terminalCamera,terminalView);

      const fov = fitFov(mix(from.fov, to.fov)*(1-terminalView)+arrivalShot.fov*terminalView, camera.aspect);
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

      cameraTarget.set(
        drone.position.x + mix(from.look[0], to.look[0]),
        drone.position.y + mix(from.look[1], to.look[1]) - lift*(1-terminalView),
        drone.position.z + mix(from.look[2], to.look[2]),
      );
      cameraTarget.lerp(terminalLook,terminalView);
      camera.lookAt(cameraTarget);
      camera.rotateY(mix(from.frame, to.frame) * frameScale(camera.aspect)*(1-terminalView));

      // Лёгкое дыхание камеры: даже статичный план не мертвеет.
      camera.position.x += Math.sin(time * 0.21) * .35*(1-landing);
      camera.position.y += Math.cos(time * 0.17) * .25*(1-landing);
      camera.updateMatrixWorld();
      anchorPosition.copy(drone.position);
      for(let i=0;i<fleet.length;i++){
        const {aircraft,carrier,taxiAsset}=fleet[i],pose=fleetFlightPose(i,smooth);
        // The taxi joins inside the opaque cloud cut, never over the city.
        carrier.visible=pose.visible&&(i!==2||smooth>=.615);
        carrier.position.copy(anchorPosition);carrier.position.x+=pose.x*60;carrier.position.y+=pose.up;carrier.position.z+=pose.forward;
        carrier.rotation.copy(drone.rotation);carrier.rotation.z+=pose.bank;carrier.rotation.y+=pose.yaw;
        aircraft.setSpinning(approach.rotorSpeed>0);aircraft.setRotorSpeed(approach.rotorSpeed);if(pose.visible)aircraft.update(time);
        if(pose.visible)taxiAsset?.update(time,approach.rotorSpeed);
      }
      terminal.group.visible=presentation.terminalVisible;
      arrivalGround.visible=presentation.terminalVisible;
      city.group.visible=presentation.cityVisible;
      (scene.fog as THREE.FogExp2).density=presentation.fogDensity;
      if(presentation.cityVisible)city.update(time,camera);
      finish.uniforms.uCloudCover.value=presentation.cover;
      for(const [material,base] of terminalMaterials){
        const transparent=base.transparent||presentation.reveal<1;
        if(material.transparent!==transparent){material.transparent=transparent;material.needsUpdate=true;}
        material.opacity=base.opacity*presentation.reveal;
        material.depthWrite=base.depthWrite&&presentation.reveal>.98;
      }
      for(const cloud of arrivalClouds){
        const spread=1+presentation.reveal*1.5;
        cloud.sprite.position.set(cloud.x*spread,cloud.y-presentation.reveal*70,PAD_Z+cloud.z*spread);
        cloud.sprite.material.opacity=presentation.cloudOpacity*.52;
        cloud.sprite.visible=presentation.cloudOpacity>.001;
      }
      mount.dataset.city=presentation.hover<.5?'Астана':presentation.terminalVisible?'Воздушный терминал':'Облачная сцена';
      mount.dataset.presentation=presentation.phase;
      mount.dataset.progress=(smooth*100).toFixed(1);
      mount.dataset.aircraft=flightFleetOrder.find((_,i)=>fleet[i].carrier.visible)??'transition';
      mount.dataset.landing=String(landingRaw>=1);
      mount.dataset.landingPhase=landingRaw<=0?'flight':landingRaw<.58?'approach':landingRaw<.6?'align':landingRaw<.9?'descent':landingRaw<.92?'touchdown':landingRaw<1?'rotor-stop':'parked';
      // Near chunks continue loading after scroll stops. Refresh occasionally
      // while stationary too, otherwise their newly visible facades lack shadows.
      if(q.shadowMapSize>0&&time-lastShadowTime>.2&&(Math.abs(drone.position.z-lastShadowZ)>8||landing>.01||time-lastShadowTime>1.2)){
        const shadowZ=Math.round(drone.position.z/(560/2048))*(560/2048);
        keyLight.target.position.set(0,-140,shadowZ);
        keyLight.position.set(-400,250,shadowZ+350);
        renderer.shadowMap.needsUpdate=true;lastShadowTime=time;lastShadowZ=drone.position.z;
      }

      for (let i = 0; i < clouds.length; i++) {
        clouds[i].material.rotation += cloudSpin[i] * 0.004;
        // Preserve the original cloud opening; clear the layer during the first
        // camera change, so the next shot is already over the city blocks.
        const visibility=1-smoothstep((smooth-.09)/.07);
        clouds[i].material.opacity=cloudOpacity[i]*visibility;
        clouds[i].visible=visibility>0;
      }

      finish.uniforms.uTime.value = time;
      if(ao){
        ao.enabled=adaptiveStep<2&&smooth>.13;
        // RenderPass writes into the current read buffer. Reconstruct normals
        // from its depth instead of redrawing millions of facade triangles.
        ao.setGBuffer(composer.readBuffer.depthTexture!);
      }
      mount.dataset.ao=String(!!ao?.enabled);
      renderer.info.reset();
      const renderStarted=performance.now();composer.render();renderTotal+=performance.now()-renderStarted;
      sampledFrames++;
      if(time-sampledAt>2){
        const fps=sampledFrames/(time-sampledAt),renderMs=renderTotal/sampledFrames;mount.dataset.fps=fps.toFixed(0);
        mount.dataset.renderMs=renderMs.toFixed(1);mount.dataset.drawCalls=String(renderer.info.render.calls);mount.dataset.triangles=String(renderer.info.render.triangles);
        sampledAt=time;sampledFrames=0;renderTotal=0;
        // A throttled background RAF is not evidence that GPU quality is too high.
        // Ignore compilation/warm-up and background throttling. Quality can
        // recover after sustained headroom instead of staying flat forever.
        const active=time>12&&document.visibilityState==='visible'&&document.hasFocus()&&smooth>.16;
        if(active&&fps<30&&renderMs>22)slowWindows++;else slowWindows=0;
        if(active&&fps>50&&renderMs<12)fastWindows++;else fastWindows=0;
        if(slowWindows>=3&&adaptiveStep<2){
          adaptiveStep++;slowWindows=0;fastWindows=0;applyAdaptiveQuality();
        }else if(fastWindows>=6&&adaptiveStep>0){
          adaptiveStep--;fastWindows=0;slowWindows=0;applyAdaptiveQuality();
        }
      }
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
      ao?.setSize(Math.floor(w*(adaptiveStep===0?.5:.33)),Math.floor(h*(adaptiveStep===0?.5:.33)));
      bloom?.setSize(w, h);
    };
    window.addEventListener("resize", resize);

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frameId);
      } else {
        lastFrameTime=(performance.now()-clockStart)/1000;sampledAt=lastFrameTime;sampledFrames=0;renderTotal=0;
        running = true;
        frameId = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    frameId = requestAnimationFrame(draw);

    return () => {
      disposed=true;
      running = false;
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);

      clouds.forEach((s) => {
        s.material.dispose();
        scene.remove(s);
      });
      cloudTexture.dispose();
      fleet.forEach(({aircraft,taxiAsset})=>{taxiAsset?.dispose();aircraft.dispose();});
      keyLight.shadow.map?.dispose();
      /* Город и площадка освобождаются здесь, при уходе со страницы.
         Раньше эти два вызова стояли внутри загрузки модели аппарата —
         то есть город и вертипорт разбирались в тот момент, когда
         догружался дрон, прямо посреди работающей сцены. */
      city.dispose();
      terminal.dispose();arrivalGroundGeometry.dispose();arrivalGroundMaterial.dispose();
      arrivalClouds.forEach(({sprite})=>{sprite.material.dispose();scene.remove(sprite);});
      envSource.dispose();
      skySource.dispose();
      realSky?.dispose();
      realEnv?.dispose();
      envTarget.dispose();
      pmrem.dispose();

      composer.dispose();
      ao?.dispose();bloom?.dispose();finish.dispose();outputPass.dispose();
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
