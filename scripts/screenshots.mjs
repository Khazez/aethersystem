/**
 * Снимает скриншоты страниц сайта — для проверки вёрстки без ручного
 * открытия браузера. Запуск: node scripts/screenshots.mjs
 *
 * Требует запущенный сервер: npm run build && npx next start -p 3200
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3200";
const OUT = process.env.OUT_DIR ?? "screenshots";

const pages = [
  { name: "01-home-top", path: "/ru", scroll: 0 },
  { name: "02-home-formula", path: "/ru", scroll: 1000 },
  { name: "03-home-problem", path: "/ru", scroll: 2100 },
  { name: "04-home-modules", path: "/ru", scroll: 4200 },
  { name: "05-home-grid", path: "/ru", scroll: 5600 },
  { name: "06-home-roadmap", path: "/ru", scroll: 7600 },
  { name: "07-product", path: "/ru/product", scroll: 0 },
  { name: "08-product-caps", path: "/ru/product", scroll: 1500 },
  { name: "09-about", path: "/ru/about", scroll: 0 },
  { name: "10-solutions", path: "/ru/solutions", scroll: 700 },
  { name: "11-partnership", path: "/ru/partnership", scroll: 1500 },
  { name: "12-contacts", path: "/ru/contacts", scroll: 500 },
  { name: "13-team", path: "/ru/team", scroll: 400 },
  { name: "14-en-home", path: "/en", scroll: 0 },
  { name: "15-kk-home", path: "/kk", scroll: 0 },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1600, height: 950 },
  deviceScaleFactor: 1,
});

for (const item of pages) {
  await page.goto(`${BASE}${item.path}`, { waitUntil: "networkidle" });

  if (item.scroll) {
    await page.evaluate((y) => window.scrollTo(0, y), item.scroll);
    // Даём время анимациям появления доиграть.
    await page.waitForTimeout(1100);
  } else {
    await page.waitForTimeout(900);
  }

  await page.screenshot({ path: `${OUT}/${item.name}.png` });
  console.log("✓", item.name);
}

// Мобильная версия — проверяем, что вёрстка не разъезжается.
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(`${BASE}/ru`, { waitUntil: "networkidle" });
await mobile.waitForTimeout(900);
await mobile.screenshot({ path: `${OUT}/16-mobile-home.png` });
console.log("✓ 16-mobile-home");

await browser.close();
