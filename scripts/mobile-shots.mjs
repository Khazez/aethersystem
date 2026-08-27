/**
 * Снимки главной страницы с телефонного экрана в нескольких точках
 * прокрутки — чтобы глазами убедиться, что сцена под текстом видна,
 * а текст на ней читается.
 *
 *   BASE_URL=http://localhost:3210 node scripts/mobile-shots.mjs
 */
import { chromium, devices } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL || "http://localhost:3210";
const OUT = process.env.OUT || "screenshots/mobile";
const phone = devices["iPhone 13"];

/** Доли прокрутки и как назвать снимок. */
const POINTS = [
  [0.0, "01-первый-экран"],
  [0.03, "02-остановка-соединяет"],
  [0.08, "03-остановка-проверяет"],
  [0.13, "04-остановка-анализирует"],
  [0.3, "05-содержание"],
  [0.55, "06-жизненный-цикл"],
];

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ ...phone });
await page.goto(`${BASE}/ru`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);

for (const [k, name] of POINTS) {
  await page.evaluate((kk) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, max * kk);
  }, k);
  // Прокрутка сглажена (scrub), картинка догоняет не мгновенно.
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`${OUT}/${name}.png`);
}

/* Посадка снимается не по доле прокрутки, а по положению самой секции
   `[data-landing-stage]`. Долей это снимать нельзя: на телефоне секция
   занимает лишь 3 % высоты страницы, и «97 %» приходились уже на подвал,
   когда аппарат давно сел и ушёл из кадра. Момент посадки — когда
   секция ровно заняла экран. */
const landing = await page.evaluate(() => {
  const el = document.querySelector("[data-landing-stage]");
  if (!el) return null;
  const top = el.getBoundingClientRect().top + window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return Math.max(0, Math.min(max, Math.round(top)));
});

if (landing === null) {
  console.log("секции посадки нет — снимок пропущен");
} else {
  await page.evaluate((y) => window.scrollTo(0, y), landing);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/07-посадка.png` });
  console.log(`${OUT}/07-посадка.png (прокрутка ${landing})`);
}

await browser.close();
