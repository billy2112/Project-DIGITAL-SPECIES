import { Simulation } from './dist/simulation.js';

const canvas = document.getElementById('sim');
const ctx = canvas.getContext('2d', { alpha: false });

// DOM
const els = {
  play: document.getElementById('btn-play'),
  reset: document.getElementById('btn-reset'),
  seed: document.getElementById('inp-seed'),
  pop: document.getElementById('inp-pop'),
  world: document.getElementById('inp-world'),
  speed: document.getElementById('inp-speed'),
  tick: document.getElementById('stat-tick'),
  popStat: document.getElementById('stat-pop'),
  births: document.getElementById('stat-births'),
  deaths: document.getElementById('stat-deaths'),
  species: document.getElementById('stat-species'),
  energy: document.getElementById('stat-energy'),
  selId: document.getElementById('sel-id'),
  selEnergy: document.getElementById('sel-energy'),
  selAge: document.getElementById('sel-age'),
  selSpeed: document.getElementById('sel-speed'),
  selVision: document.getElementById('sel-vision'),
  selRepro: document.getElementById('sel-repro'),
  selMutation: document.getElementById('sel-mutation'),
  selMaintenance: document.getElementById('sel-maintenance'),
  selMemory: document.getElementById('sel-memory'),
  inspector: document.getElementById('inspector'),
  paused: document.getElementById('overlay-paused'),
};

let W = 80, H = 60;
let sim = null;
let running = true;
let selectedId = null;
let last = performance.now();
let acc = 0;
let msPerTick = 40;
const MAX_STEPS = 6;

const CFG_DEFAULTS = {
  seed: Date.now(),
  pop: 400,
  worldW: 80,
  worldH: 60,
};

let CFG = { ...CFG_DEFAULTS };

function hashColor(id) {
  let h = 2166136261 >>> 0;
  const s = String(id);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return `hsl(${h % 360}, 75%, 55%)`;
}

function resize() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  const tw = Math.max(1, Math.floor(rect.width * dpr));
  const th = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== tw || canvas.height !== th) {
    canvas.width = tw;
    canvas.height = th;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
  W = sim.world.width;
  H = sim.world.height;
  selectedId = null;
  updateInspector(null);
}

function worldFromPointer(clientX, clientY) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / W / dpr;
  const scaleY = canvas.height / H / dpr;
  const scale = Math.min(scaleX, scaleY);
  const ox = (rect.width - W * scale) / 2;
  const oy = (rect.height - H * scale) / 2;
  const wx = (clientX - rect.left - ox) / scale;
  const wy = (clientY - rect.top - oy) / scale;
  return { wx, wy, scale, ox, oy };
}

function pickOrganism(clientX, clientY) {
  if (!sim) return null;
  const { wx, wy, scale } = worldFromPointer(clientX, clientY);
  const selectRadius = 1.6; // world units
  let best = null;
  let bestD = selectRadius;
  for (const o of sim.organisms) {
    const d = Math.hypot(o.x - wx, o.y - wy);
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

function updateInspector(org) {
  els.inspector.classList.toggle('empty', !org);
  if (!org) {
    els.selId.textContent = '—';
    els.selEnergy.textContent = '—';
    els.selAge.textContent = '—';
    els.selSpeed.textContent = '—';
    els.selVision.textContent = '—';
    els.selRepro.textContent = '—';
    els.selMutation.textContent = '—';
    els.selMaintenance.textContent = '—';
    els.selMemory.textContent = '—';
    return;
  }
  const t = org.genome.traits;
  els.selId.textContent = org.id;
  els.selEnergy.textContent = org.energy.toFixed(1);
  els.selAge.textContent = `${org.age} / ${t.maxAge}`;
  els.selSpeed.textContent = t.speed.toFixed(2);
  els.selVision.textContent = t.visionRange.toFixed(1);
  els.selRepro.textContent = t.reproductionThreshold.toFixed(0);
  els.selMutation.textContent = (t.mutationRate * 100).toFixed(1) + '%';
  els.selMaintenance.textContent = t.baseMaintenance.toFixed(3);
  els.selMemory.textContent = t.memoryCapacity;
}

function draw() {
  if (!sim) return;
  const state = sim.getState();
  const snap = state.snapshot;
  const food = snap.food;
  const pher = snap.pheromone;

  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const cssW = canvas.width / dpr;
  const cssH = canvas.height / dpr;
  const scaleX = cssW / W;
  const scaleY = cssH / H;
  const scale = Math.min(scaleX, scaleY);
  const ox = (cssW - W * scale) / 2;
  const oy = (cssH - H * scale) / 2;

  ctx.clearRect(0, 0, cssW, cssH);

  // food
  for (let i = 0; i < food.length; i++) {
    const f = food[i];
    if (f <= 0) continue;
    const y = (i / W) | 0;
    const x = i % W;
    const g = Math.min(1, f / 100);
    ctx.fillStyle = `rgba(70, 200, 90, ${0.3 + 0.7 * g})`;
    ctx.fillRect(ox + x * scale, oy + y * scale, Math.max(1, scale * 0.92), Math.max(1, scale * 0.92));
  }

  // pheromones
  for (let i = 0; i < pher.length; i++) {
    const p = pher[i];
    if (p <= 0.05) continue;
    const y = (i / W) | 0;
    const x = i % W;
    ctx.fillStyle = `rgba(240, 210, 80, ${Math.min(0.35, p * 0.4)})`;
    ctx.fillRect(ox + x * scale, oy + y * scale, Math.max(1, scale), Math.max(1, scale));
  }

  // organisms
  for (const o of state.organisms) {
    const e = Math.max(0, Math.min(1, o.energy / 120));
    const r = Math.max(1, (1 + e * 3.5)) * scale;
    const selected = selectedId !== null && o.id === selectedId;
    ctx.fillStyle = hashColor(o.id);
    ctx.globalAlpha = selected ? 0.95 : (0.5 + 0.5 * e);
    ctx.beginPath();
    ctx.arc(ox + o.x * scale, oy + o.y * scale, r, 0, Math.PI * 2);
    ctx.fill();
    if (selected) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = (2 / dpr);
      ctx.beginPath();
      ctx.arc(ox + o.x * scale, oy + o.y * scale, r + (3 / dpr), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // stats
  const st = sim.stats();
  els.tick.textContent = st.tick.toLocaleString();
  els.popStat.textContent = st.population.toLocaleString();
  els.births.textContent = st.totalBirths.toLocaleString();
  els.deaths.textContent = st.totalDeaths.toLocaleString();
  els.species.textContent = st.speciesCount.toLocaleString();
  els.energy.textContent = st.avgEnergy.toFixed(1);
}

function loop(now) {
  let dt = now - last;
  last = now;
  if (dt > 200) dt = 200; // clamp after tab switch
  acc += dt;
  const cap = MAX_STEPS * msPerTick;
  if (acc > cap) acc = cap;
  let steps = running ? Math.floor(acc / msPerTick) : 0;
  if (steps > MAX_STEPS) steps = MAX_STEPS;
  for (let i = 0; i < steps; i++) sim.step();
  acc -= steps * msPerTick;
  draw();
  requestAnimationFrame(loop);
}

function bindUI() {
  els.play.addEventListener('click', () => {
    running = !running;
    els.play.textContent = running ? 'Pause' : 'Resume';
    els.paused.classList.toggle('hidden', running);
  });
  els.reset.addEventListener('click', () => {
    CFG.seed = parseInt(els.seed.value || Date.now(), 10) || Date.now();
    CFG.pop = parseInt(els.pop.value || 400, 10);
    createSim();
  });
  els.speed.addEventListener('input', (e) => {
    const v = parseInt(e.target.value || 50, 10);
    msPerTick = 120 - v * 1.1;
    if (msPerTick < 4) msPerTick = 4;
  });
  els.world.addEventListener('change', () => {
    const m = els.world.value.match(/^(\d+)\s*[xXx]\s*(\d+)$/);
    if (m) {
      CFG.worldW = Math.max(20, Math.min(200, parseInt(m[1], 10)));
      CFG.worldH = Math.max(20, Math.min(200, parseInt(m[2], 10)));
      createSim();
    }
  });
  window.addEventListener('resize', resize);

  canvas.addEventListener('pointerdown', (e) => {
    const org = pickOrganism(e.clientX, e.clientY);
    selectedId = org ? org.id : null;
    updateInspector(org);
  });
}

function init() {
  els.seed.value = CFG.seed;
  els.pop.value = CFG.pop;
  els.world.value = `${CFG.worldW}x${CFG.worldH}`;
  createSim();
  resize();
  bindUI();
  last = performance.now();
  requestAnimationFrame(loop);
}

init();
