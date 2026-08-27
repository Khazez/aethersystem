/**
 * Проверка, что органы управления панели действительно работают:
 * ручки крутятся, тумблеры переключаются, приборы реагируют.
 */
import { chromium } from "playwright";

const b = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
const errs = [];
p.on("pageerror", (e) => errs.push(String(e)));

await p.goto("http://localhost:3200/prototype", { waitUntil: "networkidle" });
await p.waitForTimeout(3500);
await p.screenshot({ path: "screenshots/proto/I0-default.png" });
console.log("I0 исходное состояние");

// --- Ручка ЯРКОСТЬ: тянем вверх ---
const bright = p.getByRole("slider", { name: "ЯРКОСТЬ" });
const bBox = await bright.boundingBox();
const before = await bright.getAttribute("aria-valuenow");

await p.mouse.move(bBox.x + bBox.width / 2, bBox.y + bBox.height / 2);
await p.mouse.down();
await p.mouse.move(bBox.x + bBox.width / 2, bBox.y + bBox.height / 2 - 60, { steps: 12 });
await p.mouse.up();
await p.waitForTimeout(500);

const after = await bright.getAttribute("aria-valuenow");
console.log(`ЯРКОСТЬ: ${before}% -> ${after}%  ${before !== after ? "РАБОТАЕТ" : "НЕ РАБОТАЕТ"}`);
await p.screenshot({ path: "screenshots/proto/I1-brightness-up.png" });

// --- Ручка КОНТРАСТ: клавиатурой ---
const contrast = p.getByRole("slider", { name: "КОНТРАСТ" });
const cBefore = await contrast.getAttribute("aria-valuenow");
await contrast.focus();
for (let i = 0; i < 4; i++) await p.keyboard.press("ArrowDown");
await p.waitForTimeout(400);
const cAfter = await contrast.getAttribute("aria-valuenow");
console.log(`КОНТРАСТ клавиатурой: ${cBefore}% -> ${cAfter}%  ${cBefore !== cAfter ? "РАБОТАЕТ" : "НЕ РАБОТАЕТ"}`);

// --- Тумблер ТЕСТ ЛАМП ---
const lamp = p.getByRole("button", { name: /ТЕСТ ЛАМП/ });
const lBefore = await lamp.getAttribute("aria-pressed");
await lamp.click();
await p.waitForTimeout(1400);
const lAfter = await lamp.getAttribute("aria-pressed");
console.log(`ТЕСТ ЛАМП: ${lBefore} -> ${lAfter}  ${lBefore !== lAfter ? "РАБОТАЕТ" : "НЕ РАБОТАЕТ"}`);
const statusText = await p.locator("text=ТЕСТ ЛАМП — ВСЕ ИНДИКАТОРЫ").count();
console.log(`Строка состояния сменилась: ${statusText > 0 ? "ДА" : "НЕТ"}`);
await p.screenshot({ path: "screenshots/proto/I2-lamp-test.png" });

// Возвращаем в норму
await lamp.click();
await p.waitForTimeout(900);

// --- Тумблер ЗАЛИВ. СВЕТ ---
const flood = p.getByRole("button", { name: /ЗАЛИВ\. СВЕТ/ });
const fBefore = await flood.getAttribute("aria-pressed");
await flood.click();
await p.waitForTimeout(700);
const fAfter = await flood.getAttribute("aria-pressed");
console.log(`ЗАЛИВ. СВЕТ: ${fBefore} -> ${fAfter}  ${fBefore !== fAfter ? "РАБОТАЕТ" : "НЕ РАБОТАЕТ"}`);

// --- Вращение модели БПЛА ---
const viewer = p.locator("canvas").first();
const vBox = await viewer.boundingBox();
await p.mouse.move(vBox.x + vBox.width / 2, vBox.y + vBox.height / 2);
await p.mouse.down();
await p.mouse.move(vBox.x + vBox.width / 2 + 120, vBox.y + vBox.height / 2 + 30, { steps: 15 });
await p.mouse.up();
await p.waitForTimeout(900);
await p.screenshot({ path: "screenshots/proto/I3-drone-rotated.png" });
console.log("I3 модель повёрнута мышью");

console.log(errs.length ? "ОШИБКИ: " + errs.join(" | ") : "ошибок консоли нет");
await b.close();
