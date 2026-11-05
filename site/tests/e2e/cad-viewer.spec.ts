import { test, expect } from "@playwright/test";

for(const [id,name,file] of [["bd-040","BD 0-4-0","lokomotif_montaj"],["tender-160","Tender 160","tender_montaj"],["sarj-250","Şarj 250","sarj250_montaj"],["radar-250","Radar 250","sasi250_montaj"]]) {
  test(`${name}: gerçek 3MF montajı yüklenir`, async ({page}) => {
    const errors:string[]=[];
    page.on("pageerror",error=>errors.push(error.message));
    const fileResponse=await page.request.get(`/models/3mf/${file}.3mf`);
    expect(fileResponse.status()).toBe(200);
    await page.goto(`/#/lokomotif?model=${id}`);
    await page.getByRole("button",{name:"3D model",exact:true}).click();
    await expect(page.getByRole("button",{name:"Görünümü sıfırla",exact:true})).toBeVisible({timeout:30000});
    await expect(page.locator(".mv [role=alert]")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
