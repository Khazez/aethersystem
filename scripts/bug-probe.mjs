import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
mkdirSync("screenshots/bugs", { recursive: true });
const b = await chromium.launch({ args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl"] });
const p = await b.newPage({ viewport:{width:1600,height:900} });
await p.goto("http://localhost:3210/ru", { waitUntil:"networkidle" });
await p.waitForTimeout(3000);

// Прокручиваем к секции проблемы и к концепции, снимаем
for (const [name, sel] of [["problem","#problem"],["concept","h2"]]) {
  const box = await p.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    el.scrollIntoView({ block: "start", behavior: "instant" });
    return true;
  }, sel);
  if (!box) { console.log(name, "не найден"); continue; }
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `screenshots/bugs/${name}.png` });
  console.log("снят", name);
}

// Ищем реальные пересечения блоков содержания
const overlaps = await p.evaluate(() => {
  const els = Array.from(document.querySelectorAll("#problem p, #problem dl, #problem ul, #problem li"));
  const out = [];
  for (let i = 0; i < els.length; i++) {
    for (let j = i + 1; j < els.length; j++) {
      const a = els[i].getBoundingClientRect();
      const c = els[j].getBoundingClientRect();
      if (els[i].contains(els[j]) || els[j].contains(els[i])) continue;
      const ox = Math.max(0, Math.min(a.right, c.right) - Math.max(a.left, c.left));
      const oy = Math.max(0, Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top));
      if (ox > 30 && oy > 20) {
        out.push(`${els[i].tagName}.${els[i].className.slice(0,24)} × ${els[j].tagName}.${els[j].className.slice(0,24)} (${Math.round(ox)}×${Math.round(oy)})`);
      }
    }
  }
  return out.slice(0, 6);
});
console.log(overlaps.length ? "ПЕРЕСЕЧЕНИЯ:\n  " + overlaps.join("\n  ") : "пересечений не найдено");
await b.close();
