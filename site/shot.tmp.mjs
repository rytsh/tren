import { chromium } from '@playwright/test';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
await p.goto('http://127.0.0.1:4173/#/',{waitUntil:'networkidle'});
await p.getByRole('button',{name:'Anatomisi',exact:true}).click(); await p.waitForTimeout(2500);
const r=await p.evaluate(()=>{const f=document.querySelector('iframe');const fr=f.getBoundingClientRect();const host=f.closest('.plate').getBoundingClientRect();return {frameBottom:fr.bottom,plateBottom:host.bottom}});
console.log(JSON.stringify(r));
await p.screenshot({path:'/home/ray/repo/tren/.impeccable/review/anat-home2.png'});
await b.close();
