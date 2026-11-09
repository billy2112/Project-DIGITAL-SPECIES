import { Simulation } from './dist/simulation.js';

const canvas = document.getElementById('sim');
const ctx = canvas.getContext('2d', { alpha: false });
const hud = {
  tick: document.getElementById('hud-tick'),
  pop: document.getElementById('hud-pop'),
  births: document.getElementById('hud-births'),
  deaths: document.getElementById('hud-deaths'),
  species: document.getElementById('hud-species'),
  energy: document.getElementById('hud-energy'),
};

let W = 80, H = 60;
let sim = null;
let running = true;
let last = performance.now();
let acc = 0;
let msPerTick = 35;
let cfg = {
  seed: Date.now(),
  pop: 400,
  worldW: 80,
  worldH: 60,
};

const btnPlay = document.getElementById('btn-play');
const btnReset = document.getElementById('btn-reset');
const inpSeed = document.getElementById('inp-seed');
const inpPop = document.getElementById('inp-pop');
const inpSpeed = document.getElementById('inp-speed');
const inpWorld = document.getElementById('inp-world');

function hashColor(id) {
  let h = 2166136261 >>> 0;
  const s = String(id);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  const hue = h % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

function resize() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  const targetW = Math.max(1, Math.floor(rect.width * dpr));
  const targetH = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
}

function createSim() {
  sim = new Simulation({
    seed: cfg.seed,
    width: cfg.worldW,
    height: cfg.worldH,
    initialPopulation: cfg.pop,
    initialEnergy: 60,
    foodRegenRate: 0.05,
    foodMaxPerCell: 100,
    foodSpawnChance: 0.03,
    pheromoneDecay: 0.02,
    maxTicks: 0,
  });
  W = sim.world.width;
  H = sim.world.height;
}

function draw() {
  const state = sim.getState();
  const snap = state.snapshot;
  const food = snap.food;
  const pher = snap.pheromone;
  const scaleX = canvas.width / W / (window.devicePixelRatio || 1);
  const scaleY = canvas.height / H / (window.devicePixelRatio || 1);
  const scale = Math.min(scaleX, scaleY);
  const ox = (canvas.width / (window.devicePixelRatio || 1) - W * scale) / 2;
  const oy = (canvas.height / (window.devicePixelRatio || 1) - H * scale) / 2;

  ctx.clearRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));

  // food
  for (let i = 0; i < food.length; i++) {
    const f = food[i];
    if (f <= 0) continue;
    const y = (i / W) | 0;
    const x = i % W;
    const g = Math.min(1, f / 100);
    ctx.fillStyle = `rgba(60, 180, 75, ${0.35 + 0.65 * g})`;
    ctx.fillRect(ox + x * scale, oy + y * scale, Math.max(1, scale * 0.9), Math.max(1, scale * 0.9));
  }

  // pheromones (subtle)
  for (let i = 0; i < pher.length; i++) {
    const p = pher[i];
    if (p <= 0.05) continue;
    const y = (i / W) | 0;
    const x = i % W;
    ctx.fillStyle = `rgba(230, 200, 60, ${Math.min(0.25, p * 0.3)})`;
    ctx.fillRect(ox + x * scale, oy + y * scale, Math.max(1, scale), Math.max(1, scale));
  }

  // organisms
  for (const o of state.organisms) {
    const e = Math.max(0, Math.min(1, o.energy / 120));
    const r = Math.max(1, 1 + e * 3) * scale;
    ctx.fillStyle = hashColor(o.id);
    ctx.globalAlpha = 0.55 + 0.45 * e;
    ctx.beginPath();
    ctx.arc(ox + o.x * scale, oy + o.y * scale, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  const st = sim.stats();
  hud.tick.textContent = st.tick;
  hud.pop.textContent = st.population;
  hud.births.textContent = st.totalBirths;
  hud.deaths.textContent = st.totalDeaths;
  hud.species.textContent = st.speciesCount;
  hud.energy.textContent = st.avgEnergy.toFixed(1);
}

function loop(now) {
  acc += now - last;
  last = now;
  const steps = running ? Math.floor(acc / msPerTick) : 0;
  for (let i = 0; i < steps; i++) sim.step();
  acc -= steps * msPerTick;
  draw();
  requestAnimationFrame(loop);
}

function bindUI() {
  btnPlay.addEventListener('click', () => {
    running = !running;
    btnPlay.textContent = running ? 'Pause' : 'Resume';
  });
  btnReset.addEventListener('click', () => {
    cfg.seed = parseInt(inpSeed.value || Date.now(), 10) || Date.now();
    cfg.pop = parseInt(inpPop.value || 400, 10);
    createSim();
  });
  inpSpeed.addEventListener('input', (e) => {
    msPerTick = 200 - parseInt(e.target.value || 50, 10);
    if (msPerTick < 1) msPerTick = 1;
  });
  inpWorld.addEventListener('change', () => {
    const v = inpWorld.value;
    const [w, h] = v.split('x').map(Number);
    if (w && h) {
      cfg.worldW = w;
      cfg.worldH = h;
      createSim();
    }
  });
  window.addEventListener('resize', resize);
}

function init() {
  inpSeed.value = cfg.seed;
  inpPop.value = cfg.pop;
  inpWorld.value = `${cfg.worldW}x${cfg.worldH}`;
  createSim();
  resize();
  bindUI();
  last = performance.now();
  requestAnimationFrame(loop);
}

init();
