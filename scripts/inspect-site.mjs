/**
 * Разбор чужого сайта: снимает кадры по мере прокрутки и собирает
 * техническую сводку.
 *
 * Нужен, чтобы смотреть присланные референсы — дизайн, поведение
 * прокрутки, качество трёхмерной сцены — не полагаясь на пересказ.
 *
 * Запуск:
 *   node scripts/inspect-site.mjs https://example.com
 *   node scripts/inspect-site.mjs https://example.com mobile
 *
 * Результат: screenshots/inspect/<домен>/ и сводка в консоли.
 *
 * Ограничения, о которых надо помнить, читая результат:
 *  - это отдельные кадры, а не видео: плавность прокрутки по ним
 *    не оценить;
 *  - WebGL рисуется программно, без видеокарты: картинка та же,
 *    но частота кадров нерепрезентативна;
 *  - сайты за паролем и с защитой от роботов могут не открыться.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const target = process.argv[2];
const mode = process.argv[3] ?? "desktop";

if (!target) {
  console.error("Укажите адрес: node scripts/inspect-site.mjs https://…");
  process.exit(1);
}

const url = target.startsWith("http") ? target : `https://${target}`;
const host = new URL(url).hostname.replace(/^www\./, "");
const OUT = `screenshots/inspect/${host}${mode === "mobile" ? "-mobile" : ""}`;
mkdirSync(OUT, { recursive: true });

const viewport =
  mode === "mobile"
    ? { width: 390, height: 844 }
    : { width: 1600, height: 900 };

const browser = await chromium.launch({
  // Без этих флагов WebGL в headless выключен, и трёхмерные сцены
  // на референсе просто не отрисуются.
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});

const page = await browser.newPage({
  viewport,
  // Часть сайтов отдаёт урезанную версию роботам.
  userAgent:
    mode === "mobile"
      ? undefined
      : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
});

const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 140)));

/** Суммарный вес по типам ресурсов. */
const weight = { js: 0, css: 0, image: 0, media: 0, font: 0, other: 0 };
const pending = [];

page.on("response", (r) => {
  const type = r.request().resourceType();
  const bucket =
    type === "script"
      ? "js"
      : type === "stylesheet"
        ? "css"
        : type === "image"
          ? "image"
          : type === "media"
            ? "media"
            : type === "font"
              ? "font"
              : "other";
  pending.push(
    r
      .body()
      .then((b) => {
        weight[bucket] += b.length;
      })
      .catch(() => {}),
  );
});

console.log(`Открываю ${url} (${mode}, ${viewport.width}×${viewport.height})…`);

let status = "?";
try {
  const res = await page.goto(url, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  status = res?.status();
} catch (e) {
  console.log("Страница грузилась дольше лимита, снимаю что успело:", String(e).slice(0, 90));
}

await page.waitForTimeout(4000);

const title = await page.title().catch(() => "");
const height = await page.evaluate(
  () => document.documentElement.scrollHeight,
);

/* --- Что за технологии --- */
const tech = await page.evaluate(() => {
  const w = window;
  const found = [];
  const known = {
    gsap: "GSAP",
    THREE: "three.js",
    Lenis: "Lenis",
    ScrollTrigger: "ScrollTrigger",
    __NEXT_DATA__: "Next.js",
    __NUXT__: "Nuxt",
    Swiper: "Swiper",
    barba: "Barba",
    locomotive: "Locomotive Scroll",
  };
  for (const [key, name] of Object.entries(known)) {
    if (w[key]) found.push(name);
  }

  const canvases = Array.from(document.querySelectorAll("canvas")).map((c) => ({
    w: c.width,
    h: c.height,
    webgl: !!(
      c.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) ||
      c.getContext("webgl")
    ),
  }));

  const videos = document.querySelectorAll("video").length;

  // Шрифты, реально применённые к заголовкам и тексту.
  const fontOf = (sel) => {
    const el = document.querySelector(sel);
    return el ? getComputedStyle(el).fontFamily.split(",")[0].trim() : "";
  };

  return {
    libs: found,
    canvases,
    videos,
    headingFont: fontOf("h1") || fontOf("h2"),
    bodyFont: fontOf("p") || fontOf("body"),
    bg: getComputedStyle(document.body).backgroundColor,
  };
});

/* --- Кадры по мере прокрутки --- */
const marks = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1];
const maxScroll = Math.max(0, height - viewport.height);

for (const at of marks) {
  await page.evaluate(
    (y) => window.scrollTo({ top: y, behavior: "instant" }),
    Math.round(maxScroll * at),
  );
  // Даём анимациям, привязанным к прокрутке, доиграть до позиции.
  await page.waitForTimeout(2200);
  const name = `${String(Math.round(at * 100)).padStart(3, "0")}.png`;
  await page.screenshot({ path: `${OUT}/${name}` });
  console.log("  снят", name);
}

await Promise.all(pending);
await browser.close();

/* --- Сводка --- */
const kb = (n) => `${Math.round(n / 1024)} КБ`;
const total = Object.values(weight).reduce((a, b) => a + b, 0);

console.log("");
console.log("─".repeat(58));
console.log("Заголовок:      ", title);
console.log("Ответ сервера:  ", status);
console.log("Высота страницы:", height, "px  (экранов:", (height / viewport.height).toFixed(1) + ")");
console.log("Фон страницы:   ", tech.bg);
console.log("Шрифты:          заголовки", tech.headingFont, "| текст", tech.bodyFont);
console.log("Библиотеки:     ", tech.libs.length ? tech.libs.join(", ") : "не опознаны");
console.log("Холстов:        ", tech.canvases.length, tech.canvases.length ? JSON.stringify(tech.canvases) : "");
console.log("Видео на стр.:  ", tech.videos);
console.log("");
console.log("Вес: всего", kb(total));
for (const [k, v] of Object.entries(weight)) {
  if (v > 0) console.log(`   ${k.padEnd(6)} ${kb(v)}`);
}
console.log("");
console.log(errors.length ? "Ошибки страницы: " + errors.slice(0, 3).join(" | ") : "Ошибок страницы нет");
console.log("Кадры:", OUT);
