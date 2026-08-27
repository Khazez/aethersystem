/**
 * Снимает полёт сквозь облака в нескольких точках прокрутки —
 * заголовок и каждую остановку.
 *
 * Запуск: BASE_URL=http://localhost:3210 node scripts/flight-shot.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3210";
const OUT = "screenshots/flight";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto(`${BASE}/ru`, { waitUntil: "networkidle" });
await page.waitForTimeout(3500);

// Высота секции полёта = длина прокрутки сцены.
const flightHeight = await page.evaluate(() => {
  const el = document.querySelector("section[style*='vh']");
  return el ? el.getBoundingClientRect().height : 0;
});
console.log("высота секции полёта:", Math.round(flightHeight));

const marks = [
  ["01-start", 0],
  ["02-stop1", 0.19],
  ["03-stop2", 0.35],
  ["04-stop3", 0.51],
  ["05-stop4", 0.66],
  ["06-stop5", 0.82],
];

for (const [name, at] of marks) {
  await page.evaluate(
    (y) => window.scrollTo({ top: y, behavior: "instant" }),
    Math.round(flightHeight * at),
  );
  // Камера догоняет прокрутку плавно — даём ей доехать.
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("снят", name);
}

await browser.close();
console.log("");
console.log(errors.length ? "ОШИБКИ: " + errors.slice(0, 4).join(" | ") : "ошибок нет");
