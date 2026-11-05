import * as THREE from "three";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";

export type AssemblyStyle = "workshop" | "cad";

/** CAD renklerini sitenin Anatomy tonlarına çevirir: açık mavi-gri gövde, kırmızı tekerlek, pirinç detay. */
function workshopColour(name: string, cad: THREE.Color) {
  const hex = cad.getHex();
  if (/^wheel/i.test(name) || hex === 0xc0201a) return 0xb3443c;
  if (/^sjarm/i.test(name)) return 0xc9a052;
  if (hex === 0xb8892c) return 0xc9a052;
  if (hex === 0xd8b000) return 0xd9bd62;
  if (/axle|shaft|worm|motor|servo/i.test(name)) return 0xbdb08a;
  if (/body/i.test(name)) return 0xece3c6;
  if (/roof|lid/i.test(name)) return 0xd9cda8;
  if (/frame|bogie|deck|buffer/i.test(name)) return 0xa3966f;
  return 0xf5efdc;
}

export interface LoadedAssembly {
  group: THREE.Group;
  length: number;
  dispose: () => void;
}

/**
 * Gerçek CAD montaj 3MF'ini yükler. Z-yukarı CAD eksenini Three.js Y-yukarı eksenine çevirir,
 * araç boyunca X'te ortalar ve ray üstü yüksekliğini korur. `centre` verilirse (araç merkezi,
 * CAD dünya X/Y) kutu yerine o kullanılır: yana açılan şarj kolu aracı kaydırmasın. Tekerlekler
 * kendi merkezlerine taşınır ki dönebilsinler.
 */
export async function loadAssembly(file: string, style: AssemblyStyle = "workshop", centre?: { x: number; y: number }): Promise<LoadedAssembly> {
  const response = await fetch(`models/3mf/${file}.3mf`);
  if (!response.ok) throw new Error(`${file}.3mf bulunamadı`);
  const root = new ThreeMFLoader().parse(await response.arrayBuffer());
  root.updateMatrixWorld(true);
  const sources: THREE.Mesh[] = [];
  root.traverse((o) => { if (o instanceof THREE.Mesh) sources.push(o); });
  const box = new THREE.Box3();
  for (const m of sources) box.expandByObject(m);
  const centreX = centre?.x ?? (box.min.x + box.max.x) / 2;
  const centreY = centre?.y ?? (box.min.y + box.max.y) / 2;
  const toScene = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x2b2616, transparent: true, opacity: 0.5 });
  materials.push(edgeMaterial);
  for (const m of sources) {
    const geometry = m.geometry.clone().applyMatrix4(m.matrixWorld);
    geometry.translate(-centreX, -centreY, 0);
    geometry.applyMatrix4(toScene);
    const src = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial;
    const cad = src.color ?? new THREE.Color(0x888888);
    const material = new THREE.MeshStandardMaterial({
      color: style === "workshop" ? workshopColour(m.name, cad) : cad,
      roughness: style === "workshop" ? 0.78 : 0.55,
      metalness: style === "workshop" ? 0 : 0.1,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = m.name;
    mesh.castShadow = true;
    if (/^wheel/i.test(m.name)) {
      geometry.computeBoundingBox();
      const c = geometry.boundingBox!.getCenter(new THREE.Vector3());
      geometry.translate(-c.x, -c.y, -c.z);
      mesh.position.copy(c);
      mesh.userData.wheel = true;
    }
    geometry.computeVertexNormals();
    if (style === "workshop") {
      const edges = new THREE.EdgesGeometry(geometry, 32);
      geometries.push(edges);
      mesh.add(new THREE.LineSegments(edges, edgeMaterial));
    }
    geometries.push(geometry);
    materials.push(material);
    group.add(mesh);
    m.geometry.dispose();
  }
  return {
    group,
    length: box.max.x - box.min.x,
    dispose: () => { geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose()); },
  };
}
