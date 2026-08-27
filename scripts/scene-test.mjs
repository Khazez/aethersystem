/**
 * Проверка главной страницы: полёт сквозь облака и закреплённая сцена
 * жизненного цикла.
 *
 * Что проверяется без ручного открытия браузера:
 *  1. На широком экране запускается трёхмерный полёт
 *  2. Прокрутка ведёт полёт — остановки сменяют друг друга
 *  3. Содержание остановок берётся из описания продукта
 *  4. На узком экране полёт тоже работает — в облегчённом виде
 *  5. При «уменьшить движение» прокрутка не захватывается, а то же
 *     содержание показано обычным списком
 *  6. Разделы обратной связи, контактов и команды на месте
 *  7. Консоль браузера чистая
 *
 * Запуск: npm run build && npx next start -p 3210
 *         BASE_URL=http://localhost:3210 npm run test:scene
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3210";
const OUT = process.env.OUT_DIR ?? "screenshots/scene";
mkdirSync(OUT, { recursive: true });

const errors = [];
let failures = 0;

function check(name, ok, detail = "") {
  console.log(`${ok ? "  OK  " : " FAIL "} ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
}


/** Холст фонового полёта. Он один на всю страницу и лежит под содержанием. */
const flightCanvases = (p) =>
  p.evaluate(
    () => document.querySelectorAll("[data-flight-backdrop] canvas").length,
  );

const browser = await chromium.launch({
  // Без флагов WebGL в headless выключен и сцена ложно отчиталась бы
  // как недоступная.
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});

/* ================= Широкий экран ================= */
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
/* Пока в public/models нет drone.glb, сцена штатно получает на него 404
   и остаётся с моделью из кода. Это ожидаемо, ошибкой не считаем.
   Любые другие сообщения в консоли — считаем. */
const isExpected = (text) =>
  text.includes("404") || text.toLowerCase().includes("failed to load resource");

page.on("console", (m) => {
  if (m.type() === "error" && !isExpected(m.text())) errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`${BASE}/ru`, { waitUntil: "networkidle" });
await page.waitForTimeout(3500);

// --- 1. Полёт запущен ---
const flightHeight = await page.evaluate(() => {
  const el = document.querySelector("[data-hero-block]")?.closest("section");
  return el ? el.getBoundingClientRect().height : 0;
});
check(
  "секция полёта присутствует на широком экране",
  flightHeight > 2000,
  `высота ${Math.round(flightHeight)}px`,
);

const canvasCount = await flightCanvases(page);
check("сцена полёта запущена фоном страницы", canvasCount === 1, `холстов: ${canvasCount}`);

await page.screenshot({ path: `${OUT}/01-flight-start.png` });

// --- 2. Прокрутка сменяет остановки ---
const visibleStop = async () =>
  page.evaluate(() => {
    const blocks = Array.from(document.querySelectorAll("[data-stop]"));
    const shown = blocks.filter((b) => {
      const s = getComputedStyle(b);
      return s.visibility !== "hidden" && Number(s.opacity) > 0.5;
    });
    return shown.length ? shown[0].textContent.trim().split("\n")[0].slice(0, 40) : "";
  });

const seen = [];
for (const at of [0.19, 0.35, 0.51, 0.66, 0.82]) {
  await page.evaluate(
    (y) => window.scrollTo({ top: y, behavior: "instant" }),
    Math.round(flightHeight * at),
  );
  await page.waitForTimeout(1600);
  const s = await visibleStop();
  if (s) seen.push(s);
}

const unique = [...new Set(seen)];
check(
  "прокрутка сменяет остановки полёта",
  unique.length >= 4,
  `показано разных остановок: ${unique.length} из 5`,
);

// --- 3. Содержание остановок — из описания продукта ---
const stopText = await page.evaluate(() =>
  Array.from(document.querySelectorAll("[data-stop]"))
    .map((b) => b.textContent)
    .join(" "),
);
const formulaWords = ["CONNECT", "CONTROL", "COMPLY", "OPERATE", "ANALYZE"];
const missing = formulaWords.filter((w) => !stopText.includes(w));
check(
  "на остановках все пять функций платформы",
  missing.length === 0,
  missing.length
    ? "нет: " + missing.join(", ")
    : "CONNECT · CONTROL · COMPLY · OPERATE · ANALYZE",
);

await page.screenshot({ path: `${OUT}/02-flight-stop.png` });

// --- Пункт «Контакты» не должен дублироваться в шапке ---
const contactsInHeader = await page.evaluate(() => {
  const header = document.querySelector("header");
  if (!header) return -1;
  return Array.from(header.querySelectorAll("a"))
    .filter((a) => (a.getAttribute("href") || "").endsWith("/contacts"))
    .length;
});
check(
  "«Контакты» в шапке ровно один раз",
  contactsInHeader === 1,
  `ссылок: ${contactsInHeader}`,
);

// --- Отдельная секция для посадки ---
check(
  "есть отдельная секция посадки",
  (await page.locator("[data-landing-stage]").count()) === 1,
);

// --- 4. Полёт продолжается до самого низа страницы ---
const bottomOk = await page.evaluate(async () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo({ top: max, behavior: "instant" });
  await new Promise((r) => setTimeout(r, 800));
  const c = document.querySelector("[data-flight-backdrop] canvas");
  if (!c) return false;
  const r = c.getBoundingClientRect();
  // Холст закреплён на экране, значит виден и в самом низу страницы.
  return r.width > 0 && r.height > 0 && r.top < 10;
});
check("полёт продолжается до конца страницы", bottomOk);

await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
await page.waitForTimeout(500);

// --- 5. Закреплённая сцена жизненного цикла ---
check(
  "сцена жизненного цикла присутствует",
  (await page.locator("[data-stage]").count()) === 1,
);

await page.close();

/* ================= Узкий экран ================= */
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
mobile.on("pageerror", (e) => errors.push("[mobile] " + String(e)));
await mobile.goto(`${BASE}/ru`, { waitUntil: "networkidle" });
await mobile.waitForTimeout(1500);

/* До 25.08.2026 здесь проверялось обратное — что на узком экране
   сцены НЕТ. Так и было задумано изначально: три с лишним мегабайта
   материалов и полупрозрачные облака считались неподъёмными для
   телефона. На деле сайт там выглядел мёртвым, а телефон — главное
   устройство, с которого его открывают. Теперь сцена работает и на
   телефоне, в облегчённом виде (см. `src/components/scene/quality.ts`),
   и проверки утверждают именно это. */
check(
  "на узком экране полёт запускается",
  (await flightCanvases(mobile)) === 1,
);

/* Плотность точек ограничена профилем: у телефона она доходит до 3,
   и без предела кадр стоил бы вшестеро дороже, чем на мониторе. */
const mobileBuffer = await mobile.evaluate(() => {
  const c = document.querySelector("[data-flight-backdrop] canvas");
  return c ? c.width / c.getBoundingClientRect().width : 0;
});
check(
  "на узком экране плотность точек ограничена",
  mobileBuffer > 0 && mobileBuffer <= 1.3,
  `точек на пиксель: ${mobileBuffer.toFixed(2)}`,
);

/* Остановки сменяются и на телефоне. Шаг прокрутки мелкий: секция
   остановок занимает лишь пятую часть страницы, крупным шагом часть
   остановок проскакивает мимо замера. */
const mobileSeen = new Set();
for (let i = 0; i <= 30; i++) {
  await mobile.evaluate((k) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: max * k, behavior: "instant" });
  }, i / 30);
  await mobile.waitForTimeout(650);
  const vis = await mobile.evaluate(() =>
    Array.from(document.querySelectorAll("[data-stop]"))
      .filter((el) => getComputedStyle(el).visibility === "visible")
      .map((el) => el.querySelector("h2")?.textContent?.trim() || ""),
  );
  vis.filter(Boolean).forEach((v) => mobileSeen.add(v));
}
check(
  "на узком экране прокрутка сменяет остановки",
  mobileSeen.size >= 4,
  `показано разных остановок: ${mobileSeen.size} из 5`,
);

await mobile.evaluate(() =>
  window.scrollTo({ top: 0, behavior: "instant" }),
);
await mobile.waitForTimeout(600);

check(
  "на узком экране сцена жизненного цикла работает",
  await mobile.locator("[data-stage]").isVisible(),
);

/* Вертикальная страница не должна ездить вбок: это первый признак
   вёрстки, не рассчитанной на узкий экран. */
const overflow = await mobile.evaluate(
  () => document.documentElement.scrollWidth - window.innerWidth,
);
check(
  "на узком экране нет горизонтальной прокрутки",
  overflow <= 1,
  overflow > 1 ? `шире экрана на ${overflow} точек` : "",
);

await mobile.screenshot({ path: `${OUT}/03-mobile.png` });
await mobile.close();

/* ================= «Уменьшить движение» ================= */
const calm = await browser.newPage({
  viewport: { width: 1600, height: 900 },
  reducedMotion: "reduce",
});
calm.on("pageerror", (e) => errors.push("[reduced] " + String(e)));
await calm.goto(`${BASE}/ru`, { waitUntil: "networkidle" });
await calm.waitForTimeout(1500);

check(
  "при «уменьшить движение» полёт не запускается",
  (await flightCanvases(calm)) === 0,
);
check(
  "при «уменьшить движение» содержание доступно списком",
  (await calm.locator("li", { hasText: "ANALYZE" }).count()) > 0,
);
await calm.screenshot({ path: `${OUT}/04-reduced-motion.png` });
await calm.close();

/* ================= Разделы сайта на месте ================= */
const nav = await browser.newPage({ viewport: { width: 1600, height: 900 } });
nav.on("pageerror", (e) => errors.push("[nav] " + String(e)));

for (const [path, label] of [
  ["/ru/contacts", "контакты"],
  ["/ru/team", "команда"],
  ["/ru/about", "о компании"],
  ["/ru/product", "продукт"],
  ["/ru/solutions", "решения"],
]) {
  const res = await nav.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  check(`раздел «${label}» открывается`, res?.status() === 200, `${path} → ${res?.status()}`);
}

/* Формы удалены по решению заказчика: неработающая анкета хуже, чем её
   отсутствие. Проверяем, что страниц действительно нет и на них нигде
   не осталось ссылок. */
for (const [path, label] of [
  ["/ru/feedback", "обращение"],
  ["/ru/partnership", "сотрудничество"],
]) {
  const res = await nav.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  check(`удалённая форма «${label}» отдаёт 404`, res?.status() === 404, `${path} → ${res?.status()}`);
}

await nav.goto(`${BASE}/ru`, { waitUntil: "networkidle" });
const deadLinks = await nav.evaluate(() =>
  Array.from(document.querySelectorAll("a[href]"))
    .map((a) => a.getAttribute("href"))
    .filter((h) => h && (h.includes("/feedback") || h.includes("/partnership"))),
);
check(
  "на главной не осталось ссылок на удалённые формы",
  deadLinks.length === 0,
  deadLinks.join(", "),
);
await nav.close();

await browser.close();

/* ================= Итог ================= */
console.log("");
check("нет ошибок в консоли браузера", errors.length === 0, errors.slice(0, 4).join(" | "));

console.log("");
if (failures === 0) {
  console.log("ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ. Скриншоты: " + OUT);
} else {
  console.log(`ПРОВАЛЕНО ПРОВЕРОК: ${failures}. Скриншоты: ${OUT}`);
  process.exitCode = 1;
}
