/** Кадры полёта по всей длине страницы — от первого экрана до подвала. */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://localhost:3210";
const OUT = "screenshots/pageflight";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl"] });
const p = await b.newPage({ viewport:{width:1600,height:900} });
const errs=[]; p.on("pageerror",e=>errs.push(String(e)));
await p.goto(`${BASE}/ru`,{waitUntil:"networkidle"});
await p.waitForTimeout(3500);
const max = await p.evaluate(()=>document.documentElement.scrollHeight-window.innerHeight);
console.log("длина страницы:", max);
const has = await p.evaluate(()=>!!document.querySelector("[data-flight-backdrop] canvas"));
console.log("фоновая сцена:", has ? "есть" : "НЕТ");
for (const at of [0,0.12,0.28,0.45,0.62,0.8,0.95]) {
  await p.evaluate(y=>window.scrollTo({top:y,behavior:"instant"}), Math.round(max*at));
  await p.waitForTimeout(2400);
  await p.screenshot({path:`${OUT}/at-${String(Math.round(at*100)).padStart(2,"0")}.png`});
  console.log("снят", at);
}
await b.close();
console.log(errs.length ? "ОШИБКИ: "+errs.slice(0,3).join(" | ") : "ошибок нет");
