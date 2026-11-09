import * as THREE from "https://esm.sh/three@0.168.0";
import { OrbitControls } from "https://esm.sh/three@0.168.0/examples/jsm/controls/OrbitControls.js";
import {
  generateModel,
  morphotypeKey,
  dnaToMorphotype,
  dnaString,
} from "./dist/dna3d.js";
import { Simulation } from "./dist/simulation.js";

// ---- DOM ----
const canvas = document.getElementById("gl-canvas");
const els = {
  play: document.getElementById("btn-play"),
  reset: document.getElementById("btn-reset"),
  seed: document.getElementById("inp-seed"),
  pop: document.getElementById("inp-pop"),
  world: document.getElementById("inp-world"),
  speed: document.getElementById("inp-speed"),
  tick: document.getElementById("stat-tick"),
  popStat: document.getElementById("stat-pop"),
  colonies: document.getElementById("stat-colonies"),
  births: document.getElementById("stat-births"),
  sexual: document.getElementById("stat-sexual"),
  buds: document.getElementById("stat-buds"),
  deaths: document.getElementById("stat-deaths"),
  apoptosis: document.getElementById("stat-apoptosis"),
  kills: document.getElementById("stat-kills"),
  colonyDeaths: document.getElementById("stat-colony-deaths"),
  species: document.getElementById("stat-species"),
  day: document.getElementById("stat-day"),
  energy: document.getElementById("stat-energy"),
  size: document.getElementById("stat-size"),
  strength: document.getElementById("stat-strength"),
  aggression: document.getElementById("stat-aggression"),
  cooperation: document.getElementById("stat-cooperation"),
  mutation: document.getElementById("stat-mutation"),
  inspector: document.getElementById("inspector"),
  selId: document.getElementById("sel-id"),
  selColony: document.getElementById("sel-colony"),
  selRole: document.getElementById("sel-role"),
  selDna: document.getElementById("sel-dna"),
  selEnergy: document.getElementById("sel-energy"),
  selAge: document.getElementById("sel-age"),
  selGen: document.getElementById("sel-gen"),
  selSize: document.getElementById("sel-size"),
  selStrength: document.getElementById("sel-strength"),
  selAggression: document.getElementById("sel-aggression"),
  selAltruism: document.getElementById("sel-altruism"),
  selBio: document.getElementById("sel-bio"),
  selMutation: document.getElementById("sel-mutation"),
  selPlan: document.getElementById("sel-plan"),
  paused: document.getElementById("overlay-paused"),
};

let sim = null;
let running = true;
let selectedId = null;
let last = performance.now();
let acc = 0;
let msPerTick = 30;
const MAX_STEPS = 8;

const CFG = {
  seed: Date.now(),
  pop: 300,
  worldW: 60,
  worldH: 60,
};

const ROLE_COLORS = {
  free: 0x888888,
  gatherer: 0x22c55e,
  reproducer: 0xf59e0b,
  defender: 0xef4444,
  signal: 0x06b6d4,
};

// ---- Three.js ----
let renderer, scene, camera, controls;
let grid, foodMesh;
let organGroups = new Map(); // morphotypeKey -> InstancedMesh group data
let bondLines = null; // LineSegments showing colony structure

function initThree() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.shadowMap.enabled = true;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070a);
  scene.fog = new THREE.FogExp2(0x05070a, 0.015);

  camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.5, 400);
  camera.position.set(100, 80, 100);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 10;
  controls.maxDistance = 350;

  const amb = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(amb);
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(60, 80, 60);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  scene.add(dir);

  grid = new THREE.GridHelper(240, 48, 0x1a1f29, 0x0f121c);
  grid.position.y = 0.01;
  scene.add(grid);

  const foodGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const foodMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e, emissive: 0x113311, emissiveIntensity: 0.5,
  });
  foodMesh = new THREE.InstancedMesh(foodGeo, foodMat, 8192);
  foodMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  foodMesh.castShadow = true;
  foodMesh.receiveShadow = true;
  scene.add(foodMesh);

  bondLines = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }),
  );
  bondLines.frustumCulled = false;
  scene.add(bondLines);

  window.addEventListener("resize", onResize);
  canvas.addEventListener("pointerdown", onPointerDown);
}

function onResize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function createSim() {
  sim = new Simulation({
    seed: CFG.seed,
    width: CFG.worldW,
    height: CFG.worldH,
    initialPopulation: CFG.pop,
    initialEnergy: 60,
    foodRegenRate: 0.05,
    foodMaxPerCell: 100,
    foodSpawnChance: 0.03,
    pheromoneDecay: 0.02,
    maxTicks: 0,
  });
  selectedId = null;
  updateInspector(null);
  clearOrganGroups();
}

function clearOrganGroups() {
  organGroups.forEach((g) => scene.remove(g.mesh));
  organGroups.clear();
}

function buildGeometry(parts) {
  const positions = [];
  const normals = [];
  const colors = [];
  const indices = [];
  let vi = 0;
  for (const p of parts) {
    let geo;
    if (p.kind === "sphere") geo = new THREE.SphereGeometry(1, 10, 8);
    else if (p.kind === "cylinder") geo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, false);
    else geo = new THREE.BoxGeometry(1, 1, 1);
    const m = new THREE.Matrix4();
    m.compose(
      new THREE.Vector3(...p.position),
      new THREE.Euler(...p.rotation),
      new THREE.Vector3(...p.scale)
    );
    geo.applyMatrix4(m);
    const pos = geo.attributes.position.array;
    const nor = geo.attributes.normal.array;
    const nv = pos.length / 3;
    const base = vi;
    for (let i = 0; i < nv; i++) {
      positions.push(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]);
      normals.push(nor[3 * i], nor[3 * i + 1], nor[3 * i + 2]);
      colors.push(p.color[0], p.color[1], p.color[2]);
    }
    if (geo.index) {
      const ind = geo.index.array;
      for (let i = 0; i < ind.length; i++) indices.push(base + ind[i]);
    } else {
      for (let i = 0; i < nv; i += 3) indices.push(base + i, base + i + 1, base + i + 2);
    }
    vi += nv;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}

function getGroup(key, morpho) {
  let g = organGroups.get(key);
  if (g) return g;
  const parts = generateModel(morpho, 60, 1);
  const geometry = buildGeometry(parts);
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.6, metalness: 0.1,
  });
  const mesh = new THREE.InstancedMesh(geometry, mat, 8192);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  g = { key, mesh, parts, mat, matrices: [], colors: [], count: 0, dummy: new THREE.Object3D() };
  organGroups.set(key, g);
  return g;
}

function colonyColor(colonyId) {
  let h = 2166136261 >>> 0;
  const s = String(colonyId);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return new THREE.Color().setHSL(h % 360, 0.5, 0.55);
}

function updateOrganisms() {
  organGroups.forEach((g) => (g.count = 0));
  const foodInstances = [];
  const state = sim.getState();
  const W = sim.world.width;

  const dummy = new THREE.Object3D();
  const bondPos = [];

  for (const org of state.organisms) {
    const morpho = dnaToMorphotype(org.genome.dna);
    const key = morphotypeKey(morpho);
    const g = getGroup(key, morpho);
    const idx = g.count++;
    const s = org.genome.traits.size;
    const scale = 0.35 + 0.55 * s;
    dummy.position.set(org.x, 0.45, org.y);
    dummy.rotation.set(0, org.age * 0.012, 0);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    g.matrices[idx] = dummy.matrix.elements.slice();

    // role-based color, tinted by colony hue for group identity
    const rc = ROLE_COLORS[org.role] ?? 0xffffff;
    let base = new THREE.Color(rc);
    if (org.colonyId !== null) {
      const ch = colonyColor(org.colonyId);
      base.lerp(ch, 0.4);
    }
    g.colors[idx] = [base.r, base.g, base.b];
  }

  // colony bonds: lines from centroid to each member
  for (const c of sim.colonies.values()) {
    if (c.dead || c.memberIds.length === 0) continue;
    const cx = c.x, cy = c.y;
    for (const mid of c.memberIds) {
      const o = sim.organisms.find((x) => x.id === mid);
      if (!o || o.dead) continue;
      bondPos.push(cx, 0.45, cy, o.x, 0.45, o.y);
    }
  }

  organGroups.forEach((g) => {
    if (g.count === 0) { g.mesh.count = 0; return; }
    g.mesh.count = g.count;
    for (let i = 0; i < g.count; i++) {
      g.mesh.setMatrixAt(i, new THREE.Matrix4().fromArray(g.matrices[i]));
    }
    if (!g.mesh.instanceColor || g.mesh.instanceColor.count < g.count) {
      g.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(g.count * 3), 3);
    }
    g.mesh.instanceColor.count = g.count;
    for (let i = 0; i < g.count; i++) {
      const col = g.colors[i];
      g.mesh.instanceColor.setXYZ(i, col[0], col[1], col[2]);
    }
    g.mesh.instanceMatrix.needsUpdate = true;
    g.mesh.instanceColor.needsUpdate = true;
  });

  foodMesh.count = foodInstances.length;
  const fd = new THREE.Object3D();
  const fc = new THREE.Color();
  for (let i = 0; i < foodInstances.length; i++) {
    const f = foodInstances[i];
    fd.position.set(f.x, f.s * 0.4, f.y);
    fd.scale.set(f.s, f.s, f.s);
    fd.updateMatrix();
    foodMesh.setMatrixAt(i, fd.matrix);
    fc.setHSL(120 / 360, 0.6, 0.35 + 0.4 * f.br);
    foodMesh.instanceColor.setXYZ(i, fc.r, fc.g, fc.b);
  }
  foodMesh.instanceMatrix.needsUpdate = true;
  foodMesh.instanceColor.needsUpdate = true;

  // update bond lines
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(bondPos, 3));
  lineGeo.computeBoundingSphere();
  bondLines.geometry = lineGeo;
  bondLines.geometry.attributes.position.needsUpdate = true;
}

function drawHud() {
  if (!sim) return;
  const st = sim.stats();
  els.tick.textContent = st.tick.toLocaleString();
  els.popStat.textContent = st.population.toLocaleString();
  els.colonies.textContent = st.colonyCount.toLocaleString();
  els.births.textContent = st.totalBirths.toLocaleString();
  els.sexual.textContent = st.totalSexualBirths.toLocaleString();
  els.buds.textContent = st.totalColonyBuds.toLocaleString();
  els.deaths.textContent = st.totalDeaths.toLocaleString();
  els.apoptosis.textContent = st.totalApoptosis.toLocaleString();
  els.kills.textContent = st.totalKills.toLocaleString();
  els.colonyDeaths.textContent = st.totalColonyDeaths.toLocaleString();
  els.species.textContent = st.speciesCount.toLocaleString();
  els.day.textContent = st.day.toLocaleString();
  els.energy.textContent = st.avgEnergy.toFixed(1);
  els.size.textContent = st.avgSize.toFixed(2);
  els.strength.textContent = st.avgStrength.toFixed(2);
  els.aggression.textContent = st.avgAggression.toFixed(2);
  els.cooperation.textContent = st.avgCooperation.toFixed(2);
  els.mutation.textContent = st.avgMutationRate.toFixed(4);
}

function drawInspector() {
  if (!sim) return;
  const org = sim.organisms.find((o) => o.id === selectedId);
  if (!org) {
    els.inspector.classList.add("empty");
    return;
  }
  els.inspector.classList.remove("empty");
  const t = org.genome.traits;
  const morpho = dnaToMorphotype(org.genome.dna);
  const colony = org.colonyId !== null ? sim.colonies.get(org.colonyId) : null;
  els.selId.textContent = org.id;
  els.selColony.textContent = colony ? colony.id.toString() : "— (unicellular)";
  els.selRole.textContent = org.role;
  els.selDna.textContent = dnaString(org.genome.dna);
  els.selEnergy.textContent = org.energy.toFixed(1);
  els.selAge.textContent = org.age.toString();
  els.selGen.textContent = org.generation.toString();
  els.selSize.textContent = t.size.toFixed(2);
  els.selStrength.textContent = t.strength.toFixed(2);
  els.selAggression.textContent = t.aggression.toFixed(2);
  els.selAltruism.textContent = t.altruism.toFixed(2);
  els.selBio.textContent = t.bioluminescence.toFixed(2);
  els.selMutation.textContent = t.evolvableMutationRate.toFixed(4);
  els.selPlan.textContent = `${morpho.bodyPlan} · ${morpho.segmentCount} seg · ${morpho.limbPairs} limbs · colony: ${colony ? colony.memberIds.length : 0} cells`;
}

function onPointerDown(e) {
  if (!sim) return;
  const rect = canvas.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1,
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  const hits = [];
  organGroups.forEach((g) => hits.push(...raycaster.intersectObject(g.mesh, false)));
  hits.sort((a, b) => a.distance - b.distance);
  selectedId = null;
  if (hits.length) {
    const pt = hits[0].point;
    let best = null, bestD = 1e9;
    for (const o of sim.organisms) {
      const d = Math.hypot(o.x - pt.x, o.y - pt.z);
      if (d < bestD) { bestD = d; best = o; }
    }
    selectedId = best ? best.id : null;
  }
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(now - last, 200);
  last = now;
  acc += dt;
  const cap = MAX_STEPS * msPerTick;
  if (acc > cap) acc = cap;
  let steps = running ? Math.floor(acc / msPerTick) : 0;
  if (steps > MAX_STEPS) steps = MAX_STEPS;
  for (let i = 0; i < steps; i++) sim.step();
  acc -= steps * msPerTick;

  updateOrganisms();
  controls.update();
  renderer.render(scene, camera);

  drawHud();
  drawInspector();
}

function bindUI() {
  els.play.addEventListener("click", () => {
    running = !running;
    els.play.textContent = running ? "Pause" : "Resume";
    els.paused.classList.toggle("hidden", running);
  });
  els.reset.addEventListener("click", () => {
    CFG.seed = parseInt(els.seed.value || Date.now(), 10) || Date.now();
    CFG.pop = parseInt(els.pop.value || 300, 10);
    const m = els.world.value.match(/^(\d+)\s*[xXx]\s*(\d+)$/);
    if (m) {
      CFG.worldW = Math.max(20, Math.min(200, parseInt(m[1], 10)));
      CFG.worldH = Math.max(20, Math.min(200, parseInt(m[2], 10)));
    }
    createSim();
  });
  els.speed.addEventListener("input", (e) => {
    const v = parseInt(e.target.value || 50, 10);
    msPerTick = 120 - v * 1.1;
    if (msPerTick < 4) msPerTick = 4;
  });
}

function main() {
  initThree();
  createSim();
  bindUI();
  last = performance.now();
  requestAnimationFrame((t) => { last = t; animate(t); });
}

main();
