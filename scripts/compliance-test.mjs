import { chromium } from "playwright";
const b = await chromium.launch({ args:["--use-gl=angle","--use-angle=swiftshader"] });
const p = await b.newPage({ viewport:{width:1600,height:1000} });
const errs=[]; p.on("pageerror",e=>errs.push(String(e)));
await p.goto("http://localhost:3200/prototype",{waitUntil:"networkidle"});

await p.getByText("Проверьте операцию сами").scrollIntoViewIfNeeded();
await p.waitForTimeout(1200);

const verdict = async () => {
  await p.waitForTimeout(900);
  for (const v of ["COMPLIANT","CONDITIONAL","NON-COMPLIANT"]) {
    if (await p.locator(`text=${v}`).first().isVisible().catch(()=>false)) {
      const t = await p.locator("p.font-mono").filter({hasText:/^(COMPLIANT|CONDITIONAL|NON-COMPLIANT)$/}).first().textContent();
      return t.trim();
    }
  }
  return "?";
};

// 1. Безопасный сценарий
await p.selectOption("#zone","uncontrolled");
await p.selectOption("#craft","light");
await p.selectOption("#time","day");
await p.locator("#altitude").fill("80");
console.log("Низкий полёт, свободная зона, лёгкий БВС ->", await verdict());
await p.screenshot({path:"screenshots/proto/C1-compliant.png"});

// 2. Ночь + город = условно
await p.selectOption("#zone","urban");
await p.selectOption("#time","night");
console.log("Город + ночь ->", await verdict());
await p.screenshot({path:"screenshots/proto/C2-conditional.png"});

// 3. Превышение высоты = отказ
await p.locator("#altitude").fill("180");
console.log("Высота 180 м ->", await verdict());
await p.screenshot({path:"screenshots/proto/C3-noncompliant.png"});

// 4. Аэродром = отказ
await p.locator("#altitude").fill("60");
await p.selectOption("#zone","airport");
console.log("Приаэродромная территория ->", await verdict());

console.log(errs.length?"ОШИБКИ: "+errs.join("|"):"ошибок нет");
await b.close();
