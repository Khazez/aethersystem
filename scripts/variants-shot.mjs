import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
mkdirSync("screenshots/var", { recursive: true });

const b = await chromium.launch({ args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl"] });
const errs = [];

for (const v of ["a","b","c","d"]) {
  const p = await b.newPage({ viewport:{width:1600,height:950} });
  p.on("pageerror", e => errs.push(`${v}: ${e}`));
  await p.goto(`http://localhost:3200/variants/${v}`, { waitUntil:"networkidle" });
  await p.waitForTimeout(2600);
  await p.screenshot({ path:`screenshots/var/${v}-1.png` });

  // Второй кадр после прокрутки — проверяем, что сцена изменилась
  await p.evaluate(() => window.scrollTo({top: 950*1.4, behavior:"instant"}));
  await p.waitForTimeout(2400);
  await p.screenshot({ path:`screenshots/var/${v}-2.png` });
  console.log(v);
  await p.close();
}

const p = await b.newPage({ viewport:{width:1600,height:950} });
await p.goto("http://localhost:3200/variants", { waitUntil:"networkidle" });
await p.waitForTimeout(800);
await p.screenshot({ path:"screenshots/var/index.png" });
console.log("index");

console.log(errs.length ? "ОШИБКИ:\n"+errs.join("\n") : "ошибок нет");
await b.close();
