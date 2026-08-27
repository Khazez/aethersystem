/**
 * Проверка главной страницы на телефонном экране.
 *
 * Зачем нужен отдельный скрипт: до августа 2026 сцена полёта на узком
 * экране не включалась вовсе, и все существующие проверки гоняли только
 * ширину 1280. Этот скрипт открывает страницу так, как её видит телефон:
 * узкое окно, тройная плотность точек, сенсорный ввод.
 *
 * Смотрит три вещи:
 *   1. появился ли холст сцены;
 *   2. сколько кадров в секунду он даёт;
 *   3. сменяются ли блоки остановок при прокрутке.
 *
 * ВАЖНО про цифру кадров: браузер здесь рисует программно
 * (swiftshader), без видеокарты. У настоящего телефона видеочип есть,
 * поэтому реальная частота будет заметно выше. Цифра нужна для
 * сравнения «до/после», а не как обещание.
 *
 *   BASE_URL=http://localhost:3210 node scripts/mobile-probe.mjs
 */
import { chromium, devices } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3210";
const phone = devices["iPhone 13"];

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ ...phone });

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto(`${BASE}/ru`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);

const w = phone.viewport.width;
const h = phone.viewport.height;
console.log(`экран: ${w}×${h}, плотность точек ${phone.deviceScaleFactor}`);

/* --- 1. Холст сцены --------------------------------------------- */
const canvas = await page.evaluate(() => {
  const host = document.querySelector("[data-flight-backdrop]");
  const c = host?.querySelector("canvas");
  if (!c) return null;
  const r = c.getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height), buffer: c.width };
});
console.log(
  canvas
    ? `холст сцены: есть, ${canvas.w}×${canvas.h} точек экрана, буфер ${canvas.buffer}`
    : "холст сцены: НЕТ",
);

/* --- 2. Частота кадров ------------------------------------------ */
const fps = await page.evaluate(
  () =>
    new Promise((res) => {
      let n = 0;
      const t0 = performance.now();
      const tick = () => {
        n++;
        if (performance.now() - t0 < 4000) requestAnimationFrame(tick);
        else res({ frames: n, ms: performance.now() - t0 });
      };
      requestAnimationFrame(tick);
    }),
);
console.log(
  `кадров: ${fps.frames} за ${Math.round(fps.ms)} мс → ` +
    `${(fps.frames / (fps.ms / 1000)).toFixed(1)} кадр/с (программный рендер)`,
);

/* --- 3. Смена блоков при прокрутке ------------------------------- */
/* Блоки остановок скрыты через visibility, поэтому считаем видимые. */
const seen = new Set();
const steps = 14;
for (let i = 0; i <= steps; i++) {
  await page.evaluate((k) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, max * k);
  }, i / steps);
  await page.waitForTimeout(700);

  const visible = await page.evaluate(() =>
    [...document.querySelectorAll("[data-stop]")]
      .filter((el) => getComputedStyle(el).visibility === "visible")
      .map((el) => el.querySelector("h2")?.textContent?.trim() || "?"),
  );
  visible.forEach((v) => seen.add(v));
}
console.log(`остановок показано за прокрутку: ${seen.size} из 5`);
seen.forEach((v) => console.log(`  · ${v}`));

/* --- 4. Горизонтальная прокрутка --------------------------------- */
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth - window.innerWidth,
);
console.log(
  overflow > 1
    ? `ГОРИЗОНТАЛЬНАЯ ПРОКРУТКА: страница шире экрана на ${overflow} точек`
    : "горизонтальной прокрутки нет",
);

console.log(
  errors.length ? `ОШИБОК В КОНСОЛИ: ${errors.length}` : "консоль чистая",
);
errors.slice(0, 5).forEach((e) => console.log(`  · ${e}`));

await browser.close();
