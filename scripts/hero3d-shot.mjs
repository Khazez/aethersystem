/**
 * Снимает первый экран главной с трёхмерной сценой в несколько моментов
 * полёта — чтобы увидеть беспилотник с разных ракурсов, а не один кадр.
 *
 * WebGL в headless-браузере включается флагами, иначе будет чёрный кадр
 * и ложный вывод «сцена не работает».
 *
 * Запуск: BASE_URL=http://localhost:3210 node scripts/hero3d-shot.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3210";
const OUT = "screenshots/hero3d";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});

const errors = [];

/* ---------- Широкий экран: должна включиться трёхмерная сцена ---------- */
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto(`${BASE}/ru`, { waitUntil: "networkidle" });
await page.waitForTimeout(3500);

const mode = await page.getAttribute("[data-hero-bg]", "data-hero-bg");
console.log("режим фона на широком экране:", mode);

const canvasCount = await page.locator("[data-hero-bg] canvas").count();
console.log("холстов в фоне:", canvasCount);

for (let i = 1; i <= 4; i++) {
  await page.screenshot({ path: `${OUT}/0${i}-flight.png` });
  console.log("снят кадр", i);
  await page.waitForTimeout(5000);
}
await page.close();

/* ---------- Узкий экран: сцена включаться не должна ---------- */
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
mobile.on("pageerror", (e) => errors.push("[mobile] " + String(e)));
await mobile.goto(`${BASE}/ru`, { waitUntil: "networkidle" });
await mobile.waitForTimeout(2000);
const mobileMode = await mobile.getAttribute("[data-hero-bg]", "data-hero-bg");
console.log("режим фона на узком экране:", mobileMode);
await mobile.close();

/* ---------- «Уменьшить движение»: тоже плоская карта ---------- */
const calm = await browser.newPage({
  viewport: { width: 1600, height: 900 },
  reducedMotion: "reduce",
});
calm.on("pageerror", (e) => errors.push("[reduced] " + String(e)));
await calm.goto(`${BASE}/ru`, { waitUntil: "networkidle" });
await calm.waitForTimeout(2000);
const calmMode = await calm.getAttribute("[data-hero-bg]", "data-hero-bg");
console.log("режим фона при «уменьшить движение»:", calmMode);
await calm.close();

await browser.close();

console.log("");
console.log(errors.length ? "ОШИБКИ: " + errors.slice(0, 4).join(" | ") : "ошибок нет");
