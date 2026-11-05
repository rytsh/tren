import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const out = resolve("../.impeccable/review");
mkdirSync(out,{recursive:true});
const browser = await chromium.launch({executablePath: process.env.CHROME_PATH, args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const shots = [
  ["desktop",1440,900,"/"],
  ["mobile",390,844,"/"],
  ["wide",1920,1080,"/"],
  ["editor",1440,900,"/tasarla?hat=oval"],
  ["editor-mobile",390,844,"/tasarla?hat=oval"],
  ["detail",1440,900,"/lokomotif?model=coach-220"],
  ["electrical-mobile",390,844,"/kilavuz?bolum=elektrik"],
];
const evidence = [];
for (const [name,width,height,route] of shots) {
  const page = await browser.newPage({viewport:{width,height}, reducedMotion:"reduce"});
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  page.on("response",r=>{if(r.status()>=400) errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`http://127.0.0.1:4173/#${route}`,{waitUntil:"networkidle"});
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(1500);
  await page.screenshot({path:resolve(out,`${name}.png`),fullPage:name!=="editor"&&name!=="editor-mobile"});
  evidence.push({name, route, width, overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth), errors});
  await page.close();
}
console.log(JSON.stringify(evidence,null,2));
await browser.close();
