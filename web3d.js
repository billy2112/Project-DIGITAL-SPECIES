import * as THREE from "https://esm.sh/three@0.168.0";
import { OrbitControls } from "https://esm.sh/three@0.168.0/examples/jsm/controls/OrbitControls.js";
import {
  generateModel,
  morphotypeKey,
} from "./dist/dna3d.js";
import { Simulation } from "./dist/simulation.js";
import { genomeHashColor, dnaToMorphotype, dnaString } from "./dist/genome.js";
import { saveToJSON, loadFromJSON } from "./dist/serialization.js";
import { runExperiment, getExperimentNames } from "./dist/experiments.js";

// ---- DOM refs ----
const canvas = document.getElementById("gl-canvas");
const els = {
  play: document.getElementById("btn-play"),
  step: document.getElementById("btn-step"),
  reset: document.getElementById("btn-reset"),
  seed: document.getElementById("inp-seed"),
  pop: document.getElementById("inp-pop"),
  world: document.getElementById("inp-world"),
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
  chipInspect: document.getElementById("chip-inspect"),
  chipAnalytics: document.getElementById("chip-analytics"),
  chipExperiment: document.getElementById("chip-experiment"),
  chipSave: document.getElementById("chip-save"),
  chipLoad: document.getElementById("chip-load"),
  paused: document.getElementById("overlay-paused"),
  error: document.getElementById("overlay-error"),
  errorTitle: document.getElementById("error-title"),
  errorMsg: document.getElementById("error-msg"),
  errorReset: document.getElementById("error-reset"),
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
let webglFailed = false;

// ---- Three.js ----
let renderer, scene, camera, controls;
let grid, foodMesh;
let organGroups = new Map();
let bondLines = null;

function initThree() {
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
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

  camera = new THREE.PerspectiveCamera(
    50,
    canvas.clientWidth / Math.max(canvas.clientHeight, 1),
    0.5,
    400,
  );
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
  const foodMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x113311,
    emissiveIntensity: 0.5,
  });
  foodMesh = new THREE.InstancedMesh(foodGeo, foodMat, 8192);
  foodMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  foodMesh.castShadow = true;
  foodMesh.receiveShadow = true;
  scene.add(foodMesh);

  bondLines = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
    }),
  );
  bondLines.frustumCulled = false;
  scene.add(bondLines);

window.addEventListener("resize", onResize);
canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("touchstart", function (e) {
  // Convert first touch to a pointerdown-like event
  var t = e.touches[0];
  var rect = canvas.getBoundingClientRect();
  var mouse = new THREE.Vector2(
    ((t.clientX - rect.left) / rect.width) * 2 - 1,
    -((t.clientY - rect.top) / rect.height) * 2 + 1,
  );
  var raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  var hits = [];
  organGroups.forEach(function (g) {
    hits.push.apply(hits, raycaster.intersectObject(g.mesh, false));
  });
  hits.sort(function (a, b) { return a.distance - b.distance; });
  selectedId = null;
  if (hits.length) {
    var pt = hits[0].point;
    var best = null, bestD = 1e9;
    for (var i = 0; i < sim.organisms.length; i++) {
      var o = sim.organisms[i];
      var d = Math.hypot(o.x - pt.x, o.y - pt.z);
      if (d < bestD) { bestD = d; best = o; }
    }
    selectedId = best ? best.id : null;
  }
  updateInspector();
}, { passive: false });
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
    else if (p.kind === "cylinder")
      geo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, false);
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
      for (let i = 0; i < nv; i += 3)
        indices.push(base + i, base + i + 1, base + i + 2);
    }
    vi += nv;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geo.setAttribute(
    "normal",
    new THREE.Float32BufferAttribute(normals, 3),
  );
  geo.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(colors, 3),
  );
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
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.6,
    metalness: 0.1,
  });
  const mesh = new THREE.InstancedMesh(geometry, mat, 8192);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  g = {
    key,
    mesh,
    parts,
    mat,
    matrices: [],
    colors: [],
    count: 0,
    dummy: new THREE.Object3D(),
  };
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

    const rc = ROLE_COLORS[org.role] ?? 0xffffff;
    let base = new THREE.Color(rc);
    if (org.colonyId !== null) {
      const ch = colonyColor(org.colonyId);
      base.lerp(ch, 0.4);
    }
    g.colors[idx] = [base.r, base.g, base.b];
  }

  const orgById = new Map();
  for (const o of state.organisms) orgById.set(o.id, o);
  const MAX_BONDS = 2048;
  let bondCount = 0;
  for (const c of sim.colonies.values()) {
    if (c.dead || c.memberIds.length === 0) continue;
    const cx = c.x,
      cy = c.y;
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
    if (g.count === 0) {
      g.mesh.count = 0;
      return;
    }
    g.mesh.count = g.count;
    for (let i = 0; i < g.count; i++) {
      g.mesh.setMatrixAt(
        i,
        new THREE.Matrix4().fromArray(g.matrices[i]),
      );
    }
    if (!g.mesh.instanceColor || g.mesh.instanceColor.count < g.count) {
      g.mesh.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(g.count * 3),
        3,
      );
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
    foodMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(Math.max(foodInstances.length, 1) * 3),
      3,
    );
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
    bondLines.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(new Float32Array(needed), 3),
    );
  }
  const arr = bondLines.geometry.attributes.position.array;
  for (let i = 0; i < needed; i++) arr[i] = bondPos[i];
  bondLines.geometry.setDrawRange(0, needed);
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

  els.sysTick.textContent = st.tick.toLocaleString();
}

function updateInspector() {
  if (!sim) return;
  const org = sim.organisms.find((o) => o.id === selectedId);
  if (!org) {
    els.inspectContent.innerHTML =
      '<div style="padding:14px 10px;color:#647084;font-size:11px;font-style:italic;">Tap an organism in the world to inspect its DNA, genes, and colony membership.</div>';
    return;
  }
  const t = org.genome.traits;
  const morpho = dnaToMorphotype(org.genome.dna);
  const colony =
    org.colonyId !== null ? sim.colonies.get(org.colonyId) : null;
  const rows = [
    ["Role", org.role],
    ["DNA", dnaString(org.genome.dna)],
    ["Energy", org.energy.toFixed(1)],
    ["Age", org.age],
    ["Generation", org.generation],
    ["Size", t.size.toFixed(2)],
    ["Strength", t.strength.toFixed(2)],
    ["Aggression", t.aggression.toFixed(2)],
    ["Altruism", t.altruism.toFixed(2)],
    ["Biolum.", t.bioluminescence.toFixed(2)],
    ["Mutation", t.evolvableMutationRate.toFixed(4)],
    [
      "Body plan",
      `${morpho.bodyPlan} · ${morpho.segmentCount} seg · ${morpho.limbPairs} limbs`,
    ],
    ["Colony", colony ? colony.id.toString() : "— (unicellular)"],
  ];
  let html = "";
  for (const [k, v] of rows) {
    html += `<div class="inspect-row"><span class="k">${k}</span><span class="v">${v}</span></div>`;
  }
  els.inspectContent.innerHTML = html;
}

function drawInspector() {
  updateInspector();
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
    let best = null,
      bestD = 1e9;
    for (const o of sim.organisms) {
      const d = Math.hypot(o.x - pt.x, o.y - pt.z);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    selectedId = best ? best.id : null;
  }
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
        els.sysState.style.color = running ? "#39ff14" : "#ff8c8c";
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
      if (els.panelInspect)
        els.panelInspect.classList.toggle("open", inspectOpen);
      if (els.panelAnalytics)
        els.panelAnalytics.classList.toggle("open", false);
      if (els.chipInspect)
        els.chipInspect.classList.toggle("active", inspectOpen);
      if (els.chipAnalytics)
        els.chipAnalytics.classList.toggle("active", false);
    });
  }
  if (els.chipAnalytics) {
    els.chipAnalytics.addEventListener("click", () => {
      analyticsOpen = !analyticsOpen;
      inspectOpen = false;
      if (els.panelAnalytics)
        els.panelAnalytics.classList.toggle("open", analyticsOpen);
      if (els.panelInspect)
        els.panelInspect.classList.toggle("open", false);
      if (els.chipAnalytics)
        els.chipAnalytics.classList.toggle("active", analyticsOpen);
      if (els.chipInspect)
        els.chipInspect.classList.toggle("active", false);
    });
  }

  // Experiment chip
  if (els.chipExperiment) {
    els.chipExperiment.addEventListener("click", async () => {
      const names = getExperimentNames();
      const name = prompt("Experiment:\n" + names.join("\n"));
      if (!name) return;
      try {
        const result = runExperiment(name);
        alert(
          `${result.name}\nTicks: ${result.ticks}\nPop: ${result.initialStats.population} → ${result.finalStats.population}\nBirths: ${result.finalStats.totalBirths} Deaths: ${result.finalStats.totalDeaths} Colonies: ${result.finalStats.colonyCount}`,
        );
      } catch (e) {
        showError(
          "Experiment error: " + (e && e.message ? e.message : String(e)),
        );
      }
    });
  }

  // Save chip
  if (els.chipSave) {
    els.chipSave.addEventListener("click", () => {
      if (!sim) return;
      const json = saveToJSON(sim);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `species-save-${CFG.seed}-t${sim.currentTick}.json`;
      a.click();
      URL.revokeObjectURL(url);
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
            if (els.world)
              els.world.value = `${sim.simConfig.width}x${sim.simConfig.height}`;
            if (els.sysState) {
              els.sysState.textContent = "RUNNING";
              els.sysState.style.color = "#39ff14";
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

  window.__dsReady = true;

  last = performance.now();
  requestAnimationFrame((t) => {
    last = t;
    animate(t);
  });
}

main();
