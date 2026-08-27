/**
 * Уменьшает текстуры модели дрона внутри .glb.
 *
 * Зачем: из 6,3 МБ файла 5,3 МБ — три текстуры 2048×2048. Аппарат виден
 * с расстояния полёта, такое разрешение там не читается, зато стоит
 * секунд загрузки и 67 МБ видеопамяти на телефоне (по 22 МБ на карту).
 * До 25.08.2026 из-за этого первые секунды в небе не было аппарата
 * вовсе — файл ещё шёл.
 *
 * Почему не `gltf-transform resize`: он падает на этих файлах —
 * `colourspace: parameter space not set`. Библиотека изображений (sharp
 * / libvips) не понимает их цветовое пространство. Пробовалось дважды,
 * в августе 2026, оба раза одинаково.
 *
 * Способ тот же, что и для текстур города (`shrink-textures.mjs`):
 * масштабируем через canvas в браузере. Playwright в проекте уже есть,
 * бинарных зависимостей не добавляет.
 *
 * Карты уменьшаются по-разному, и это не произвол:
 *   - цвет (baseColor) — 1024, по нему читается сам аппарат;
 *   - рельеф (normal) — 1024, даёт объём панелей и стыков;
 *   - металличность/шероховатость — 512, это плавные зоны
 *     «здесь блестит, здесь матовое», мелких деталей там нет.
 *
 * Формат: JPEG для цвета и металличности, PNG для рельефа. Карту
 * нормалей нельзя жать с потерями — JPEG портит направления векторов,
 * и на корпусе появляется рябь.
 *
 * Запуск: node scripts/shrink-model.mjs [вход.glb] [выход.glb]
 *
 * После прогона модель нужно пережать Draco обратно:
 *   npx @gltf-transform/cli draco выход.glb выход.glb
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import draco3d from "draco3dgltf";

const IN = process.argv[2] ?? "public/models/drone.glb";
const OUT = process.argv[3] ?? "public/models/drone.glb";

/** Во сколько точек уменьшать каждую карту и чем кодировать. */
const PLAN = {
  baseColorTexture: { size: 1024, mime: "image/jpeg", quality: 0.9 },
  normalTexture: { size: 1024, mime: "image/png" },
  metallicRoughnessTexture: { size: 512, mime: "image/jpeg", quality: 0.9 },
};

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "draco3d.decoder": await draco3d.createDecoderModule(),
    "draco3d.encoder": await draco3d.createEncoderModule(),
  });

const before = readFileSync(IN).length;
const doc = await io.read(IN);

const browser = await chromium.launch();
const page = await browser.newPage();

/** Какая карта каким слотом подключена — по ней выбирается план. */
const slotOf = new Map();
for (const mat of doc.getRoot().listMaterials()) {
  for (const [slot] of Object.entries(PLAN)) {
    const getter = "get" + slot[0].toUpperCase() + slot.slice(1);
    const tex = mat[getter]?.();
    if (tex) slotOf.set(tex, slot);
  }
}

for (const tex of doc.getRoot().listTextures()) {
  const slot = slotOf.get(tex);
  if (!slot) {
    console.log(`пропущена (слот неизвестен): ${tex.getName()}`);
    continue;
  }
  const plan = PLAN[slot];
  const image = tex.getImage();
  if (!image) continue;

  const src =
    `data:${tex.getMimeType()};base64,` +
    Buffer.from(image).toString("base64");

  const encoded = await page.evaluate(
    async ({ src, size, mime, quality }) => {
      const img = new Image();
      img.src = src;
      await img.decode();

      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, size, size);

      const blob = await new Promise((res) =>
        canvas.toBlob(res, mime, quality),
      );
      const buf = await blob.arrayBuffer();
      return Array.from(new Uint8Array(buf));
    },
    { src, size: plan.size, mime: plan.mime, quality: plan.quality },
  );

  const was = image.byteLength;
  tex.setImage(new Uint8Array(encoded)).setMimeType(plan.mime);

  console.log(
    `${slot}: ${(was / 1024 / 1024).toFixed(2)} МБ → ` +
      `${(encoded.length / 1024).toFixed(0)} КБ  (${plan.size}px, ${plan.mime})`,
  );
}

await browser.close();
await io.write(OUT, doc);

const after = readFileSync(OUT).length;
console.log(
  `\nфайл: ${(before / 1024 / 1024).toFixed(2)} МБ → ` +
    `${(after / 1024 / 1024).toFixed(2)} МБ`,
);
console.log("не забыть: npx @gltf-transform/cli draco " + OUT + " " + OUT);
