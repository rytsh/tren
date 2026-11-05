import { test, expect } from "@playwright/test";

test("kütüphane türleri, arama, ışık, detay ve dosya indirme", async ({page}) => {
  const errors:string[]=[]; page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/#/");
  await expect(page.getByRole("heading",{name:"Küçük bir tren. Kendi dünyan."})).toBeVisible();
  await page.getByRole("button",{name:"Vagonlar",exact:true}).click();
  await expect(page.locator(".model-card")).toHaveCount(6);
  await page.getByRole("button",{name:"Işık kapalı"}).click();
  await expect(page.locator(".stage img")).toHaveAttribute("src",/-lit\.svg$/);
  expect((await page.request.get("/figures/car-radar-lit.svg")).status()).toBe(200);
  await page.getByRole("searchbox",{name:"Model ara"}).fill("Radar");
  await page.getByRole("searchbox",{name:"Model ara"}).press("Enter");
  await expect(page.locator(".model-card")).toHaveCount(1);
  await page.getByRole("link",{name:"Modeli incele",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Radar 250",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Anatomy",exact:true})).toBeEnabled();
  // gövdesi henüz yok: 3D sekmesi ortak 250 şasiyi açar, sayfa gövdenin sırada olduğunu söyler
  await expect(page.getByRole("button",{name:"3D model",exact:true})).toBeEnabled();
  await expect(page.getByText("Gövde CAD'i sırada",{exact:false})).toBeVisible();
  await expect(page.getByText("Dönen anten",{exact:false}).first()).toBeVisible();
  await page.goto("/#/lokomotif?model=tender-160");
  await page.getByRole("link",{name:"Parça dosyaları",exact:true}).click();
  await expect(page.getByRole("combobox")).toHaveValue("tender-160");
  const href = await page.locator(".downloads a").first().getAttribute("href");
  expect(href).toBeTruthy(); expect((await page.request.get(`/${href}`)).status()).toBe(200);
  expect(errors).toEqual([]);
});

test("hat düzenleme, adetler, kaydet/aç ve CSV", async ({page}) => {
  await page.goto("/#/tasarla?hat=circle");
  await expect(page.locator(".readout strong")).toHaveText("Hat kapandı");
  await page.getByRole("button",{name:"Düz ray 200 mm",exact:true}).click();
  await expect(page.locator(".readout strong")).toContainText("Açık uç:");
  await page.getByRole("button",{name:"Son parçayı sil",exact:true}).click();
  await expect(page.locator(".readout strong")).toHaveText("Hat kapandı");
  await page.getByRole("button",{name:"Yolcu 250 artır",exact:true}).click();
  await expect(page.locator(".consist label").filter({hasText:"Yolcu 250"}).locator("output")).toHaveText("3");
  await page.getByRole("button",{name:"Tarayıcıya kaydet",exact:true}).click();
  await page.getByRole("button",{name:"Temizle",exact:true}).click();
  await expect(page.locator(".readout span")).toContainText("0 parça");
  await page.getByRole("button",{name:"Kaydı aç",exact:true}).click();
  await expect(page.locator(".readout span")).toContainText("24 parça");
  await page.getByRole("button",{name:"Malzeme listesi",exact:true}).click();
  const downloadPromise=page.waitForEvent("download");
  await page.getByRole("button",{name:"CSV indir",exact:true}).click();
  expect((await downloadPromise).suggestedFilename()).toContain("malzeme.csv");
});

test("hat tasarlayıcıdan diğer sayfalara geçilebilir", async ({page}) => {
  await page.goto("/#/tasarla?hat=circle");
  await expect(page.locator(".readout strong")).toHaveText("Hat kapandı");
  const nav = page.getByRole("navigation",{name:"Ana menü"});
  await nav.getByRole("link",{name:"Modeller",exact:true}).click();
  await expect(page).toHaveURL(/#\/modeller$/);
  await nav.getByRole("link",{name:"Hat tasarla",exact:true}).click();
  await expect(page.locator(".readout strong")).toBeVisible();
  await nav.getByRole("link",{name:"Parçalar",exact:true}).click();
  await expect(page).toHaveURL(/#\/parcalar/);
  await page.goBack();
  await expect(page).toHaveURL(/#\/tasarla/);
});

test("mobil gezinme taşmadan kullanılabilir", async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto("/#/");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole("navigation",{name:"Ana menü"}).getByRole("link",{name:"Montaj",exact:true}).click();
  await page.getByRole("button",{name:"Vagon elektriği",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Aynı hat, ışıklı vagonlar."})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test("GitHub Pages alt dizininde dosya yolları korunur", async ({page}) => {
  const broken:string[]=[];
  await page.route("http://127.0.0.1:4173/tren/**",async route => {
    const url = new URL(route.request().url());
    url.pathname = url.pathname.replace(/^\/tren\//,"/");
    const response = await route.fetch({url:url.toString()});
    if(response.status()>=400) broken.push(url.pathname);
    await route.fulfill({response});
  });
  await page.goto("/tren/#/modeller");
  await expect(page.locator(".model-card")).toHaveCount(8);
  await page.getByRole("link",{name:"Modeli incele",exact:true}).first().click();
  await expect(page.getByRole("heading",{name:"BD 0-4-0",exact:true})).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/tren/");
  expect(broken).toEqual([]);
});

test("Anatomy gerçek mekanizma görünümünü açar", async ({page}) => {
  await page.goto("/#/");
  await page.getByRole("button",{name:"Anatomisi",exact:true}).click();
  const frame=page.frameLocator('iframe[title="BD 0-4-0: mekanizma"]');
  await expect(frame.locator(".iso-plate")).toBeVisible();
  await expect(frame.locator(".iso-legend")).toBeHidden();
  await expect(page.locator(".drawing-caption strong")).toHaveText("Sonsuz vida tahriki");
});

test("vagon anatomisi bağlantı figürünü plakanın içinde açar", async ({page}) => {
  await page.goto("/#/lokomotif?model=yolcu-250");
  await page.getByRole("button",{name:"Anatomy",exact:true}).click();
  const frame=page.frameLocator('iframe[title="Yolcu 250: mekanizma"]');
  await expect(frame.locator(".iso-plate")).toBeVisible();
  const box=await page.evaluate(()=>{const f=document.querySelector("iframe")!.getBoundingClientRect(); const p=document.querySelector(".drawing")!.getBoundingClientRect(); return {f:f.bottom,p:p.bottom};});
  expect(box.f).toBeLessThanOrEqual(box.p+1);
});
