/**
 * Рисует картинку для превью ссылки — `public/og.png`, 1200×630.
 *
 * Зачем. Когда ссылку на сайт кидают в WhatsApp, Telegram, LinkedIn или
 * вставляют в письмо, там показывается карточка: заголовок, описание и
 * картинка. Без картинки карточка выглядит бедно, а для сайта компании,
 * который рассылают государственным органам и партнёрам, это первое
 * впечатление.
 *
 * Почему не генерацией на лету (`opengraph-image.tsx` в Next.js):
 * тот способ рисует картинку на сервере при каждом запросе и требует
 * отдельно подгружать шрифт с кириллицей — лишняя точка отказа. Здесь
 * картинка рисуется один раз при разработке и лежит обычным файлом.
 *
 * Когда перезапускать: если сменится логотип, название или слоган.
 *
 *     node scripts/make-og.mjs
 */

import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/* Логотип вставляем прямо в разметку строкой base64: браузер в скрипте
   открывает страницу из памяти, и обычный путь к файлу он бы не нашёл. */
const logo = readFileSync(join(root, "public", "logo-mark.png")).toString("base64");

const html = `
<!doctype html>
<meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    width: 1200px;
    height: 630px;
    background: #04070a;
    font-family: "Inter", system-ui, sans-serif;
    color: #e8eef4;
    overflow: hidden;
    position: relative;
    /* Без этого Windows рисует текст субпиксельно, и на снимке у букв
       появляется цветная кайма — на тёмном фоне она видна как красные
       точки по краю надписи. */
    -webkit-font-smoothing: antialiased;
  }

  /* Сетка воздушного пространства — тот же мотив, что на сайте. */
  .grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(75, 200, 224, .16) 1px, transparent 1px),
      linear-gradient(90deg, rgba(75, 200, 224, .16) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: radial-gradient(120% 90% at 78% 22%, #000 0%, transparent 68%);
  }

  .glow {
    position: absolute;
    top: -180px;
    right: -120px;
    width: 760px;
    height: 620px;
    background: radial-gradient(circle at 50% 50%, rgba(75, 200, 224, .22), transparent 62%);
  }

  .frame {
    position: absolute;
    inset: 40px;
    border: 1px solid rgba(75, 200, 224, .22);
  }

  /* Уголки-засечки: приборный мотив айдентики продукта. */
  .corner {
    position: absolute;
    width: 26px;
    height: 26px;
    border: 2px solid #4bc8e0;
  }
  .tl { top: -1px; left: -1px; border-right: 0; border-bottom: 0; }
  .tr { top: -1px; right: -1px; border-left: 0; border-bottom: 0; }
  .bl { bottom: -1px; left: -1px; border-right: 0; border-top: 0; }
  .br { bottom: -1px; right: -1px; border-left: 0; border-top: 0; }

  .content {
    position: absolute;
    inset: 92px 96px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .top { display: flex; align-items: center; gap: 22px; }
  .top img { height: 64px; width: auto; }
  .name { font-size: 30px; font-weight: 600; letter-spacing: .1em; line-height: 1.1; }
  .name span { display: block; font-size: 15px; font-weight: 400; letter-spacing: .34em; color: #94a6b6; }

  h1 {
    font-size: 62px;
    font-weight: 500;
    letter-spacing: -.02em;
    line-height: 1.08;
    max-width: 15ch;
  }

  .tagline {
    font-family: "IBM Plex Mono", monospace;
    font-size: 18px;
    letter-spacing: .26em;
    text-transform: uppercase;
    color: #4bc8e0;
    margin-top: 26px;
  }

  .bottom {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    font-family: "IBM Plex Mono", monospace;
    font-size: 17px;
    letter-spacing: .16em;
    color: #94a6b6;
  }
  .bottom strong { color: #e8eef4; font-weight: 500; }
</style>

<div class="grid"></div>
<div class="glow"></div>
<div class="frame">
  <i class="corner tl"></i><i class="corner tr"></i>
  <i class="corner bl"></i><i class="corner br"></i>
</div>

<div class="content">
  <div class="top">
    <img src="data:image/png;base64,${logo}" alt="">
    <div class="name">AETHER SYSTEM<span>&amp; CO.</span></div>
  </div>

  <div>
    <h1>Цифровая инфраструктура для автономной авиации</h1>
    <p class="tagline">Technology for the Next Airspace</p>
  </div>

  <div class="bottom">
    <span><strong>AETHER NEXUS</strong> · единая платформа</span>
    <span>aethersystem.kz</span>
  </div>
</div>
`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});

await page.setContent(html, { waitUntil: "networkidle" });
/* Ждём шрифты: без этого первый кадр иногда снимается системным
   шрифтом, и надписи расползаются по ширине. */
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);

const shot = await page.screenshot({ type: "png" });
writeFileSync(join(root, "public", "og.png"), shot);

console.log("готово: public/og.png — " + Math.round(shot.length / 1024) + " КБ");

await browser.close();
