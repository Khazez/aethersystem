import * as THREE from "three";

/**
 * Аппараты экосистемы: мультироторный дрон и воздушное такси.
 *
 * Почему не «летающее крыло», которое было раньше: тот силуэт читается
 * как военный разведывательный аппарат. Экосистема Aether — про
 * гражданские операции: доставку, инспекцию, воздушные такси. Форма
 * должна соответствовать, иначе сайт обещает не то, чем компания
 * занимается.
 *
 * Термины взяты из описания: «беспилотные аппараты» (БВС) и
 * «воздушные такси» — раздел 40 «Видение» и раздел про
 * urban / advanced air mobility.
 *
 * Модели построены кодом, а не скачаны готовыми файлами: для
 * государственного заказа важна чистота прав на все материалы.
 * Собственная геометрия не требует лицензии и весит килобайты.
 */

export type Aircraft = {
  group: THREE.Group;
  /** Покадровое обновление: вращение винтов, мигание огней. */
  update: (time: number) => void;
  dispose: () => void;
};

/* ------------------------------------------------------------------ */
/*  Общие материалы                                                    */
/* ------------------------------------------------------------------ */

function makeMaterials() {
  /* Корпус настоящего аппарата — почти чёрный матовый пластик с лёгким
     лаковым блеском. Прежние материалы были слишком светлыми и
     «пластилиновыми»: цвет 0x1b2530 с металличностью 0.55 давал
     игрушечный вид. clearcoat добавляет тонкий слой лака поверх
     матовой основы — именно он читается как настоящий корпус. */
  const shell = new THREE.MeshPhysicalMaterial({
    color: 0x14181c,
    metalness: 0.18,
    roughness: 0.54,
    clearcoat: 0.65,
    clearcoatRoughness: 0.32,
    envMapIntensity: 1.15,
  });

  const shellLight = new THREE.MeshPhysicalMaterial({
    color: 0x15191d,
    metalness: 0.22,
    roughness: 0.68,
    clearcoat: 0.35,
    clearcoatRoughness: 0.45,
    envMapIntensity: 0.75,
  });

  // Резина, композит, тени в углублениях — самое тёмное на аппарате.
  const dark = new THREE.MeshStandardMaterial({
    color: 0x090b0d,
    metalness: 0.05,
    roughness: 0.88,
    envMapIntensity: 0.6,
  });

  // Объектив и остекление: зеркальные, почти без шероховатости.
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x05080a,
    metalness: 1.0,
    roughness: 0.06,
    envMapIntensity: 1.6,
  });

  const accent = new THREE.MeshStandardMaterial({
    color: 0x3a4a55,
    metalness: 0.6,
    roughness: 0.35,
  });

  return { shell, shellLight, dark, glass, accent };
}

/** Диск, изображающий вращающийся винт: отдельные лопасти на скорости сливаются. */
function makeRotorDisc(radius: number): THREE.Mesh {
  const geometry = new THREE.CircleGeometry(radius, 28);
  const material = new THREE.MeshBasicMaterial({
    color: 0xb9c9d2,
    transparent: true,
    opacity: 0.055,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const disc = new THREE.Mesh(geometry, material);
  disc.rotation.x = -Math.PI / 2;
  return disc;
}

/** Пара лопастей. Вращается быстро, поверх неё лежит размытый диск. */
function makeBlades(radius: number, mat: THREE.Material): THREE.Group {
  const blades = new THREE.Group();
  const geo = new THREE.BoxGeometry(radius * 2, 0.035, radius * 0.17);

  for (let i = 0; i < 2; i++) {
    const blade = new THREE.Mesh(geo, mat);
    blade.rotation.y = (i * Math.PI) / 2;
    blades.add(blade);
  }
  return blades;
}

/* ------------------------------------------------------------------ */
/*  Мультироторный дрон (квадрокоптер)                                 */
/* ------------------------------------------------------------------ */

/**
 * Скруглённый прямоугольник в плане — основа плоского корпуса.
 * Обычный BoxGeometry даёт резкие углы, а у аппарата с фотографии
 * корпус плоский и скруглённый.
 */
function roundedRect(w: number, d: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r);
  s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d);
  s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Плоская скруглённая деталь заданной толщины, лежащая горизонтально. */
function flatSlab(
  w: number,
  d: number,
  r: number,
  thickness: number,
  material: THREE.Material,
): THREE.Mesh {
  const geo = new THREE.ExtrudeGeometry(roundedRect(w, d, r), {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.035,
    bevelSegments: 2,
  });
  // Выдавливание идёт по +Z, разворачиваем деталь в горизонталь.
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, thickness / 2, 0);
  return new THREE.Mesh(geo, material);
}

/**
 * Квадрокоптер по фотографии заказчика: плоский чёрный корпус,
 * тонкие складные лучи, подвесная камера спереди, короткие опоры.
 *
 * Нос смотрит вдоль -Z — в ту же сторону, куда летит камера сцены,
 * поэтому модель не требует дополнительных разворотов.
 */
export function createQuadDrone(): Aircraft {
  const group = new THREE.Group();
  const m = makeMaterials();
  const disposables: Array<THREE.BufferGeometry | THREE.Material> = [
    ...Object.values(m),
  ];

  /* --- Корпус: плоская скруглённая «плитка» --- */
  const body = flatSlab(0.95, 1.85, 0.3, 0.34, m.shell);
  group.add(body);
  disposables.push(body.geometry);

  /* --- Верхняя накладка --- */
  const cover = flatSlab(0.78, 1.5, 0.26, 0.12, m.shellLight);
  cover.position.y = 0.3;
  group.add(cover);
  disposables.push(cover.geometry);

  /* --- Проработка верха ---
     Сверху корпус читался голой пластиной. Настоящий аппарат сверху —
     это утопленная крышка батареи, вентиляционные прорези и стык
     панелей. Эти детали и создают ощущение изделия, а не болванки. */
  const hatchGeo = new THREE.BoxGeometry(0.52, 0.05, 0.86);
  const hatch = new THREE.Mesh(hatchGeo, m.dark);
  hatch.position.set(0, 0.37, 0.16);
  group.add(hatch);
  disposables.push(hatchGeo);

  const ventGeo = new THREE.BoxGeometry(0.05, 0.035, 0.3);
  disposables.push(ventGeo);
  for (let i = 0; i < 4; i++) {
    for (const sx of [-1, 1]) {
      const vent = new THREE.Mesh(ventGeo, m.dark);
      vent.position.set(sx * 0.26, 0.38, -0.34 - i * 0.09);
      group.add(vent);
    }
  }

  // Стык панелей по борту.
  const seamGeo = new THREE.BoxGeometry(0.02, 0.04, 1.3);
  disposables.push(seamGeo);
  for (const sx of [-1, 1]) {
    const seam = new THREE.Mesh(seamGeo, m.dark);
    seam.position.set(sx * 0.47, 0.16, 0);
    group.add(seam);
  }

  /* --- Красная полоса на крышке: та самая деталь с фотографии --- */
  const stripeGeo = new THREE.BoxGeometry(0.1, 0.02, 0.62);
  const stripeMat = new THREE.MeshStandardMaterial({
    color: 0xc4443f,
    emissive: 0x3a100e,
    roughness: 0.5,
  });
  const stripe = new THREE.Mesh(stripeGeo, stripeMat);
  stripe.position.set(0.16, 0.42, -0.18);
  group.add(stripe);
  disposables.push(stripeGeo, stripeMat);

  /* --- Подвес камеры спереди снизу --- */
  const gimbalGeo = new THREE.BoxGeometry(0.34, 0.3, 0.26);
  const gimbal = new THREE.Mesh(gimbalGeo, m.dark);
  gimbal.position.set(0, -0.2, -0.72);
  group.add(gimbal);
  disposables.push(gimbalGeo);

  const lensGeo = new THREE.CylinderGeometry(0.13, 0.15, 0.14, 18);
  const lens = new THREE.Mesh(lensGeo, m.glass);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, -0.2, -0.87);
  group.add(lens);
  disposables.push(lensGeo);

  const ringGeo = new THREE.TorusGeometry(0.15, 0.022, 8, 20);
  const ring = new THREE.Mesh(ringGeo, m.shellLight);
  ring.position.set(0, -0.2, -0.85);
  group.add(ring);
  disposables.push(ringGeo);

  /* --- Лучи, моторы, винты, опоры --- */
  const armGeo = new THREE.BoxGeometry(0.13, 0.1, 1.15);
  const motorGeo = new THREE.CylinderGeometry(0.13, 0.16, 0.26, 14);
  const legGeo = new THREE.BoxGeometry(0.075, 0.42, 0.075);
  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0x20282f,
    metalness: 0.2,
    roughness: 0.8,
  });
  disposables.push(armGeo, motorGeo, legGeo, bladeMat);

  const rotors: Array<{ blades: THREE.Group; dir: number }> = [];

  // Четыре луча расходятся вперёд-назад по диагонали, как на фотографии.
  const arms: Array<[number, number, number]> = [
    [1, -1, -0.62], // правый передний
    [-1, -1, 0.62], // левый передний
    [1, 1, 0.62], // правый задний
    [-1, 1, -0.62], // левый задний
  ];

  arms.forEach(([sx, sz, yaw], i) => {
    const arm = new THREE.Mesh(armGeo, m.shell);
    arm.position.set(sx * 0.5, 0.06, sz * 0.72);
    arm.rotation.y = yaw;
    group.add(arm);

    const mx = sx * 0.94;
    const mz = sz * 1.28;

    const motor = new THREE.Mesh(motorGeo, m.dark);
    motor.position.set(mx, 0.16, mz);
    group.add(motor);

    // Длинные тонкие лопасти — характерная форма складного дрона.
    const blades = makeBlades(0.86, bladeMat);
    blades.position.set(mx, 0.32, mz);
    group.add(blades);

    const disc = makeRotorDisc(0.86);
    disc.position.set(mx, 0.33, mz);
    group.add(disc);
    disposables.push(disc.geometry, disc.material as THREE.Material);

    // Короткая опора под каждым лучом.
    const leg = new THREE.Mesh(legGeo, m.dark);
    leg.position.set(mx, -0.16, mz);
    group.add(leg);

    // Соседние винты вращаются в разные стороны — как у настоящего аппарата.
    rotors.push({ blades, dir: i % 2 === 0 ? 1 : -1 });
  });

  /* --- Аэронавигационные огни: зелёный справа, красный слева --- */
  const lightGeo = new THREE.SphereGeometry(0.06, 10, 8);
  disposables.push(lightGeo);

  const navLights: THREE.Mesh[] = [];
  for (const [color, x, z] of [
    [0x35d07f, 0.94, -1.28],
    [0xe0554f, -0.94, -1.28],
  ] as Array<[number, number, number]>) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
    const light = new THREE.Mesh(lightGeo, mat);
    light.position.set(x, 0.02, z);
    group.add(light);
    navLights.push(light);
    disposables.push(mat);
  }

  /* Светящегося контура у аппарата нет намеренно: подсветка рёбер —
     первый признак «нарисованной» модели. Объём даёт свет и отражения
     окружения, как у настоящей съёмки. */

  return {
    group,
    update: (time: number) => {
      for (const r of rotors) {
        r.blades.rotation.y += r.dir * 1.35;
      }
      // Огни мигают — аппарат в работе, а не макет.
      const blink = Math.sin(time * 4) > 0.2 ? 1 : 0.25;
      navLights.forEach((l) => {
        (l.material as THREE.MeshBasicMaterial).opacity = blink;
      });
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Воздушное такси (eVTOL)                                            */
/* ------------------------------------------------------------------ */

export function createAirTaxi(): Aircraft {
  const group = new THREE.Group();
  const m = makeMaterials();
  const disposables: Array<THREE.BufferGeometry | THREE.Material> = [
    ...Object.values(m),
  ];

  /* --- Пассажирская кабина --- */
  const cabinGeo = new THREE.CapsuleGeometry(0.95, 2.0, 8, 20);
  const cabin = new THREE.Mesh(cabinGeo, m.shell);
  cabin.rotation.z = Math.PI / 2;
  cabin.scale.set(1, 1, 0.86);
  group.add(cabin);
  disposables.push(cabinGeo);

  /* --- Остекление: широкая полоса окон, как у пассажирского аппарата --- */
  const glassGeo = new THREE.CapsuleGeometry(0.9, 1.5, 6, 18);
  const glassBand = new THREE.Mesh(glassGeo, m.glass);
  glassBand.rotation.z = Math.PI / 2;
  glassBand.scale.set(1, 1.02, 0.7);
  glassBand.position.set(0.35, 0.16, 0);
  group.add(glassBand);
  disposables.push(glassGeo);

  /* --- Хвостовая балка и оперение --- */
  const boomGeo = new THREE.CylinderGeometry(0.16, 0.1, 2.1, 12);
  const boom = new THREE.Mesh(boomGeo, m.shell);
  boom.rotation.z = Math.PI / 2;
  boom.position.set(-2.0, 0.1, 0);
  group.add(boom);
  disposables.push(boomGeo);

  const finGeo = new THREE.BoxGeometry(0.5, 0.85, 0.08);
  const fin = new THREE.Mesh(finGeo, m.shellLight);
  fin.position.set(-2.9, 0.5, 0);
  group.add(fin);
  disposables.push(finGeo);

  /* --- Несущие балки с винтами: шесть подъёмных групп --- */
  const beamGeo = new THREE.BoxGeometry(0.22, 0.16, 5.6);
  disposables.push(beamGeo);

  for (const sx of [1.05, -0.85]) {
    const beam = new THREE.Mesh(beamGeo, m.shell);
    beam.position.set(sx, 0.34, 0);
    group.add(beam);
  }

  const motorGeo = new THREE.CylinderGeometry(0.2, 0.24, 0.36, 14);
  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0x1a232b,
    metalness: 0.25,
    roughness: 0.75,
  });
  disposables.push(motorGeo, bladeMat);

  const rotors: Array<{ blades: THREE.Group; dir: number }> = [];
  let index = 0;

  for (const x of [1.05, -0.85]) {
    for (const z of [-2.5, 0, 2.5]) {
      const motor = new THREE.Mesh(motorGeo, m.dark);
      motor.position.set(x, 0.5, z);
      group.add(motor);

      const blades = makeBlades(1.05, bladeMat);
      blades.position.set(x, 0.7, z);
      group.add(blades);

      const disc = makeRotorDisc(1.05);
      disc.position.set(x, 0.71, z);
      group.add(disc);
      disposables.push(disc.geometry, disc.material as THREE.Material);

      rotors.push({ blades, dir: index % 2 === 0 ? 1 : -1 });
      index++;
    }
  }

  /* --- Посадочные опоры --- */
  const skidGeo = new THREE.BoxGeometry(3.2, 0.1, 0.12);
  const legGeo = new THREE.BoxGeometry(0.11, 0.65, 0.11);
  disposables.push(skidGeo, legGeo);

  for (const sz of [-1, 1]) {
    const skid = new THREE.Mesh(skidGeo, m.dark);
    skid.position.set(0, -1.25, sz * 0.85);
    group.add(skid);

    for (const sx of [-1, 1]) {
      const leg = new THREE.Mesh(legGeo, m.dark);
      leg.position.set(sx * 1.0, -0.95, sz * 0.85);
      group.add(leg);
    }
  }

  /* --- Огни --- */
  const lightGeo = new THREE.SphereGeometry(0.11, 10, 8);
  disposables.push(lightGeo);

  const navLights: THREE.Mesh[] = [];
  for (const [color, x, z] of [
    [0x35d07f, 1.05, 2.72],
    [0xe0554f, 1.05, -2.72],
  ] as Array<[number, number, number]>) {
    const mat = new THREE.MeshBasicMaterial({ color });
    const light = new THREE.Mesh(lightGeo, mat);
    light.position.set(x, 0.36, z);
    group.add(light);
    navLights.push(light);
    disposables.push(mat);
  }

  /* --- Контур кабины --- */
  const outlineMat = new THREE.LineBasicMaterial({
    color: 0x4bc8e0,
    transparent: true,
    opacity: 0.3,
  });
  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(cabinGeo),
    outlineMat,
  );
  outline.rotation.copy(cabin.rotation);
  outline.scale.copy(cabin.scale);
  group.add(outline);
  disposables.push(outline.geometry, outlineMat);

  return {
    group,
    update: (time: number) => {
      for (const r of rotors) {
        r.blades.rotation.y += r.dir * 1.1;
      }
      const blink = Math.sin(time * 3.2) > 0.2 ? 1 : 0.3;
      navLights.forEach((l) => {
        const mat = l.material as THREE.MeshBasicMaterial;
        mat.transparent = true;
        mat.opacity = blink;
      });
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Посадочная площадка (вертипорт)                                    */
/* ------------------------------------------------------------------ */

/**
 * Площадка, на которую аппарат садится в конце полёта.
 *
 * Зачем она вообще нужна: в облаках садиться не на что, а полёт должен
 * чем-то заканчиваться. Площадка над облачным слоем — это ещё и по делу:
 * в описании (раздел 40 «Видение») названы воздушные такси и
 * автоматизированные посадочные инфраструктуры.
 *
 * Построена кодом: круглая платформа, разметка, периметральные огни.
 */
export function createVertiport(): Aircraft {
  const group = new THREE.Group();
  const disposables: Array<THREE.BufferGeometry | THREE.Material> = [];

  const deck = new THREE.MeshStandardMaterial({
    color: 0x161b20,
    metalness: 0.3,
    roughness: 0.8,
  });
  const paint = new THREE.MeshStandardMaterial({
    color: 0xc8d6de,
    emissive: 0x27333a,
    metalness: 0.1,
    roughness: 0.65,
  });
  disposables.push(deck, paint);

  /* --- Платформа --- */
  const RADIUS = 13;
  const padGeo = new THREE.CylinderGeometry(RADIUS, RADIUS * 0.94, 1.1, 56);
  const pad = new THREE.Mesh(padGeo, deck);
  group.add(pad);
  disposables.push(padGeo);

  /* --- Круг разметки --- */
  const ringGeo = new THREE.TorusGeometry(RADIUS * 0.62, 0.16, 8, 56);
  const ring = new THREE.Mesh(ringGeo, paint);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.58;
  group.add(ring);
  disposables.push(ringGeo);

  /* --- Буква H: стандартная разметка вертолётной площадки --- */
  const barGeo = new THREE.BoxGeometry(0.75, 0.08, 5.4);
  const crossGeo = new THREE.BoxGeometry(3.6, 0.08, 0.75);
  disposables.push(barGeo, crossGeo);

  for (const sx of [-1, 1]) {
    const bar = new THREE.Mesh(barGeo, paint);
    bar.position.set(sx * 1.8, 0.6, 0);
    group.add(bar);
  }
  const cross = new THREE.Mesh(crossGeo, paint);
  cross.position.set(0, 0.6, 0);
  group.add(cross);

  /* --- Периметральные огни --- */
  const lampGeo = new THREE.SphereGeometry(0.28, 10, 8);
  const lampMat = new THREE.MeshBasicMaterial({
    color: 0x4bc8e0,
    transparent: true,
  });
  disposables.push(lampGeo, lampMat);

  const lamps: THREE.Mesh[] = [];
  const LAMP_COUNT = 16;
  for (let i = 0; i < LAMP_COUNT; i++) {
    const a = (i / LAMP_COUNT) * Math.PI * 2;
    const lamp = new THREE.Mesh(lampGeo, lampMat.clone());
    lamp.position.set(
      Math.cos(a) * (RADIUS - 0.7),
      0.7,
      Math.sin(a) * (RADIUS - 0.7),
    );
    group.add(lamp);
    lamps.push(lamp);
    disposables.push(lamp.material as THREE.Material);
  }

  /* --- Опорная юбка: платформа не висит в пустоте --- */
  const skirtGeo = new THREE.CylinderGeometry(RADIUS * 0.72, RADIUS * 0.4, 7, 32, 1, true);
  const skirtMat = new THREE.MeshStandardMaterial({
    color: 0x0d1116,
    metalness: 0.2,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
  const skirt = new THREE.Mesh(skirtGeo, skirtMat);
  skirt.position.y = -4;
  group.add(skirt);
  disposables.push(skirtGeo, skirtMat);

  return {
    group,
    update: (time: number) => {
      // Огни бегут по кругу — площадка «работает», а не нарисована.
      for (let i = 0; i < lamps.length; i++) {
        const phase = time * 1.6 - i * 0.32;
        const v = 0.35 + 0.65 * Math.max(0, Math.sin(phase));
        (lamps[i].material as THREE.MeshBasicMaterial).opacity = v;
      }
    },
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}
