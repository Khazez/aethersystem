/** Кадры посадки: конец прокрутки, затем возврат наверх — взлёт. */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://localhost:3210";
const OUT = "screenshots/landing";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl"] });
const p = await b.newPage({ viewport:{width:1600,height:900} });
const errs=[]; p.on("pageerror",e=>errs.push(String(e)));
await p.goto(`${BASE}/ru`,{waitUntil:"networkidle"});
await p.waitForTimeout(3500);
const max = await p.evaluate(()=>document.documentElement.scrollHeight-window.innerHeight);
for (const at of [0.88,0.93,0.97,1.0]) {
  await p.evaluate(y=>window.scrollTo({top:y,behavior:"instant"}), Math.round(max*at));
  await p.waitForTimeout(3000);
  await p.screenshot({path:`${OUT}/down-${Math.round(at*100)}.png`});
  console.log("снижение", at);
}
// обратно наверх — должен взлететь
for (const at of [0.9,0.8]) {
  await p.evaluate(y=>window.scrollTo({top:y,behavior:"instant"}), Math.round(max*at));
  await p.waitForTimeout(3000);
  await p.screenshot({path:`${OUT}/up-${Math.round(at*100)}.png`});
  console.log("взлёт", at);
}
await b.close();
console.log(errs.length ? "ОШИБКИ: "+errs.slice(0,3).join(" | ") : "ошибок нет");
