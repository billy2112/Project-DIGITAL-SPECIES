import { Simulation } from "./simulation.js";
import { Organism } from "./organism.js";
import { Colony } from "./colony.js";
import { World } from "./world.js";
import { RNG } from "./rng.js";
import { SimEvent } from "./simulation.js";

export const SAVE_VERSION = 1;

export interface SimSaveData {
  version: number;
  state: ReturnType<Simulation["captureState"]>;
}

export function serializeSimulation(sim: Simulation): SimSaveData {
  return {
    version: SAVE_VERSION,
    state: sim.captureState(),
  };
}

export function deserializeSimulation(data: SimSaveData): Simulation {
  if (data.version !== SAVE_VERSION) {
    throw new Error(`Unsupported save version: ${data.version}`);
  }
  const sim = new Simulation({
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

export function saveToJSON(sim: Simulation): string {
  return JSON.stringify(serializeSimulation(sim), null, 2);
}

export function loadFromJSON(json: string): Simulation {
  return deserializeSimulation(JSON.parse(json));
}

export function saveToString(sim: Simulation): string {
  return saveToJSON(sim);
}
