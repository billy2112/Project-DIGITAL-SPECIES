import * as THREE from "https://esm.sh/three@0.168.0";
import { OrbitControls } from "https://esm.sh/three@0.168.0/examples/jsm/controls/OrbitControls.js";
import { generateModel, morphotypeKey } from "./dist/dna3d.js";
import { Simulation } from "./dist/simulation.js";
import { genomeHashColor, dnaToMorphotype as dnaToMorphotype2, dnaString as dnaString2, genomeDistance } from "./dist/genome.js";
import { saveToJSON, loadFromJSON } from "./dist/serialization.js";
import { downloadBlob } from "./dist/data-export.js";
import { runExperiment, getExperimentNames, downloadExperimentCsv, downloadExperimentJson } from "./dist/experiment-runner.js";
import { buildPhylogeny, phylogenyToNewick, phylogenyCsv, downloadPhylogenyCsv, downloadPhylogenyNewick } from "./dist/phylogeny.js";
import { analyzeFitnessLandscape, fitnessLandscapeToCsv, fitnessLandscapeSummary } from "./dist/fitness-landscape.js";
import { NoveltyDetector } from "./dist/novelty-detector.js";
import { bootstrapCI, permutationTest, compareGroups, summarizeReplicates, correlation } from "./dist/statistics.js";
import { createProvenanceRecord, formatExperimentReport, SOFTWARE_VERSION, SIMULATION_VERSION } from "./dist/provenance.js";

// ---- DOM refs ----
const canvas = document.getElementById("gl-canvas");
const els = {
  play: document.getElementById("btn-play"),
  step: document.getElementById("btn-step"),
  reset: document.getElementById("btn-reset"),
  speed: document.getElementById("inp-speed"),
  speedVal: document.getElementById("speed-val"),
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
  sysMode: document.getElementById("sys-mode"),
  sysState: document.getElementById("sys-state"),
  sysFps: document.getElementById("sys-fps"),
  sysTick: document.getElementById("sys-tick"),
  inspectTag: document.getElementById("inspect-tag"),
  inspectContent: document.getElementById("inspect-content"),
  analyticsContent: document.getElementById("analytics-content"),
  panelInspect: document.getElementById("panel-inspect"),
  panelAnalytics: document.getElementById("panel-analytics"),
  panelExperiment: document.getElementById("panel-experiment"),
  chipInspect: document.getElementById("chip-inspect"),
  chipAnalytics: document.getElementById("chip-analytics"),
  chipExperiment: document.getElementById("chip-experiment"),
  chipExport: document.getElementById("chip-export"),
  chipSave: document.getElementById("chip-save"),
  chipLoad: document.getElementById("chip-load"),
  paused: document.getElementById("overlay-paused"),
  error: document.getElementById("overlay-error"),
  errorTitle: document.getElementById("error-title"),
  errorMsg: document.getElementById("error-msg"),
  errorReset: document.getElementById("error-reset"),
  noveltyBadge: document.getElementById("novelty-badge"),
  expSelect: document.getElementById("exp-select"),
  expReplicates: document.getElementById("exp-replicates"),
  expTicks: document.getElementById("exp-ticks"),
  expResults: document.getElementById("exp-results"),
  btnRunExp: document.getElementById("btn-run-exp"),
  btnCompareExp: document.getElementById("btn-compare-exp"),
};

// ---- State ----
let sim = null;
let running = true;
let selectedId = null;
let last = performance.now();
let acc = 0;
let frame = 0;
let fpsAcc = 0;
let fpsFrames = 0;
let fps = 0;
let msPerTick = 30;
const MAX_STEPS = 8;

const CFG = {
  seed: Date.now(),
  pop: 100,
  worldW: 40,
  worldH: 40,
};

const ROLE_COLORS = {
  free: 0x888888,
  gatherer: 0x22c55e,
  reproducer: 0xf59e0b,
  defender: 0xef4444,
  signal: 0x06b6d4,
};

let inspectOpen = false;
let analyticsOpen = false;
let experimentOpen = false;
let webglFailed = false;
let noveltyDetector = null;

// ---- Three.js ----
let renderer, scene, camera, controls;
let grid, foodMesh;
let organGroups = new Map();
let bondLines = null;
let selectionRing = null;

function initThree() {
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
  } catch (e) {
    webglFailed = true;
    showError("WebGL unavailable on this device. Try another browser.");
    return false;
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030508);
  scene.fog = new THREE.FogExp2(0x030508, 0.012);

  camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / Math.max(canvas.clientHeight, 1), 0.5, 400);
  camera.position.set(90, 60, 90);

  try {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 8;
    controls.maxDistance = 300;
  } catch (e) {
    controls = null;
  }

  const amb = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(amb);
  const dir = new THREE.DirectionalLight(0xffffff, 0.7);
  dir.position.set(50, 70, 50);
  dir.castShadow = true;
  dir.shadow.mapSize.set(512, 512);
  scene.add(dir);

  grid = new THREE.GridHelper(240, 48, 0x1a1f29, 0x0f121c);
  grid.position.y = 0.01;
  scene.add(grid);

  const foodGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const foodMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x113311, emissiveIntensity: 0.5 });
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

  const ringGeo = new THREE.RingGeometry(0.9, 1.1, 32);
  const ringMat = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0 });
  selectionRing = new THREE.LineLoop(ringGeo, ringMat);
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.visible = false;
  scene.add(selectionRing);

  noveltyDetector = new NoveltyDetector(100);

  window.addEventListener("resize", onResize);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("touchstart", onTouchStart, { passive: false });
  return true;
}

function onResize() {
  if (webglFailed || !renderer || !camera) return;
  const w = canvas.clientWidth;
  const h = Math.max(canvas.clientHeight, 1);
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
  noveltyDetector = new NoveltyDetector(100);
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
      new THREE.Vector3(...p.scale),
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

function colonyColor(colonyId) {
  let h = 2166136261 >>> 0;
  const s = String(colonyId);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return new THREE.Color().setHSL(h % 360, 0.5, 0.55);
}

function getGroup(key, morpho) {
  let g = organGroups.get(key);
  if (g) return g;
  const parts = generateModel(morpho, 60, 1);
  const geometry = buildGeometry(parts);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.1 });
  const mesh = new THREE.InstancedMesh(geometry, mat, 8192);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  g = { key, mesh, parts, mat, matrices: [], colors: [], count: 0, dummy: new THREE.Object3D() };
  organGroups.set(key, g);
  return g;
}

function updateOrganisms() {
  organGroups.forEach((g) => (g.count = 0));
  const foodInstances = [];
  const state = sim.getState();
  const W = sim.world.width;

  const dummy = new THREE.Object3D();
  const bondPos = [];

  const snap = state.snapshot;
  const food = snap.food;
  for (let i = 0; i < food.length; i++) {
    const f = food[i];
    if (f <= 0.5) continue;
    const y = (i / W) | 0;
    const x = i % W;
    const br = Math.min(1, f / 100);
    const nr = Math.min(1, snap.nutrients[i] / 100);
    foodInstances.push({ x: x + 0.5, y: y + 0.5, s: 0.3 + 0.4 * br, br, nr });
  }

  for (const org of state.organisms) {
    const morpho = dnaToMorphotype2(org.genome.dna);
    const key = morphotypeKey(morpho);
    const g = getGroup(key, morpho);
    const idx = g.count++;
    const s = org.genome.traits.size;
    const scale = 0.8 + 1.3 * s;
    const isSelected = selectedId !== null && org.id === selectedId;
    dummy.position.set(org.x, 0.5, org.y);
    dummy.rotation.set(0, org.age * 0.012, 0);
    dummy.scale.set(scale * (isSelected ? 1.4 : 1), scale * (isSelected ? 1.4 : 1), scale * (isSelected ? 1.4 : 1));
    dummy.updateMatrix();
    g.matrices[idx] = dummy.matrix.elements.slice();

    const rc = ROLE_COLORS[org.role] ?? 0xffffff;
    let base = new THREE.Color(rc);
    if (org.colonyId !== null) {
      const ch = colonyColor(org.colonyId);
      base.lerp(ch, 0.4);
    }
    if (isSelected) {
      base = new THREE.Color(0xffffff);
      g.colors[idx] = [1, 1, 1];
    } else {
      g.colors[idx] = [base.r, base.g, base.b];
    }
  }

  const orgById = new Map();
  for (const o of state.organisms) orgById.set(o.id, o);
  const MAX_BONDS = 2048;
  let bondCount = 0;
  for (const c of sim.colonies.values()) {
    if (c.dead || c.memberIds.length === 0) continue;
    const cx = c.x, cy = c.y;
    for (const mid of c.memberIds) {
      if (bondCount >= MAX_BONDS) break;
      const o = orgById.get(mid);
      if (!o || o.dead) continue;
      bondPos.push(cx, 0.45, cy, o.x, 0.45, o.y);
      bondCount++;
    }
    if (bondCount >= MAX_BONDS) break;
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
  if (!foodMesh.instanceColor || foodMesh.instanceColor.count < foodInstances.length) {
    foodMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(foodInstances.length, 1) * 3), 3);
  }
  foodMesh.instanceColor.count = foodInstances.length;
  for (let i = 0; i < foodInstances.length; i++) {
    const f = foodInstances[i];
    fd.position.set(f.x, f.s * 0.4, f.y);
    fd.scale.set(f.s, f.s, f.s);
    fd.updateMatrix();
    foodMesh.setMatrixAt(i, fd.matrix);
    fc.setHSL((120 + f.nr * 60) / 360, 0.6, 0.35 + 0.4 * f.br);
    foodMesh.instanceColor.setXYZ(i, fc.r, fc.g, fc.b);
  }
  foodMesh.instanceMatrix.needsUpdate = true;
  foodMesh.instanceColor.needsUpdate = true;

  const linePos = bondLines.geometry.attributes.position;
  const needed = bondPos.length;
  if (!linePos || linePos.count * 3 < needed) {
    bondLines.geometry.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(needed), 3));
  }
  const arr = bondLines.geometry.attributes.position.array;
  for (let i = 0; i < needed; i++) arr[i] = bondPos[i];
  bondLines.geometry.setDrawRange(0, needed);
  bondLines.geometry.attributes.position.needsUpdate = true;

  // Update selection ring
  if (selectionRing) {
    if (selectedId !== null) {
      const org = sim.organisms.find((o) => o.id === selectedId);
      if (org) {
        selectionRing.position.set(org.x, 0.46, org.y);
        selectionRing.visible = true;
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 400);
        selectionRing.material.opacity = pulse;
      } else {
        selectionRing.visible = false;
      }
    } else {
      selectionRing.visible = false;
    }
  }
}

function setText(el, text) {
  if (el) el.textContent = text;
}

function setHTML(el, html) {
  if (el) el.innerHTML = html;
}

function drawHud() {
  if (!sim) return;
  const st = sim.stats();
  setText(els.tick, st.tick.toLocaleString());
  setText(els.popStat, st.population.toLocaleString());
  setText(els.colonies, st.colonyCount.toLocaleString());
  setText(els.births, st.totalBirths.toLocaleString());
  setText(els.sexual, st.totalSexualBirths.toLocaleString());
  setText(els.buds, st.totalColonyBuds.toLocaleString());
  setText(els.deaths, st.totalDeaths.toLocaleString());
  setText(els.apoptosis, st.totalApoptosis.toLocaleString());
  setText(els.kills, st.totalKills.toLocaleString());
  setText(els.colonyDeaths, st.totalColonyDeaths.toLocaleString());
  setText(els.species, st.speciesCount.toLocaleString());
  setText(els.day, st.day.toLocaleString());
  setText(els.energy, st.avgEnergy.toFixed(1));
  setText(els.size, st.avgSize.toFixed(2));
  setText(els.strength, st.avgStrength.toFixed(2));
  setText(els.aggression, st.avgAggression.toFixed(2));
  setText(els.cooperation, st.avgCooperation.toFixed(2));
  setText(els.mutation, st.avgMutationRate.toFixed(4));
  setText(els.sysTick, st.tick.toLocaleString());

  const alive = sim.organisms.filter((o) => !o.dead);
  let totalGen = 0, totalAge = 0, maxAge = 0;
  let totalSize = 0, totalStrength = 0, totalAggression = 0;
  let totalAltruism = 0, totalCooperation = 0;
  for (const o of alive) {
    totalGen += o.generation;
    totalAge += o.age;
    if (o.age > maxAge) maxAge = o.age;
    const t = o.genome.traits;
    totalSize += t.size;
    totalStrength += t.strength;
    totalAggression += t.aggression;
    totalAltruism += t.altruism;
    totalCooperation += t.cooperation;
  }
  const n = alive.length;
  setText(document.getElementById("stat-gen"), n > 0 ? (totalGen / n).toFixed(1) : "0");
  setText(document.getElementById("stat-lifespan"), n > 0 ? (totalAge / n).toFixed(1) : "0");
  setText(document.getElementById("stat-top-species"), n > 0 ? "0%" : "0%");
  setText(document.getElementById("stat-colony-cells"), st.colonyCount > 0 ? "0" : "0");
  setText(document.getElementById("stat-largest-colony"), "0");
  setText(document.getElementById("trait-size"), n > 0 ? (totalSize / n).toFixed(2) : "0");
  setText(document.getElementById("trait-strength"), n > 0 ? (totalStrength / n).toFixed(2) : "0");
  setText(document.getElementById("trait-aggression"), n > 0 ? (totalAggression / n).toFixed(2) : "0");
  setText(document.getElementById("trait-altruism"), n > 0 ? (totalAltruism / n).toFixed(2) : "0");
  setText(document.getElementById("trait-cooperation"), n > 0 ? (totalCooperation / n).toFixed(2) : "0");
}

function updateInspector() {
  if (!sim) return;
  const org = sim.organisms.find((o) => o.id === selectedId);
  if (!org) {
    setHTML(els.inspectContent,
      '<div class="inspect-empty">Tap an organism to inspect DNA, genes, colony &amp; neural network.</div>');
    return;
  }
  const t = org.genome.traits;
  const morpho = dnaToMorphotype2(org.genome.dna);
  const colony = org.colonyId !== null ? sim.colonies.get(org.colonyId) : null;
  const rows = [
    ["Role", org.role],
    ["DNA", dnaString2(org.genome.dna)],
    ["Energy", org.energy.toFixed(1)],
    ["Age", org.age],
    ["Generation", org.generation],
    ["Size", t.size.toFixed(2)],
    ["Strength", t.strength.toFixed(2)],
    ["Aggression", t.aggression.toFixed(2)],
    ["Altruism", t.altruism.toFixed(2)],
    ["Biolum.", t.bioluminescence.toFixed(2)],
    ["Mutation", t.evolvableMutationRate.toFixed(4)],
    ["Learning", t.evolvableLearningRate.toFixed(4)],
    ["Body plan", `${morpho.bodyPlan} · ${morpho.segmentCount} seg · ${morpho.limbPairs} limbs`],
    ["Colony", colony ? colony.id.toString() : "— (unicellular)"],
    ["Parent", o.parentId ?? "—"],
  ];
  let html = "";
  for (const [k, v] of rows) {
    html += `<div class="inspect-row"><span class="k">${k}</span><span class="v">${v}</span></div>`;
  }
  setHTML(els.inspectContent, html);
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
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const target = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, target);
  if (!target) return;
  const wx = target.x;
  const wy = target.z;
  let best = null;
  let bestD = 6.0;
  for (const o of sim.organisms) {
    const d = Math.hypot(o.x - wx, o.y - wy);
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  selectedId = best ? best.id : null;
  updateInspector();
}

function onTouchStart(e) {
  if (!sim) return;
  const t = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((t.clientX - rect.left) / rect.width) * 2 - 1,
    -((t.clientY - rect.top) / rect.height) * 2 + 1,
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const target = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, target);
  if (!target) return;
  const wx = target.x;
  const wy = target.z;
  let best = null;
  let bestD = 6.0;
  for (let i = 0; i < sim.organisms.length; i++) {
    const o = sim.organisms[i];
    const d = Math.hypot(o.x - wx, o.y - wy);
    if (d < bestD) { bestD = d; best = o; }
  }
  selectedId = best ? best.id : null;
  updateInspector();
}

function showError(msg) {
  webglFailed = true;
  if (els.errorTitle) els.errorTitle.textContent = "Error";
  if (els.errorMsg) els.errorMsg.textContent = msg;
  if (els.error) els.error.classList.add("show");
}

function animate(now) {
  requestAnimationFrame(animate);
  try {
    if (!webglFailed && renderer && scene && camera) {
      const dt = Math.min(now - last, 200);
      last = now;
      acc += dt;
      const cap = MAX_STEPS * msPerTick;
      if (acc > cap) acc = cap;
      let steps = running ? Math.floor(acc / msPerTick) : 0;
      if (steps > MAX_STEPS) steps = MAX_STEPS;
      for (let i = 0; i < steps; i++) {
        try {
          sim.step();
        } catch (e) {
          showError("Simulation error: " + (e && e.message ? e.message : String(e)));
          running = false;
          break;
        }
      }
      acc -= steps * msPerTick;

      updateOrganisms();
      controls?.update();
      renderer.render(scene, camera);

      if (frame % 6 === 0) {
        drawHud();
        drawInspector();
        noveltyDetector.record(sim);
        const ndResult = noveltyDetector.detect(sim);
        if (ndResult.newBehaviors.length > 0) {
          els.noveltyBadge.classList.add("show");
          els.noveltyBadge.textContent = "NEW: " + ndResult.newBehaviors[0];
        }
      }

      fpsAcc += dt;
      fpsFrames++;
      if (fpsAcc >= 1000) {
        fps = Math.round((fpsFrames * 1000) / fpsAcc);
        fpsAcc = 0;
        fpsFrames = 0;
        if (els.sysFps) els.sysFps.textContent = fps;
      }
      frame++;
    }
  } catch (e) {
    showError("Render error: " + (e && e.message ? e.message : String(e)));
  }
}

function bindUI() {
  if (els.play) {
    els.play.addEventListener("click", () => {
      running = !running;
      els.play.textContent = running ? "Pause" : "Resume";
      if (els.sysState) {
        els.sysState.textContent = running ? "RUNNING" : "PAUSED";
        els.sysState.style.color = running ? "#00ff88" : "#ff6b6b";
      }
      if (els.paused) {
        els.paused.classList.toggle("hidden", running);
        els.paused.classList.toggle("show", !running);
      }
    });
  }
  if (els.step) {
    els.step.addEventListener("click", () => {
      if (sim) {
        try {
          sim.step();
        } catch (e) {
          showError("Simulation error: " + (e && e.message ? e.message : String(e)));
          return;
        }
        updateOrganisms();
        drawHud();
        drawInspector();
      }
    });
  }
  if (els.reset) {
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
  }
  if (els.speed) {
    els.speed.addEventListener("input", (e) => {
      const v = parseInt(e.target.value || 50, 10);
      msPerTick = 120 - v * 1.1;
      if (msPerTick < 4) msPerTick = 4;
      if (els.speedVal) els.speedVal.textContent = v;
    });
    els.speed.addEventListener("change", (e) => {
      const v = parseInt(e.target.value || 50, 10);
      if (els.speedVal) els.speedVal.textContent = v;
    });
  }

  // Panel toggles
  if (els.chipInspect) {
    els.chipInspect.addEventListener("click", () => {
      inspectOpen = !inspectOpen;
      analyticsOpen = false;
      experimentOpen = false;
      if (els.panelInspect) els.panelInspect.classList.toggle("open", inspectOpen);
      if (els.panelAnalytics) els.panelAnalytics.classList.toggle("open", false);
      if (els.panelExperiment) els.panelExperiment.classList.toggle("open", false);
      if (els.chipInspect) els.chipInspect.classList.toggle("active", inspectOpen);
      if (els.chipAnalytics) els.chipAnalytics.classList.toggle("active", false);
      if (els.chipExperiment) els.chipExperiment.classList.toggle("active", false);
    });
  }
  if (els.chipAnalytics) {
    els.chipAnalytics.addEventListener("click", () => {
      analyticsOpen = !analyticsOpen;
      inspectOpen = false;
      experimentOpen = false;
      if (els.panelAnalytics) els.panelAnalytics.classList.toggle("open", analyticsOpen);
      if (els.panelInspect) els.panelInspect.classList.toggle("open", false);
      if (els.panelExperiment) els.panelExperiment.classList.toggle("open", false);
      if (els.chipAnalytics) els.chipAnalytics.classList.toggle("active", analyticsOpen);
      if (els.chipInspect) els.chipInspect.classList.toggle("active", false);
      if (els.chipExperiment) els.chipExperiment.classList.toggle("active", false);
    });
  }
  if (els.chipExperiment) {
    els.chipExperiment.addEventListener("click", () => {
      experimentOpen = !experimentOpen;
      inspectOpen = false;
      analyticsOpen = false;
      if (els.panelExperiment) els.panelExperiment.classList.toggle("open", experimentOpen);
      if (els.panelInspect) els.panelInspect.classList.toggle("open", false);
      if (els.panelAnalytics) els.panelAnalytics.classList.toggle("open", false);
      if (els.chipExperiment) els.chipExperiment.classList.toggle("active", experimentOpen);
      if (els.chipInspect) els.chipInspect.classList.toggle("active", false);
      if (els.chipAnalytics) els.chipAnalytics.classList.toggle("active", false);
      if (experimentOpen) populateExperimentSelect();
    });
  }

  // Experiment select
  if (els.expSelect) {
    els.expSelect.addEventListener("change", () => {
      const name = els.expSelect.value;
      const exp = getExperiment(name);
      if (exp) {
        document.getElementById("exp-tag").textContent = exp.name;
        const desc = document.getElementById("exp-desc") || null;
        if (desc) desc.textContent = exp.description;
      }
    });
  }

  // Run experiment
  if (els.btnRunExp) {
    els.btnRunExp.addEventListener("click", () => {
      if (!sim) return;
      const name = els.expSelect.value;
      const exp = getExperiment(name);
      if (!exp) return;
      const replicates = parseInt(els.expReplicates.value || 5, 10);
      const ticks = parseInt(els.expTicks.value || 500, 10);
      const config = {
        name: exp.name,
        description: exp.description,
        simConfig: exp.simConfig,
        parameterGrid: {},
        tickLimit: ticks,
        replicates,
      };
      try {
        const result = runExperiment(config);
        displayExperimentResult(result);
      } catch (e) {
        showError("Experiment error: " + (e && e.message ? e.message : String(e)));
      }
    });
  }

  // Save chip
  if (els.chipSave) {
    els.chipSave.addEventListener("click", () => {
      if (!sim) return;
      const json = saveToJSON(sim);
      downloadBlob(json, `simulation_t${sim.currentTick}.json`, "application/json");
    });
  }

  // Load chip
  if (els.chipLoad) {
    els.chipLoad.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            sim = loadFromJSON(ev.target.result);
            selectedId = null;
            clearOrganGroups();
            CFG.seed = sim.simConfig.seed;
            CFG.pop = sim.organisms.length;
            if (els.seed) els.seed.value = CFG.seed;
            if (els.pop) els.pop.value = CFG.pop;
            if (els.world) els.world.value = `${sim.simConfig.width}x${sim.simConfig.height}`;
            if (els.sysState) {
              els.sysState.textContent = "RUNNING";
              els.sysState.style.color = "#00ff88";
            }
            updateInspector(null);
            if (els.error) els.error.classList.remove("show");
          } catch (err) {
            showError("Load error: " + (err && err.message ? err.message : String(err)));
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }

  if (els.errorReset) {
    els.errorReset.addEventListener("click", () => {
      if (els.error) els.error.classList.remove("show");
      webglFailed = false;
      running = true;
      last = performance.now();
      acc = 0;
      frame = 0;
      const ok = initThree();
      if (ok && !webglFailed) {
        createSim();
      }
    });
  }
}

function populateExperimentSelect() {
  if (!els.expSelect) return;
  els.expSelect.innerHTML = "";
  const names = getExperimentNames();
  for (const name of names) {
    const exp = getExperiment(name);
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = exp.name;
    els.expSelect.appendChild(opt);
  }
}

function displayExperimentResult(result) {
  if (!els.expResults) return;
  let html = `<h4 style="color:#00ff88;margin:0 0 8px;">${result.name}</h4>`;
  html += `<div style="font-size:10px;color:#6a7488;margin-bottom:8px;">Replicates: ${result.runs.length} | Ticks: ${result.config.tickLimit}</div>`;
  html += `<div style="display:grid;gap:4px;">`;
  for (const [k, s] of Object.entries(result.summary)) {
    const sig = Math.abs(s.diff || 0) > 0 ? "sig" : "nsig";
    html += `<div class="exp-stat"><span class="k">${k}</span><span class="v ${sig}">${s.mean.toFixed(2)} ± ${s.std.toFixed(2)}</span></div>`;
  }
  html += `</div>`;
  setHTML(els.expResults, html);
}

function main() {
  let ok = false;
  try {
    ok = initThree();
  } catch (e) {
    showError("Init error: " + (e && e.message ? e.message : String(e)));
    ok = false;
  }

  if (ok && !webglFailed) {
    try {
      createSim();
    } catch (e) {
      showError("Startup error: " + (e && e.message ? e.message : String(e)));
    }
  }
  bindUI();

  last = performance.now();
  requestAnimationFrame((t) => { last = t; animate(t); });
}

window.__dsReady = true;
main();
