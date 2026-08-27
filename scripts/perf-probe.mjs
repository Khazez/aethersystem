/** Измеряет время кадра сцены — чтобы решения о качестве принимать по цифрам. */
import { chromium } from "playwright";
const b = await chromium.launch({ args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl"] });
const p = await b.newPage({ viewport:{width:1280,height:720} });
await p.goto("http://localhost:3210/ru", { waitUntil:"domcontentloaded" });
await p.waitForTimeout(9000);
const fps = await p.evaluate(() => new Promise((res) => {
  let n = 0; const t0 = performance.now();
  const tick = () => { n++; if (performance.now() - t0 < 4000) requestAnimationFrame(tick); else res({ frames: n, ms: performance.now() - t0 }); };
  requestAnimationFrame(tick);
}));
console.log(`кадров: ${fps.frames} за ${Math.round(fps.ms)} мс → ${(fps.frames/(fps.ms/1000)).toFixed(1)} кадр/с (программный рендер, без видеокарты)`);
await b.close();
