/**
 * Снимает то, что уже построено в 3D на /prototype:
 * сцену Aether Grid и осмотр беспилотника.
 *
 * WebGL в headless-браузере нужно включать явно (флаги angle/swiftshader),
 * иначе сцена не отрисуется и получим чёрный кадр.
 *
 * Запуск: BASE_URL=http://localhost:3210 node scripts/proto-3d-shot.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3210";
const OUT = "screenshots/proto3d";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`${BASE}/prototype`, { waitUntil: "networkidle" });
await page.waitForTimeout(4000);

// Сколько всего можно прокрутить — от этого считаем позиции фаз.
const maxScroll = await page.evaluate(
  () => document.documentElement.scrollHeight - window.innerHeight,
);
console.log("высота прокрутки:", maxScroll);

const marks = [
  { name: "01-hero", at: 0 },
  { name: "02-phase-identity", at: 0.22 },
  { name: "03-phase-grid", at: 0.42 },
  { name: "04-phase-routes", at: 0.6 },
  { name: "05-lower", at: 0.8 },
  { name: "06-bottom", at: 1 },
];

for (const m of marks) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), Math.round(maxScroll * m.at));
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${OUT}/${m.name}.png` });
  console.log("снят", m.name);
}

console.log(errors.length ? "ОШИБКИ: " + errors.slice(0, 3).join(" | ") : "ошибок нет");
await browser.close();
