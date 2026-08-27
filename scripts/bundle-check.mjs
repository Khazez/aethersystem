/**
 * Проверяет, что тяжёлая библиотека three.js подгружается только там,
 * где действительно показывается трёхмерная сцена.
 *
 * ⚠️ Смысл проверки изменился 25.08.2026. Раньше сцена включалась
 * только на широких экранах, и здесь утверждалось, что телефон three.js
 * НЕ качает. Теперь сцена работает и на телефоне (в облегчённом виде),
 * поэтому библиотеку он получает — это осознанная плата за то, чтобы
 * сайт не выглядел мёртвым на устройстве, с которого его чаще всего
 * и открывают.
 *
 * Что осталось: при системном «уменьшить движение» сцены нет вовсе,
 * и three.js не грузится. Это единственный случай, где экономия
 * по-прежнему обязательна.
 *
 * Размер берётся из тела ответа, а не из заголовка content-length:
 * Next.js отдаёт файлы по частям, и заголовка там может не быть.
 *
 * Запуск: node scripts/bundle-check.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3210";

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});

async function measure(label, viewport, reducedMotion) {
  const page = await browser.newPage({ viewport, reducedMotion });

  let total = 0;
  let heaviest = 0;

  const pending = [];
  page.on("response", (r) => {
    if (!r.url().endsWith(".js")) return;
    pending.push(
      r
        .body()
        .then((buf) => {
          total += buf.length;
          if (buf.length > heaviest) heaviest = buf.length;
        })
        .catch(() => {}),
    );
  });

  await page.goto(`${BASE}/ru`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  await Promise.all(pending);

    // Фон полёта есть только там, где сцена включилась.
  const mode = (await page.locator("[data-flight-backdrop] canvas").count())
    ? "3d"
    : "2d";
  // Кусок с three.js заметно крупнее остальных — по нему и опознаём.
  const threeLoaded = heaviest > 400 * 1024;

  console.log(
    `${label} фон=${mode}  JS всего ≈${Math.round(total / 1024)} КБ  ` +
      `крупнейший кусок ≈${Math.round(heaviest / 1024)} КБ  ` +
      `three.js: ${threeLoaded ? "ЗАГРУЖЕН" : "не загружен"}`,
  );

  await page.close();
  return { mode, threeLoaded, total };
}

const wide = await measure("широкий экран  ", { width: 1600, height: 900 });
const narrow = await measure("узкий экран    ", { width: 390, height: 844 });
const calm = await measure(
  "уменьш. движение",
  { width: 1600, height: 900 },
  "reduce",
);

await browser.close();

console.log("");
let bad = 0;
const check = (name, ok) => {
  console.log(`${ok ? "  OK  " : " FAIL "} ${name}`);
  if (!ok) bad++;
};

check("на широком экране three.js загружается", wide.threeLoaded);
check("на широком экране сцена включилась", wide.mode === "3d");

check("на узком экране сцена включилась", narrow.mode === "3d");
check("на узком экране three.js загружается", narrow.threeLoaded);

/* Предел веса. Он не выведен из требований — это граница, за которой
   стоит остановиться и подумать, а не молча раздувать страницу
   дальше. Сейчас телефон получает столько же скриптов, сколько
   монитор: облегчается сама отрисовка, а не набор файлов. */
const NARROW_LIMIT_KB = 1600;
const narrowKb = Math.round(narrow.total / 1024);
check(
  `на узком экране скрипты укладываются в ${NARROW_LIMIT_KB} КБ (сейчас ${narrowKb} КБ)`,
  narrowKb <= NARROW_LIMIT_KB,
);

check("при «уменьшить движение» three.js НЕ загружается", !calm.threeLoaded);
check("при «уменьшить движение» сцены нет", calm.mode === "2d");

process.exitCode = bad ? 1 : 0;
