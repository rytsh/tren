import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { loadAssembly, vehicleSpec, type LoadedAssembly } from "./cadAssembly";
import { param, RAIL_CENTRE, STRAIGHT } from "./params";
import { closure, lengthOf, pointAlong, type Piece, type Pose } from "./track";

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
  onTrainLoad?: (ok: boolean) => void;

  /**
   * Hat önizlemesindeki araçlar, model sayfasındaki aynı CAD montaj 3MF dosyalarıdır. Montajı henüz
   * üretilmemiş bir vagon, ortak 250 mm şasiyi paylaşan yolcu vagonu montajıyla gösterilir.
   */
  private async ensure(file: string) {
    if (this.templates.has(file) || this.loading.has(file)) return;
    this.loading.add(file);
    try {
      const assembly = await loadAssembly(file);
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

  /** Araç sırası, model id'leriyle: ["bd-040", "tender-160", "yolcu-250", ...]. */
  setConsist(order: string[]) {
    this.order = [...order];
    const key = order.join(",");
    if (key === this.consistKey) return;
    const vehicles: THREE.Object3D[] = [];
    const pending: string[] = [];
    const parts: [THREE.Group, number, string][] = [];
    for (const id of order) {
      const spec = vehicleSpec(id);
      const file = this.templates.has(spec.file) ? spec.file : spec.fallback;
      const template = file ? this.templates.get(file) : undefined;
      if (!this.templates.has(spec.file)) pending.push(spec.file);
      if (spec.fallback && !this.templates.has(spec.fallback)) pending.push(spec.fallback);
      if (template) parts.push([template, spec.length, spec.kind]);
    }
    pending.forEach((f) => this.ensure(f));
    this.consistKey = pending.length ? "" : key;
    this.train.clear();
    for (const [template, length, kind] of parts) { const car = template.clone(true); car.userData.vehicleLength = length; car.userData.kind = kind; this.train.add(car); vehicles.push(car); }
    this.train.userData.vehicles = vehicles;
    this.train.userData.loco = vehicles[0] ?? null;
  }

  setPieces(pieces: Piece[], selected: number | null) {
    this.pieces = pieces;
    this.selected = selected;
    for (const child of [...this.trackGroup.children]) {
      this.trackGroup.remove(child);
      child.traverse((o) => {
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
        const platform = new THREE.Mesh(new THREE.BoxGeometry(STRAIGHT * 0.9, 40, 70), this.mats.station);
        const nx = -Math.sin(p.heading),
          ny = Math.cos(p.heading);
        platform.position.set(p.x + nx * 95, 20, -(p.y + ny * 95));
        platform.rotation.y = p.heading;
        platform.castShadow = platform.receiveShadow = true;
        const post = new THREE.Mesh(new THREE.BoxGeometry(12, 70, 12), this.mats.loco);
        post.position.set(p.x + nx * 55, 35, -(p.y + ny * 55));
        post.rotation.y = p.heading;
        g.add(platform, post);
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
    const put = (obj: THREE.Object3D, centre: number, half: number) => {
      const a = at(centre - half);
      const b = at(centre + half);
      obj.position.set((a.x + b.x) / 2, 0, -(a.y + b.y) / 2);
      obj.rotation.y = Math.atan2(b.y - a.y, b.x - a.x);
    };
    let back = this.distance;
    const spin = (this.speed * 1000 * dt) / 21;
    vehicles.forEach((car,i) => {
      const len=car.userData.vehicleLength as number;
      if(i>0) back -= len/2 + 34;
      put(car,back,car.userData.kind === "loco" ? 35 : len*.32);
      back -= len/2;
      if(this.running && !still) car.children.forEach(c => c.userData.wheel && (c.rotation.z -= spin));
    });
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
