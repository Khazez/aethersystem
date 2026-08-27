/**
 * Скриншоты прототипа на разных стадиях прокрутки.
 * Требует запущенный сервер на порту 3200.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3200/prototype";
const OUT = "screenshots/proto";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  // Программный рендеринг WebGL — на сервере без видеокарты
  // трёхмерная сцена иначе не отрисуется.
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});

const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });

const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(BASE, { waitUntil: "networkidle" });

// Первый экран: ловим боот-последовательность в процессе и после.
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/00-boot-mid.png` });
console.log("00-boot-mid");

await page.waitForTimeout(2600);
await page.screenshot({ path: `${OUT}/01-hero-ready.png` });
console.log("01-hero-ready");

// Прокрутка через все четыре фазы сцены.
const vh = 950;
const stops = [
  { name: "02-phase-chaos", y: vh * 1.1 },
  { name: "03-phase-identity", y: vh * 2.0 },
  { name: "04-phase-grid", y: vh * 3.0 },
  { name: "05-phase-routes", y: vh * 4.1 },
  { name: "06-phase-end", y: vh * 4.7 },
];

for (const stop of stops) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), stop.y);
  // Камера догоняет прогресс плавно — даём ей доехать.
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${OUT}/${stop.name}.png` });
  console.log(stop.name);
}

// Мобильная проверка.
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(BASE, { waitUntil: "networkidle" });
await mobile.waitForTimeout(3200);
await mobile.screenshot({ path: `${OUT}/07-mobile-hero.png` });
await mobile.evaluate(() => window.scrollTo({ top: 844 * 2.5, behavior: "instant" }));
await mobile.waitForTimeout(2200);
await mobile.screenshot({ path: `${OUT}/08-mobile-scene.png` });
console.log("mobile");

console.log(errors.length ? "ОШИБКИ КОНСОЛИ:\n" + errors.join("\n") : "ошибок консоли нет");

await browser.close();
