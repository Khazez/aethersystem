/**
 * Делает светлую версию логотипа для тёмного фона сайта.
 *
 * Зачем. Заказчик прислал логотип, сделанный для светлого фона: средняя
 * яркость знака 34 из 255, тёмно-синие буквы. Фон сайта почти чёрный
 * (#04070a, яркость ~6) — на нём такой знак тонет, видно только голубой
 * росчерк.
 *
 * ⚠️ Это **временная мера**. Правильно — взять светлую версию у того,
 * кто рисовал логотип: она входит в обычный комплект наравне с
 * основной. Ещё лучше — вектор (.svg/.ai/.eps), тогда любые версии
 * делаются из одного источника.
 *
 * ── Почему не «просто инвертировать» ─────────────────────────────
 *
 * Пробовал первым делом: инверсия светлоты с сохранением тона. Текст и
 * знак получились хорошо, но **росчерк испортился** — он был светло-
 * голубым и стал тёмно-синим, то есть пропал на тёмном фоне.
 *
 * Разделить «тёмное» и «светлое» по яркости в этом логотипе нельзя:
 * росчерк (яркость 55–80) и надпись «SYSTEM & CO.» (64–73) лежат в
 * одном диапазоне, а по светлоте HSL они и вовсе меняются местами —
 * чистый насыщенный синий даёт低 светлоту при высокой яркости.
 *
 * ── Что делается вместо этого ────────────────────────────────────
 *
 * Два режима, оба гарантируют читаемость:
 *
 *   tint (по умолчанию) — все точки перекладываются в светлый диапазон
 *     яркости, порядок сохраняется. Градиент внутри знака остаётся,
 *     синий подтон тоже, но всё гарантированно светлое.
 *
 *   mono — сплошной почти белый силуэт по маске прозрачности.
 *     Ложится в монохромную стилистику сайта, где цвет только у акцента.
 *
 * Запуск:
 *   node scripts/make-logo-light.mjs <вход.png> [выход.png] [tint|mono]
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";

const IN = process.argv[2];
const OUT = process.argv[3] ?? "public/logo-light.png";
const MODE = process.argv[4] ?? "tint";

if (!IN) {
  console.error("укажите файл: node scripts/make-logo-light.mjs вход.png [выход.png] [tint|mono]");
  process.exit(1);
}

const dataUrl = `data:image/png;base64,${readFileSync(IN).toString("base64")}`;

const browser = await chromium.launch();
const page = await browser.newPage();

const out = await page.evaluate(async ({ url, mode }) => {
  const img = new Image();
  img.src = url;
  await img.decode();

  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const data = ctx.getImageData(0, 0, c.width, c.height);
  const p = data.data;

  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] === 0) continue;

    const L =
      0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2];

    /* Росчерк — единственное цветное пятно логотипа, и его хочется
       сохранить. Отделяется он не по яркости и не по светлоте (там он
       путается с надписью «SYSTEM & CO.»), а по паре признаков:
       красного канала в нём почти нет, а яркость выше, чем у знака.

       Замеры исходника:
         росчерк              R=0,      яркость 55–80
         «SYSTEM & CO.»       R=32–64,  яркость 64–73
         знак «A» и надпись   R=0,      яркость 2–30

       Отсюда правило: R < 24 И яркость > 45. */
    const isSwoosh = p[i] < 24 && L > 45;

    if (mode === "accent") {
      if (isSwoosh) {
        // Акцент сайта #4bc8e0 — стальной циан из палитры проекта.
        p[i] = 75; p[i + 1] = 200; p[i + 2] = 224;
      } else {
        p[i] = 226; p[i + 1] = 234; p[i + 2] = 240;
      }
      continue;
    }

    if (mode === "mono") {
      /* Сплошной почти белый. Слегка холодный, чтобы не спорить со
         стальным акцентом сайта. */
      p[i] = 226; p[i + 1] = 234; p[i + 2] = 240;
      continue;
    }

    /* Воспринимаемая яркость: именно её видит глаз, в отличие от
       светлоты HSL, которая для насыщенного синего врёт. */
    const lum =
      (0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2]) / 255;

    /* Перекладываем весь диапазон в светлый: 0.66..0.98. Порядок
       сохраняется, поэтому градиент внутри знака не пропадает, но
       даже самая тёмная точка становится светлее фона втрое. */
    const target = 0.98 - Math.min(1, lum / 0.45) * 0.32;

    /* Тон сохраняем, подмешивая исходный цвет к белому. Чем светлее
       результат, тем меньше подмеса — иначе получается ядовитый
       голубой вместо благородного холодного белого. */
    const tint = 0.16;
    const base = 255 * target;
    p[i] = Math.round(base * (1 - tint) + p[i] * tint * (target * 2));
    p[i + 1] = Math.round(base * (1 - tint) + p[i + 1] * tint * (target * 2));
    p[i + 2] = Math.round(
      Math.min(255, base * (1 - tint) + p[i + 2] * tint * (target * 2)),
    );
  }

  ctx.putImageData(data, 0, 0);
  const blob = await new Promise((res) => c.toBlob(res, "image/png"));
  return Array.from(new Uint8Array(await blob.arrayBuffer()));
}, { url: dataUrl, mode: MODE });

writeFileSync(OUT, Buffer.from(out));
console.log(`${IN} → ${OUT}  режим ${MODE}  (${(out.length / 1024).toFixed(0)} КБ)`);

await browser.close();
