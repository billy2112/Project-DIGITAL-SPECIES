import { Simulation } from "./simulation.js";
import { World } from "./world.js";

const CLEAR = "\x1b[2J";
const HOME = "\x1b[H";
const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";

function pad(n: number, w: number): string {
  return n.toString().padStart(w, " ");
}

function fmt(n: number): string {
  return n.toFixed(2);
}

export function runCLI(
  seed: number,
  ticks: number,
  width: number,
  height: number,
  population: number,
  live: boolean,
): void {
  const sim = new Simulation({
    seed,
    width,
    height,
    initialPopulation: population,
    initialEnergy: 60,
    maxTicks: ticks,
  });

  process.stdout.write(HIDE + CLEAR);
  let done = false;

  const render = (): void => {
    const s = sim.stats();
    const snap = sim.getState();
    const orgs = snap.organisms;
    const food = snap.snapshot.food;
    const pher = snap.snapshot.pheromone;

    // Build occupancy grid
    const grid: string[] = [];
    const W = sim.world.width;
    const H = sim.world.height;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        grid.push(" ");
      }
    }
    const occ = new Map<string, { e: number }>();
    for (const o of orgs) {
      const key = `${Math.floor(o.x)},${Math.floor(o.y)}`;
      const prev = occ.get(key);
      if (!prev || o.energy > prev.e) occ.set(key, { e: o.energy });
    }
    for (const [key, v] of occ) {
      const [sx, sy] = key.split(",").map(Number);
      const i = sy * W + sx;
      let ch = "o";
      if (v.e < 20) ch = ".";
      else if (v.e < 50) ch = ":";
      else if (v.e < 100) ch = "O";
      else ch = "@";
      grid[i] = ch;
    }
    for (let i = 0; i < W * H; i++) {
      if (grid[i] !== " ") continue;
      const f = food[i];
      const p = pher[i];
      if (f > 50) grid[i] = GREEN + "*" + RESET;
      else if (f > 10) grid[i] = GREEN + "." + RESET;
      else if (f > 1) grid[i] = DIM + "," + RESET;
      else if (p > 0.5) grid[i] = YELLOW + "~" + RESET;
      else if (p > 0.1) grid[i] = DIM + "." + RESET;
    }

    let out = HOME;
    out += BOLD + "Project DIGITAL SPECIES — Artificial Life Simulator" + RESET + "\n";
    out += `tick: ${pad(s.tick, 6)}  pop: ${pad(s.population, 5)}  births: ${pad(
      s.totalBirths,
      6,
    )}  deaths: ${pad(s.totalDeaths, 6)}  species: ${pad(s.speciesCount, 4)}\n`;
    out += `avgEnergy: ${fmt(s.avgEnergy)}  avgAge: ${fmt(s.avgAge)}  totalEnergy: ${fmt(
      s.totalEnergy,
    )}\n`;
    out += DIM + "Legend: , . * = food (low..high)  . : O @ = organism (weak..strong)  ~ = pheromone" + RESET + "\n";
    out += DIM + "Press Ctrl+C to stop" + RESET + "\n\n";

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        out += grid[y * W + x];
      }
      out += "\n";
    }
    process.stdout.write(out);
  };

  const tickOnce = (): boolean => {
    const events = sim.step();
    for (const ev of events) {}
    return sim.organisms.length > 0;
  };

  if (live) {
    const interval = setInterval(() => {
      render();
      const alive = tickOnce();
      if (!alive || sim.currentTick >= sim.simConfig.maxTicks) {
        clearInterval(interval);
        render();
        process.stdout.write(SHOW + "\nSimulation ended.\n");
        process.exit(0);
      }
    }, 60);
    process.on("SIGINT", () => {
      clearInterval(interval);
      render();
      process.stdout.write(SHOW + "\nStopped.\n");
      process.exit(0);
    });
  } else {
    const stats = sim.run(ticks);
    render();
    process.stdout.write(SHOW + "\n");
    console.log(JSON.stringify(stats, null, 2));
  }
}
