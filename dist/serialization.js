import { Simulation } from "./simulation.js";
import { Organism } from "./organism.js";
import { Colony } from "./colony.js";
import { World } from "./world.js";
import { RNG } from "./rng.js";

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

export function saveToJSON(sim) {
  return JSON.stringify(serializeSimulation(sim), null, 2);
}

export function loadFromJSON(json) {
  return deserializeSimulation(JSON.parse(json));
}

export function saveToString(sim) {
  return saveToJSON(sim);
}
