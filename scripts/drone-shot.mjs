import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--use-gl=angle","--use-angle=swiftshader","--enable-webgl"] });
const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
await p.goto("http://localhost:3200/prototype", { waitUntil: "networkidle" });
// Финальная фаза: ловим несколько моментов, дрон движется по маршруту
await p.evaluate(() => window.scrollTo({ top: 950 * 4.4, behavior: "instant" }));
await p.waitForTimeout(3000);
for (let i = 1; i <= 3; i++) {
  await p.screenshot({ path: `screenshots/proto/D${i}-drone.png` });
  console.log(`D${i}`);
  await p.waitForTimeout(4000);
}
await b.close();
