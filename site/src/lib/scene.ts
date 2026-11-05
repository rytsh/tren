import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { loadAssembly, type LoadedAssembly } from "./cadAssembly";
import { param, RAIL_CENTRE, STRAIGHT } from "./params";
import { closure, lengthOf, pointAlong, type Piece, type Pose } from "./track";
import { VEHICLES, linkGap, vehicleOf, type CarSketch, type VehicleGeometry } from "./vehicles";

const TIE_W = param("tie_w");
const TIE_T = param("tie_t");
const TIE_LEN = param("tie_len");
const TIE_PITCH = param("tie_pitch");
const RAIL_H = param("rail_h");
const HEAD_W = param("rail_head_w");
const HEAD_H = param("rail_head_h");
const WEB_W = param("rail_web_w");
const FOOT_W = param("rail_foot_w");

const COLOURS = {
  ground: 0xece2c0,
  gravel: 0xb8ab93,
  tie: 0xa99c78,
  rail: 0x4a4230,
  station: 0xe9b824,
  ghost: 0xc98a0b,
  select: 0xe9b824,
  loco: 0x3a3320,
};

function railShape(): THREE.Shape {
  const top = TIE_T + RAIL_H;
  const hb = top - HEAD_H;
  const wt = hb - (HEAD_W - WEB_W) / 2;
  const ft = TIE_T + 1.5;
  const pts: [number, number][] = [
    [-FOOT_W / 2, TIE_T],
    [FOOT_W / 2, TIE_T],
    [FOOT_W / 2, ft],
    [WEB_W / 2, ft],
    [WEB_W / 2, wt],
    [HEAD_W / 2, hb],
    [HEAD_W / 2, top],
    [-HEAD_W / 2, top],
    [-HEAD_W / 2, hb],
    [-WEB_W / 2, wt],
    [-WEB_W / 2, ft],
    [-FOOT_W / 2, ft],
  ];
  return new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
}

const RAIL_SHAPE = railShape();

function railMesh(piece: Piece, side: number, material: THREE.Material) {
  const steps = piece.kind === "curveLeft" || piece.kind === "curveRight" ? 24 : 1;
  return new THREE.Mesh(sweep(RAIL_SHAPE, piece, side * RAIL_CENTRE, steps), material);
}

function sweep(shape: THREE.Shape, piece: Piece, offset: number, steps: number) {
  const outline = shape.getPoints();
  const positions: number[] = [];
  const index: number[] = [];
  const n = outline.length;
  for (let i = 0; i <= steps; i++) {
    const p = pointAlong(piece, 0.0012 + (i / steps) * 0.9976);
    const nx = -Math.sin(p.heading);
    const ny = Math.cos(p.heading);
    for (const v of outline) {
      const lateral = offset + v.x;
      positions.push(p.x + nx * lateral, v.y, -(p.y + ny * lateral));
    }
  }
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < n; j++) {
      const a = i * n + j;
      const b = i * n + ((j + 1) % n);
      const c = (i + 1) * n + j;
      const d = (i + 1) * n + ((j + 1) % n);
      index.push(a, c, b, b, c, d);
    }
  }
  const capTris = THREE.ShapeUtils.triangulateShape(outline, []);
  for (const end of [0, steps]) {
    for (const [a, b, c] of capTris) {
      const base = end * n;
      if (end === 0) index.push(base + a, base + b, base + c);
      else index.push(base + a, base + c, base + b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

const TIE_GEOMETRY = new THREE.BoxGeometry(TIE_W, TIE_T, TIE_LEN);
const END_TIE_GEOMETRY = new THREE.BoxGeometry(param("end_tie_w"), TIE_T, TIE_LEN);

/**
 * Şarj kolu montajda açık (+y) modellenir; seyirdeki trende kapalı gösterilir: göbek ekseni
 * etrafında 90° döner, kol cebe girer (docs/standart.md §5). CAD +z ekseni sahnede +Y'dir.
 */
function stowArm(body: THREE.Object3D, arm: { mesh: string; x: number; y: number; swing: number }) {
  const mesh = body.getObjectByName(arm.mesh);
  if (!mesh || !mesh.parent) return;
  const pivot = new THREE.Group();
  pivot.position.set(arm.x, 0, -arm.y);
  mesh.parent.add(pivot);
  mesh.position.x -= arm.x;
  mesh.position.z += arm.y;
  pivot.add(mesh);
  pivot.rotation.y = THREE.MathUtils.degToRad(arm.swing);
}

export interface SceneOptions {
  canvas: HTMLCanvasElement;
  onPick?: (id: number | null) => void;
}

export class TrackScene {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  private trackGroup = new THREE.Group();
  private ghost = new THREE.Group();
  private train = new THREE.Group();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private pieces: Piece[] = [];
  private selected: number | null = null;
  private pieceMeshes = new Map<number, THREE.Object3D>();
  private frame = 0;
  private distance = 0;
  private last = 0;
  private visible = true;
  private observer: IntersectionObserver;
  private resizer: ResizeObserver;
  speed = 0.35;
  private consistKey = "";
  running = true;
  private mats = {
    tie: new THREE.MeshStandardMaterial({ color: COLOURS.tie, roughness: 0.9 }),
    rail: new THREE.MeshStandardMaterial({ color: COLOURS.rail, roughness: 0.55, metalness: 0.2 }),
    station: new THREE.MeshStandardMaterial({ color: COLOURS.station, roughness: 0.8 }),
    selectTie: new THREE.MeshStandardMaterial({ color: COLOURS.select, roughness: 0.8 }),
    ghost: new THREE.MeshBasicMaterial({ color: COLOURS.ghost, transparent: true, opacity: 0.45 }),
    loco: new THREE.MeshStandardMaterial({ color: COLOURS.loco, roughness: 0.45, metalness: 0.15 }),
  };

  constructor(private options: SceneOptions) {
    const { canvas } = options;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene.background = new THREE.Color(0xece2c0);
    this.camera = new THREE.PerspectiveCamera(40, 1, 5, 40000);
    this.camera.position.set(1800, 1700, 2400);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minDistance = 150;
    this.controls.maxDistance = 14000;

    const hemi = new THREE.HemisphereLight(0xffffff, 0xa8996f, 1.5);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(2500, 4000, 1500);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = sun.shadow.camera as THREE.OrthographicCamera;
    s.left = s.bottom = -4000;
    s.right = s.top = 4000;
    s.far = 12000;
    this.scene.add(sun);

    const ground = new THREE.Mesh(new THREE.CircleGeometry(20000, 64), new THREE.MeshStandardMaterial({ color: COLOURS.ground, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    this.scene.add(ground);
    const grid = new THREE.GridHelper(20000, 100, 0xd3c59c, 0xddd1ad);
    (grid.material as THREE.Material).opacity = 0.35;
    (grid.material as THREE.Material).transparent = true;
    this.scene.add(grid);

    this.scene.add(this.trackGroup, this.ghost, this.train);

    canvas.addEventListener("pointerdown", this.onDown);
    canvas.addEventListener("pointerup", this.onUp);
    this.resizer = new ResizeObserver(() => this.resize());
    this.resizer.observe(canvas);
    this.observer = new IntersectionObserver((e) => {
      this.visible = e[e.length - 1].isIntersecting;
      if (this.visible) this.loop();
    });
    this.observer.observe(canvas);
    this.resize();
    this.loop();
  }

  private downAt = { x: 0, y: 0 };
  private onDown = (e: PointerEvent) => {
    this.downAt = { x: e.clientX, y: e.clientY };
  };
  private onUp = (e: PointerEvent) => {
    if (Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y) > 5) return;
    const rect = this.options.canvas.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.trackGroup.children, true)[0];
    let node: THREE.Object3D | null = hit?.object ?? null;
    while (node && node.userData.pieceId === undefined) node = node.parent;
    this.options.onPick?.(node ? (node.userData.pieceId as number) : null);
  };

  private templates = new Map<string, THREE.Group>();
  private loading = new Set<string>();
  private loaded: LoadedAssembly[] = [];
  private order: string[] = [];
  private stationTemplate: THREE.Group | null = null;
  onTrainLoad?: (ok: boolean) => void;

  /**
   * Hat önizlemesindeki araçlar, model sayfasındaki aynı CAD montaj 3MF dosyalarıdır. Gövdesi henüz
   * modellenmemiş 250 vagonlar, gerçek ortak 250 şasi montajının üstünde params.json ölçüleriyle
   * çizilmiş sade bir taslak gövdeyle gösterilir.
   */
  private async ensure(file: string) {
    if (this.templates.has(file) || this.loading.has(file)) return;
    this.loading.add(file);
    try {
      const geo = Object.values(VEHICLES).find((v) => v.file === file);
      const assembly = await loadAssembly(file, "workshop", geo ? { x: geo.cadCentreX, y: 0 } : undefined);
      if (this.disposed) { assembly.dispose(); return; }
      this.templates.set(file, assembly.group);
      this.loaded.push(assembly);
      this.consistKey = "";
      this.setConsist(this.order);
      this.onTrainLoad?.(true);
    } catch {
      this.onTrainLoad?.(false);
    } finally {
      this.loading.delete(file);
    }
  }

  private async ensureStation() {
    if (this.stationTemplate || this.loading.has("sarj_istasyon")) return;
    this.loading.add("sarj_istasyon");
    try {
      const assembly = await loadAssembly("sarj_istasyon_yerinde", "workshop", { x: 0, y: 0 });
      if (this.disposed) { assembly.dispose(); return; }
      this.stationTemplate = assembly.group;
      this.stationTemplate.traverse((o) => { o.userData.shared = true; });
      this.loaded.push(assembly);
      this.setPieces(this.pieces, this.selected);
    } catch {
      // istasyon tutucusu yoksa yalnız peron gösterilir
    } finally {
      this.loading.delete("sarj_istasyon");
    }
  }

  private sketchCache = new Map<string, THREE.Group>();

  /** Taslak gövde: kemerli kasa (+ radar tablası, kubbe gibi ekler), yarı saydam değil ama düz renk. */
  private sketchBody(id: string, s: CarSketch) {
    const cached = this.sketchCache.get(id);
    if (cached) return cached;
    const g = new THREE.Group();
    const [x0, x1] = s.span ?? [-s.length / 2, s.length / 2];
    const half = s.width / 2;
    const rise = s.crown - s.wall;
    const R = (half * half + rise * rise) / (2 * rise);
    const shape = new THREE.Shape();
    shape.moveTo(-half, s.floor);
    shape.lineTo(half, s.floor);
    shape.lineTo(half, s.wall);
    for (let i = 1; i <= 16; i++) {
      const y = half - (2 * half * i) / 16;
      shape.lineTo(y, s.crown - R + Math.sqrt(R * R - y * y));
    }
    shape.lineTo(-half, s.floor);
    const body = new THREE.ExtrudeGeometry(shape, { depth: x1 - x0, bevelEnabled: false });
    body.rotateY(Math.PI / 2);
    body.translate(x0, 0, 0);
    const mat = new THREE.MeshStandardMaterial({ color: s.colour, roughness: 0.8 });
    const mesh = new THREE.Mesh(body, mat);
    mesh.castShadow = true;
    g.add(mesh);
    for (const e of s.extras ?? []) {
      const m = new THREE.MeshStandardMaterial({ color: e.colour, roughness: 0.7 });
      let geo: THREE.BufferGeometry;
      if (e.kind === "cylinder") {
        geo = new THREE.CylinderGeometry(e.r, e.r, e.z1 - e.z0, 32);
        geo.translate(e.x, (e.z0 + e.z1) / 2, -e.y);
      } else {
        geo = new THREE.BoxGeometry(e.x1 - e.x0, e.z1 - e.z0, e.y1 - e.y0);
        geo.translate((e.x0 + e.x1) / 2, (e.z0 + e.z1) / 2, -(e.y0 + e.y1) / 2);
      }
      const em = new THREE.Mesh(geo, m);
      em.castShadow = true;
      g.add(em);
    }
    g.userData.sketch = true;
    this.sketchCache.set(id, g);
    return g;
  }

  /** Araç sırası, model id'leriyle: ["bd-040", "tender-160", "yolcu-250", ...]. */
  setConsist(order: string[]) {
    this.order = [...order];
    const key = order.join(",");
    if (key === this.consistKey) return;
    const vehicles: THREE.Object3D[] = [];
    const pending = new Set<string>();
    const parts: [THREE.Group, string][] = [];
    for (const id of order) {
      const geo = vehicleOf(id);
      const template = this.templates.get(geo.file);
      if (!template) pending.add(geo.file);
      else parts.push([template, id]);
    }
    pending.forEach((f) => this.ensure(f));
    this.consistKey = pending.size ? "" : key;
    this.train.clear();
    for (const [template, id] of parts) {
      const geo = vehicleOf(id);
      const car = new THREE.Group();
      const body = template.clone(true);
      car.add(body);
      if (geo.sketch) car.add(this.sketchBody(id, geo.sketch).clone(true));
      if (geo.arm) stowArm(body, geo.arm);
      car.userData.geo = geo;
      this.train.add(car);
      vehicles.push(car);
    }
    this.train.userData.vehicles = vehicles;
    this.train.userData.loco = vehicles[0] ?? null;
  }

  setPieces(pieces: Piece[], selected: number | null) {
    this.pieces = pieces;
    this.selected = selected;
    for (const child of [...this.trackGroup.children]) {
      this.trackGroup.remove(child);
      child.traverse((o) => {
        if (o.userData.shared) return;
        if ((o as THREE.Mesh).geometry && (o as THREE.Mesh).geometry !== TIE_GEOMETRY && (o as THREE.Mesh).geometry !== END_TIE_GEOMETRY) (o as THREE.Mesh).geometry.dispose();
      });
    }
    this.pieceMeshes.clear();
    for (const piece of pieces) {
      const g = new THREE.Group();
      g.userData.pieceId = piece.id;
      const tieMat = piece.id === selected ? this.mats.selectTie : piece.kind === "station" ? this.mats.station : this.mats.tie;
      const len = lengthOf(piece.kind);
      const n = Math.round(len / TIE_PITCH);
      for (let i = 0; i <= n; i++) {
        const end = i === 0 || i === n;
        const s = end ? (i === 0 ? 6 / len : 1 - 6 / len) : (i * TIE_PITCH) / len;
        const p = pointAlong(piece, Math.min(1, Math.max(0, s)));
        const tie = new THREE.Mesh(end ? END_TIE_GEOMETRY : TIE_GEOMETRY, tieMat);
        tie.position.set(p.x, TIE_T / 2, -p.y);
        tie.rotation.y = p.heading;
        tie.castShadow = tie.receiveShadow = true;
        g.add(tie);
      }
      for (const side of [-1, 1]) {
        const r = railMesh(piece, side, this.mats.rail);
        r.castShadow = true;
        g.add(r);
      }
      if (piece.kind === "station") {
        const p = pointAlong(piece, 0.5);
        const nx = -Math.sin(p.heading),
          ny = Math.cos(p.heading);
        // Peron, kontak tutucusunun arkasında; tutucu (CAD: sarj_istasyon) ray kenarında
        const platform = new THREE.Mesh(new THREE.BoxGeometry(STRAIGHT * 0.9, 40, 64), this.mats.station);
        platform.position.set(p.x + nx * 112, 20, -(p.y + ny * 112));
        platform.rotation.y = p.heading;
        platform.castShadow = platform.receiveShadow = true;
        g.add(platform);
        if (this.stationTemplate) {
          const holder = this.stationTemplate.clone(true);
          holder.position.set(p.x, 0, -p.y);
          holder.rotation.y = p.heading;
          g.add(holder);
        } else this.ensureStation();
      }
      this.trackGroup.add(g);
      this.pieceMeshes.set(piece.id, g);
    }
  }

  setGhost(pose: Pose | null, kind: Piece["kind"]) {
    for (const c of [...this.ghost.children]) {
      this.ghost.remove(c);
      (c as THREE.Mesh).geometry?.dispose();
    }
    if (!pose) return;
    const piece: Piece = { id: -1, kind, start: pose };
    for (const side of [-1, 1]) this.ghost.add(railMesh(piece, side, this.mats.ghost));
    const p = pointAlong(piece, 0);
    const marker = new THREE.Mesh(new THREE.ConeGeometry(18, 46, 20), this.mats.ghost);
    marker.position.set(p.x, 60, -p.y);
    marker.rotation.z = -Math.PI / 2;
    marker.rotation.y = p.heading;
    this.ghost.add(marker);
  }

  frameAll() {
    const box = new THREE.Box3().setFromObject(this.trackGroup);
    if (box.isEmpty()) return;
    const centre = box.getCenter(new THREE.Vector3());
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const vertical = THREE.MathUtils.degToRad(this.camera.fov);
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * this.camera.aspect);
    const distance = (Math.max(sphere.radius,300)+90) / Math.sin(Math.min(vertical,horizontal)/2);
    const direction = new THREE.Vector3(.55,.75,.9).normalize();
    this.controls.target.copy(centre);
    this.camera.position.copy(centre).addScaledVector(direction,distance);
    this.controls.update();
  }

  focusTrain() {
    const loco = this.train.userData.loco as THREE.Object3D | null;
    if (!loco) return;
    const p = loco.getWorldPosition(new THREE.Vector3());
    this.controls.target.copy(p);
    this.camera.position.set(p.x + 420, 260, p.z + 520);
  }

  private resize() {
    const canvas = this.options.canvas;
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private placeTrain(dt: number) {
    const vehicles = (this.train.userData.vehicles ?? []) as THREE.Object3D[];
    if (!this.pieces.length) {
      this.train.visible = false;
      return;
    }
    this.train.visible = true;
    const total = this.pieces.reduce((s, p) => s + lengthOf(p.kind), 0);
    const closed = closure(this.pieces).closed;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (this.running && !still) this.distance = closed ? (this.distance + this.speed * 1000 * dt) % total : Math.min(total,this.distance + this.speed * 1000 * dt);
    this.distance = Math.min(total,this.distance);
    const at = (dist: number) => {
      if(!closed && (dist < 0 || dist > total)) {
        const pose = dist < 0 ? this.pieces[0].start : pointAlong(this.pieces.at(-1)!,1);
        const extra = dist < 0 ? dist : dist-total;
        return {x:pose.x+Math.cos(pose.heading)*extra,y:pose.y+Math.sin(pose.heading)*extra,heading:pose.heading};
      }
      let r = closed ? ((dist % total) + total) % total : dist;
      for (const p of this.pieces) {
        const l = lengthOf(p.kind);
        if (r <= l) return pointAlong(p, Math.min(1, r / l));
        r -= l;
      }
      return pointAlong(this.pieces[this.pieces.length - 1], 1);
    };
    const put = (obj: THREE.Object3D, s0: number, s1: number) => {
      const a = at(s0);
      const b = at(s1);
      obj.position.set((a.x + b.x) / 2, 0, -(a.y + b.y) / 2);
      obj.rotation.y = Math.atan2(b.y - a.y, b.x - a.x);
    };
    // Önde giden aracın merkezi `distance`'ta; her araç iki pivotunun (dingil ya da boji) ray
    // eksenindeki noktalarına oturur, arkadaki araç bağlantı ölçüsü kadar geride başlar.
    let centre = this.distance;
    let ahead: VehicleGeometry | null = null;
    const spin = (this.speed * 1000 * dt) / 21;
    for (const car of vehicles) {
      const geo = car.userData.geo as VehicleGeometry;
      if (ahead) centre += ahead.rear - linkGap(ahead, geo) - geo.front;
      put(car, centre + geo.pivots[0], centre + geo.pivots[1]);
      if (this.running && !still) car.traverse((c) => { if (c.userData.wheel) c.rotation.z -= spin; });
      ahead = geo;
    }
  }

  private loop = () => {
    if (this.frame || !this.visible) return;
    const tick = (now: number) => {
      const dt = this.last ? Math.min((now - this.last) / 1000, 1 / 20) : 1 / 60;
      this.last = now;
      this.controls.update();
      this.placeTrain(dt);
      this.renderer.render(this.scene, this.camera);
      this.frame = this.visible ? requestAnimationFrame(tick) : 0;
      if (!this.frame) this.last = 0;
    };
    this.frame = requestAnimationFrame(tick);
  };

  private disposed = false;

  dispose() {
    this.disposed = true;
    this.loaded.forEach((a) => a.dispose());
    this.sketchCache.forEach((g) => g.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); } }));
    this.train.clear();
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.resizer.disconnect();
    this.options.canvas.removeEventListener("pointerdown", this.onDown);
    this.options.canvas.removeEventListener("pointerup", this.onUp);
    this.controls.dispose();
    const geometries=new Set<THREE.BufferGeometry>(), materials=new Set<THREE.Material>();
    this.scene.traverse(o => { if(o instanceof THREE.Mesh || o instanceof THREE.LineSegments) { geometries.add(o.geometry); for(const m of Array.isArray(o.material)?o.material:[o.material]) materials.add(m); } });
    geometries.delete(TIE_GEOMETRY); geometries.delete(END_TIE_GEOMETRY);
    geometries.forEach(g=>g.dispose()); materials.forEach(m=>m.dispose());
    this.renderer.dispose();
  }
}
