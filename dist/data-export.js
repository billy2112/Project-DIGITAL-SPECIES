export const SAVE_VERSION = 1;

export function serializeSimulation(sim) {
  return {
    version: SAVE_VERSION,
    state: sim.captureState(),
  };
}

export function deserializeSimulation(data) {
  if (data.version !== SAVE_VERSION) {
    throw new Error("Unsupported save version: " + data.version);
  }
  const sim = new (require("./simulation.js").Simulation)({
    seed: data.state.config.seed,
    width: data.state.config.width,
    height: data.state.config.height,
    initialPopulation: 0,
    initialEnergy: data.state.config.initialEnergy,
    foodRegenRate: data.state.config.foodRegenRate,
    foodMaxPerCell: data.state.config.foodMaxPerCell,
    foodSpawnChance: data.state.config.foodSpawnChance,
    pheromoneDecay: data.state.config.pheromoneDecay,
    maxTicks: data.state.config.maxTicks,
    dayLength: data.state.config.dayLength,
  });
  sim.restoreState(data.state);
  return sim;
}

export function saveToJSON(sim) {
  return JSON.stringify(serializeSimulation(sim), null, 2);
}

export function loadFromJSON(json) {
  return deserializeSimulation(JSON.parse(json));
}

export function saveToString(sim) {
  return saveToJSON(sim);
}

export function downloadBlob(content, filename, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadOrganismsCsv(sim, tick) {
  downloadBlob(exportOrganismsCsv(sim, tick), `organisms_t${tick}.csv`, "text/csv");
}

export function downloadSimulationJson(sim, metadata) {
  const meta = {
    seed: sim.simConfig.seed,
    config: sim.simConfig,
    start_tick: 0,
    end_tick: sim.currentTick,
    duration_ticks: sim.currentTick,
    software_version: "1.0.0",
    ...metadata,
  };
  downloadBlob(exportSimulationJson(sim, meta), `simulation_t${sim.currentTick}.json`, "application/json");
}

export function exportOrganismsCsv(sim, tick) {
  const alive = sim.organisms.filter((o) => !o.dead);
  const keys = ["tick", "id", "generation", "age", "energy", "x", "y", "colony_id", "role",
    "dead", "parent_id", "genome_hash", "size", "strength", "aggression",
    "altruism", "cooperation", "bioluminescence", "mutation_rate", "learning_rate",
    "memory_capacity", "vision_range", "speed", "base_maintenance", "dna",
    "weights_mean", "weights_std"];
  let out = keys.join(",") + "\n";
  for (const o of alive) {
    const g = o.genome;
    const w = Array.from(g.weights);
    let dna = "";
    for (let i = 0; i < g.dna.length; i++) dna += "ACGT"[g.dna[i]];
    const row = [
      tick, o.id, o.generation, o.age, o.energy, o.x, o.y,
      o.colonyId ?? "", o.role, o.dead ? 1 : 0, o.parentId ?? "",
      genomeHash(g),
      g.traits.size, g.traits.strength, g.traits.aggression,
      g.traits.altruism, g.traits.cooperation, g.traits.bioluminescence,
      g.traits.evolvableMutationRate, g.traits.evolvableLearningRate,
      g.traits.memoryCapacity, g.traits.visionRange, g.traits.speed,
      g.traits.baseMaintenance, dna,
      mean(w), stdDev(w),
    ];
    out += row.map(escapeCsv).join(",") + "\n";
  }
  return out;
}

export function exportSimulationJson(sim, metadata) {
  const state = sim.captureState();
  const archive = {
    version: "1.0.0",
    metadata: {
      software: "Project DIGITAL SPECIES",
      software_version: "1.0.0",
      ...metadata,
    },
    config: state.config,
    rng_state: state.rngState,
    tick: state.tick,
    next_id: state.nextId,
    next_colony_id: state.nextColonyId,
    totals: state.totals,
    world: state.world,
    organisms: state.organisms.map((o) => ({
      id: o.id,
      x: o.x,
      y: o.y,
      energy: o.energy,
      age: o.age,
      generation: o.generation,
      dead: o.dead,
      parent_id: o.parentId,
      colony_id: o.colonyId,
      role: o.role,
      genome: {
        weights: Array.from(o.genome.weights),
        traits: o.genome.traits,
        dna: Array.from(o.genome.dna),
        dna_version: o.genome.dnaVersion,
      },
      memory: Array.from(o.memory),
    })),
    colonies: state.colonies.map((c) => ({
      id: c.id,
      member_ids: c.memberIds,
      x: c.x,
      y: c.y,
      energy: c.energy,
      age: c.age,
      generation: c.generation,
      dead: c.dead,
      role_assignment: Object.fromEntries(c.roleAssignment),
    })),
    events: state.events,
  };
  return JSON.stringify(archive, null, 2);
}

function genomeHash(g) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < g.weights.length; i++) {
    const b = new Float32Array([g.weights[i]]);
    const dv = new DataView(b.buffer);
    h ^= dv.getUint32(0, true);
    h = (h * 167777619) >>> 0;
  }
  return "0x" + h.toString(16).padStart(8, "0");
}

function mean(arr) {
  if (arr.length === 0) return 0;
  let s = 0;
  for (const v of arr) s += v;
  return s / arr.length;
}

function stdDev(arr) {
  if (arr.length === 0) return 0;
  const m = mean(arr);
  let s = 0;
  for (const v of arr) s += (v - m) * (v - m);
  return Math.sqrt(s / arr.length);
}

function escapeCsv(v) {
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
