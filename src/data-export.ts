import { Organism } from "./organism.js";
import { Colony } from "./colony.js";
import { Simulation } from "./simulation.js";
import { RNG } from "./rng.js";
import { genomeDistance } from "./genome.js";

// ============================================================================
// DATA EXPORT — CSV / JSON for scientific analysis
// ============================================================================

export interface OrganismRecord {
  tick: number;
  id: number;
  generation: number;
  age: number;
  energy: number;
  x: number;
  y: number;
  colony_id: number | null;
  role: string;
  dead: boolean;
  parent_id: number | null;
  genome_hash: string;
  size: number;
  strength: number;
  aggression: number;
  altruism: number;
  cooperation: number;
  bioluminescence: number;
  mutation_rate: number;
  learning_rate: number;
  memory_capacity: number;
  vision_range: number;
  speed: number;
  base_maintenance: number;
  dna: string;
  weights_mean: number;
  weights_std: number;
}

export interface ColonyRecord {
  tick: number;
  id: number;
  generation: number;
  age: number;
  energy: number;
  member_count: number;
  dead: boolean;
  role_free: number;
  role_gatherer: number;
  role_reproducer: number;
  role_defender: number;
  role_signal: number;
}

export interface PopulationSnapshot {
  tick: number;
  day: number;
  population: number;
  colony_count: number;
  total_births: number;
  total_deaths: number;
  total_apoptosis: number;
  total_kills: number;
  total_colony_buds: number;
  total_colony_deaths: number;
  avg_energy: number;
  avg_age: number;
  avg_size: number;
  avg_strength: number;
  avg_aggression: number;
  avg_altruism: number;
  avg_cooperation: number;
  avg_mutation_rate: number;
  species_count: number;
}

export interface ExperimentMetadata {
  seed: number;
  config: Record<string, any>;
  start_tick: number;
  end_tick: number;
  duration_ticks: number;
  software_version: string;
}

export function organismHash(g: any): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < g.weights.length; i++) {
    const b = new Float32Array([g.weights[i]]);
    const dv = new DataView(b.buffer);
    h ^= dv.getUint32(0, true);
    h = (h * 16777619) >>> 0;
  }
  return "0x" + h.toString(16).padStart(8, "0");
}

export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  let s = 0;
  for (const v of arr) s += v;
  return s / arr.length;
}

export function stdDev(arr: number[]): number {
  if (arr.length === 0) return 0;
  const m = mean(arr);
  let s = 0;
  for (const v of arr) s += (v - m) * (v - m);
  return Math.sqrt(s / arr.length);
}

export function escapeCsv(v: any): string {
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function csvHeader(keys: string[]): string {
  return keys.join(",");
}

export function csvRow(values: any[]): string {
  return values.map(escapeCsv).join(",");
}

/** Export all living organisms at current tick as CSV */
export function exportOrganismsCsv(sim: Simulation, tick: number): string {
  const alive = sim.organisms.filter((o) => !o.dead);
  const keys: (keyof OrganismRecord)[] = [
    "tick", "id", "generation", "age", "energy", "x", "y", "colony_id", "role",
    "dead", "parent_id", "genome_hash", "size", "strength", "aggression",
    "altruism", "cooperation", "bioluminescence", "mutation_rate", "learning_rate",
    "memory_capacity", "vision_range", "speed", "base_maintenance", "dna",
    "weights_mean", "weights_std",
  ];
  let out = csvHeader(keys) + "\n";
  for (const o of alive) {
    const g = o.genome;
    const w = Array.from(g.weights);
    const rec: OrganismRecord = {
      tick,
      id: o.id,
      generation: o.generation,
      age: o.age,
      energy: o.energy,
      x: o.x,
      y: o.y,
      colony_id: o.colonyId ?? null,
      role: o.role,
      dead: o.dead ? 1 : 0,
      parent_id: o.parentId ?? "",
      genome_hash: organismHash(g),
      size: g.traits.size,
      strength: g.traits.strength,
      aggression: g.traits.aggression,
      altruism: g.traits.altruism,
      cooperation: g.traits.cooperation,
      bioluminescence: g.traits.bioluminescence,
      mutation_rate: g.traits.evolvableMutationRate,
      learning_rate: g.traits.evolvableLearningRate,
      memory_capacity: g.traits.memoryCapacity,
      vision_range: g.traits.visionRange,
      speed: g.traits.speed,
      base_maintenance: g.traits.baseMaintenance,
      dna: "",
      weights_mean: mean(w),
      weights_std: stdDev(w),
    };
    // DNA string from Uint8Array
    let dna = "";
    for (let i = 0; i < g.dna.length; i++) dna += "ACGT"[g.dna[i]];
    rec.dna = dna;
    out += csvRow([
      rec.tick, rec.id, rec.generation, rec.age, rec.energy, rec.x, rec.y,
      rec.colony_id, rec.role, rec.dead, rec.parent_id, rec.genome_hash,
      rec.size, rec.strength, rec.aggression, rec.altruism, rec.cooperation,
      rec.bioluminescence, rec.mutation_rate, rec.learning_rate,
      rec.memory_capacity, rec.vision_range, rec.speed, rec.base_maintenance,
      rec.dna, rec.weights_mean, rec.weights_std,
    ]) + "\n";
  }
  return out;
}

/** Export population time-series snapshot as CSV */
export function exportPopulationCsv(snap: PopulationSnapshot): string {
  const keys: (keyof PopulationSnapshot)[] = [
    "tick", "day", "population", "colony_count", "total_births", "total_deaths",
    "total_apoptosis", "total_kills", "total_colony_buds", "total_colony_deaths",
    "avg_energy", "avg_age", "avg_size", "avg_strength", "avg_aggression",
    "avg_altruism", "avg_cooperation", "avg_mutation_rate", "species_count",
  ];
  let out = csvHeader(keys) + "\n";
  out += csvRow([
    snap.tick, snap.day, snap.population, snap.colony_count,
    snap.total_births, snap.total_deaths, snap.total_apoptosis, snap.total_kills,
    snap.total_colony_buds, snap.total_colony_deaths, snap.avg_energy,
    snap.avg_age, snap.avg_size, snap.strength, snap.aggression,
    snap.altruism, snap.cooperation, snap.avg_mutation_rate, snap.species_count,
  ]) + "\n";
  return out;
}

/** Export full simulation state as JSON (scientific archive format) */
export function exportSimulationJson(sim: Simulation, metadata?: Partial<ExperimentMetadata>): string {
  const state = sim.captureState();
  const archive: any = {
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

export function downloadBlob(content: string, filename: string, mime = "text/plain"): void {
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

/** Download organisms CSV */
export function downloadOrganismsCsv(sim: Simulation, tick: number): void {
  downloadBlob(exportOrganismsCsv(sim, tick), `organisms_t${tick}.csv`, "text/csv");
}

/** Download full simulation JSON archive */
export function downloadSimulationJson(sim: Simulation, metadata?: Partial<ExperimentMetadata>): void {
  const meta: ExperimentMetadata = {
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
