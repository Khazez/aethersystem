import * as THREE from "three";

/**
 * Модель беспилотника типа «летающее крыло» (flying wing).
 *
 * Построена кодом из простых многоугольников, а не загружена готовым
 * файлом. Причина практическая: для государственного заказа важна
 * чистота прав на все материалы. Собственная геометрия не требует
 * лицензии, её нельзя оспорить, и она весит килобайты вместо мегабайт.
 *
 * Форма — характерный треугольный планер со скошенной задней кромкой:
 * узнаваемый силуэт беспилотника большой дальности.
 */
export function createDrone(): THREE.Group {
  const drone = new THREE.Group();

  /* --- Основное крыло ---------------------------------------------------
     Задаётся списком вершин в плане (вид сверху), затем «выдавливается»
     по толщине. Координаты: X — размах, Z — вдоль корпуса. */
  const halfSpan = 4.2;
  const noseZ = -3.4;
  const tailZ = 2.6;

  const shape = new THREE.Shape();
  shape.moveTo(0, noseZ); // нос
  shape.lineTo(halfSpan * 0.42, noseZ + 1.5);
  shape.lineTo(halfSpan, tailZ - 0.5); // правая законцовка
  shape.lineTo(halfSpan * 0.62, tailZ);
  shape.lineTo(halfSpan * 0.2, tailZ - 0.85); // вырез задней кромки
  shape.lineTo(0, tailZ - 0.35);
  shape.lineTo(-halfSpan * 0.2, tailZ - 0.85);
  shape.lineTo(-halfSpan * 0.62, tailZ);
  shape.lineTo(-halfSpan, tailZ - 0.5); // левая законцовка
  shape.lineTo(-halfSpan * 0.42, noseZ + 1.5);
  shape.closePath();

  const wingGeometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.42,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.14,
    bevelSegments: 2,
  });
  // Фигура строится в плоскости XY, а крыло должно лежать в XZ.
  wingGeometry.rotateX(Math.PI / 2);
  wingGeometry.center();

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a2732,
    roughness: 0.62,
    metalness: 0.72,
    flatShading: true,
  });

  const wing = new THREE.Mesh(wingGeometry, bodyMaterial);
  wing.castShadow = true;
  drone.add(wing);

  /* --- Светящийся контур крыла ------------------------------------------
     Сцена очень тёмная, и тёмный корпус в ней теряется. Контур по кромке
     крыла даёт читаемый силуэт — приём с авиационных дисплеев, где объект
     обозначается очертанием, а не заливкой. */
  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(wingGeometry, 24),
    new THREE.LineBasicMaterial({
      color: 0x8fdcef,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  drone.add(outline);

  /* --- Наплыв фюзеляжа --------------------------------------------------
     Приподнятая центральная часть — там, где у реального аппарата
     полезная нагрузка и оборудование. */
  const fuselage = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.52, 3.1, 4, 12),
    new THREE.MeshStandardMaterial({
      color: 0x223141,
      roughness: 0.5,
      metalness: 0.8,
      flatShading: true,
    }),
  );
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.set(0, 0.3, -0.3);
  fuselage.scale.set(1, 1, 0.62);
  drone.add(fuselage);

  /* --- Оптико-электронная станция ---------------------------------------
     Сфера под носовой частью: камера/тепловизор. Светится, потому что
     это активный датчик — визуально «работающий» элемент. */
  const sensor = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 16, 12),
    new THREE.MeshStandardMaterial({
      color: 0x0b1118,
      roughness: 0.18,
      metalness: 0.95,
      emissive: 0x4bc8e0,
      emissiveIntensity: 0.42,
    }),
  );
  sensor.position.set(0, -0.24, -2.1);
  drone.add(sensor);

  /* --- Кили на законцовках ---------------------------------------------- */
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(1.15, 0);
  finShape.lineTo(0.78, 0.92);
  finShape.lineTo(0, 0.62);
  finShape.closePath();

  const finGeometry = new THREE.ExtrudeGeometry(finShape, {
    depth: 0.1,
    bevelEnabled: false,
  });
  finGeometry.center();

  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(finGeometry, bodyMaterial);
    fin.position.set(side * halfSpan * 0.82, 0.42, 1.5);
    fin.rotation.y = Math.PI / 2;
    fin.rotation.z = side * 0.12;
    drone.add(fin);
  }

  /* --- Аэронавигационные огни -------------------------------------------
     Красный слева, зелёный справа — как на реальном воздушном судне.
     Мелкая деталь, но именно такие детали делают модель достоверной. */
  const lights: Array<[number, number]> = [
    [-halfSpan * 0.97, 0xe0554f],
    [halfSpan * 0.97, 0x35d07f],
  ];

  for (const [x, color] of lights) {
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 8, 6),
      new THREE.MeshBasicMaterial({ color }),
    );
    light.position.set(x, 0.06, 1.9);
    light.name = "navLight";
    drone.add(light);
  }

  /* --- Панельные линии на крыле -----------------------------------------
     Тонкие светящиеся линии вдоль корпуса: технологический контур,
     который читается даже в темноте и подчёркивает силуэт. */
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x4bc8e0,
    transparent: true,
    opacity: 0.5,
  });

  for (const side of [-1, 1]) {
    const points = [
      new THREE.Vector3(side * 0.75, 0.24, -2.6),
      new THREE.Vector3(side * 2.4, 0.16, 0.4),
      new THREE.Vector3(side * 3.5, 0.1, 1.9),
    ];
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      lineMaterial,
    );
    drone.add(line);
  }

  return drone;
}
