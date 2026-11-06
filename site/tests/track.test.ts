import { describe, expect, it } from "vitest";
import { PRESETS, rebuild, closure, endOf, bounds, totalLength, encode, decode, counts } from "../src/lib/track";
import { billOf, PARTS, filament } from "../src/lib/bom";

describe("45 mm hat geometrisi", () => {
  it("düz modül 200 mm ve aynı yönde biter", () => {
    expect(endOf("straight",{x:0,y:0,heading:0})).toEqual({x:200,y:0,heading:0});
  });
  it("sağ ve sol viraj birbirinin aynasıdır", () => {
    const left=endOf("curveLeft",{x:0,y:0,heading:0});
    const right=endOf("curveRight",{x:0,y:0,heading:0});
    expect(left.x).toBeCloseTo(right.x); expect(left.y).toBeCloseTo(-right.y); expect(left.heading).toBeCloseTo(-right.heading);
  });
  for(const preset of PRESETS) it(`${preset.name} gerçek konum ve açıyla kapanır`, () => {
    const pieces=rebuild(preset.kinds), c=closure(pieces);
    expect(c.closed).toBe(true); expect(c.gap).toBeLessThan(.00001); expect(c.angle).toBeLessThan(.00001);
  });
  it("24 viraj 1500 mm çap ve 2πR uzunluk verir", () => {
    const pieces=rebuild(Array(24).fill("curveLeft")); const b=bounds(pieces);
    expect(b.width).toBeCloseTo(1500); expect(b.depth).toBeCloseTo(1500); expect(totalLength(pieces)).toBeCloseTo(1500*Math.PI);
  });
  it("tek açık düz hat kapalı sayılmaz", () => expect(closure(rebuild(["straight"])).closed).toBe(false));
  it("paylaşım kodu geri açılır ve aşırı büyük veri sınırlandırılır", () => {
    const kinds=PRESETS[3].kinds;
    expect(decode(encode(kinds))).toEqual(kinds); expect(decode("slrt?!")).toEqual(["straight","curveLeft","curveRight","station"]); expect(decode("S".repeat(9999))).toHaveLength(500);
  });
});

describe("CAD kaynaklı parça listesi", () => {
  it("manifesto basılabilir parçaları içerir", () => {
    expect(PARTS.length).toBeGreaterThanOrEqual(27);
    expect(PARTS.every(p => p.file?.stl && p.file?.step && p.volume_mm3! > 0)).toBe(true);
  });
  it("bir lokomotif, bir tender ve iki 250 vagon 24 tekerlek gerektirir", () => {
    const result=billOf(counts([]),{"bd-040":1,"tender-160":1,"yolcu-250":2});
    expect(result.find(l=>l.key==="tekerlek_test_d42")?.qty).toBe(24);
  });
  it("istasyon rayı düz ray ve şarj kontak tutucusu sayar, araç parçası eklemez", () => {
    const result=billOf({straight:3,station:2,curveLeft:12,curveRight:12},{});
    expect(result.find(l=>l.key==="ray_duz_200")?.qty).toBe(5); expect(result.find(l=>l.key==="ray_viraj_r750_15")?.qty).toBe(24);
    expect(result.find(l=>l.key==="sarj_istasyon")?.qty).toBe(2); expect(result.find(l=>l.key==="st_strip")?.qty).toBe(4);
    expect(result.filter(l=>l.group==="araç")).toHaveLength(0);
  });
  it("250 vagonlar çeki kolu ve ortak şasi alır, eski 220 vagon parçası almaz", () => {
    const result=billOf(counts([]),{"sarj-250":1,"radar-250":1});
    expect(result.find(l=>l.key==="ceki_kolu_250")?.qty).toBe(2); expect(result.find(l=>l.key==="ceki_kolu_tender_250")).toBeUndefined();
    expect(result.find(l=>l.key==="bus_jumper")?.qty).toBe(2); expect(result.find(l=>l.key==="tekerlek_test_d42")?.qty).toBe(16);
    expect(result.find(l=>l.key==="vagon_platform_250")?.qty).toBe(1); expect(result.find(l=>l.key==="sarj_platform")?.qty).toBe(1);
    expect(result.find(l=>l.key==="sarj_kol")?.qty).toBe(1); expect(result.find(l=>l.key==="servo_mg90s")?.qty).toBe(1);
    expect(result.find(l=>l.key==="vagon_govde")).toBeUndefined(); expect(result.find(l=>l.key==="ceki_kolu")).toBeUndefined();
    expect(result.find(l=>l.key==="radar_tabla")?.qty).toBe(1); expect(result.find(l=>l.key==="n20_motor")?.qty).toBe(1);
  });
  it("tam trende ilk 250 vagon tendere 86 mm kolla bağlanır", () => {
    const result=billOf(counts([]),{"bd-040":1,"tender-160":1,"yolcu-250":2,"sarj-250":1});
    expect(result.find(l=>l.key==="ceki_kolu")?.qty).toBe(1);
    expect(result.find(l=>l.key==="ceki_kolu_tender_250")?.qty).toBe(1);
    expect(result.find(l=>l.key==="ceki_kolu_250")?.qty).toBe(2);
  });
  it("boş hatta satın alma veya kütle eklemez", () => {
    const result=billOf(counts([]),{}); expect(result).toHaveLength(0); expect(filament(result).grams).toBe(0);
  });
});
