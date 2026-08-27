/**
 * Уменьшает текстуры города до 512×512 и пережимает в JPEG.
 *
 * Зачем: здания видны с расстояния полёта, а текстура фасада
 * повторяется каждые несколько метров — разрешение 1024 там
 * избыточно и стоит лишних мегабайт трафика.
 *
 * Почему через браузер: отдельный графический пакет (sharp) тянет
 * бинарные зависимости под каждую платформу. Playwright в проекте
 * уже есть, а canvas умеет и масштабировать, и кодировать JPEG.
 *
 * Запуск: node scripts/shrink-textures.mjs
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DIR = "public/textures/city";
const SIZE = 512;
const QUALITY = 0.84;

const browser = await chromium.launch();
const page = await browser.newPage();

let before = 0;
let after = 0;

for (const name of readdirSync(DIR).filter((f) => f.endsWith(".jpg"))) {
  const path = join(DIR, name);
  const original = readFileSync(path);
  before += original.length;

  const dataUrl = `data:image/jpeg;base64,${original.toString("base64")}`;

  const shrunk = await page.evaluate(
    async ({ src, size, quality }) => {
      const img = new Image();
      img.src = src;
      await img.decode();

      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, size, size);

      return canvas.toDataURL("image/jpeg", quality);
    },
    { src: dataUrl, size: SIZE, quality: QUALITY },
  );

  const buf = Buffer.from(shrunk.split(",")[1], "base64");
  writeFileSync(path, buf);
  after += buf.length;

  console.log(
    `${name.padEnd(20)} ${String(Math.round(original.length / 1024)).padStart(5)} КБ → ${String(
      Math.round(buf.length / 1024),
    ).padStart(4)} КБ`,
  );
}

await browser.close();

console.log("");
console.log(
  `ИТОГО: ${Math.round(before / 1024)} КБ → ${Math.round(after / 1024)} КБ ` +
    `(в ${(before / after).toFixed(1)} раза меньше)`,
);
