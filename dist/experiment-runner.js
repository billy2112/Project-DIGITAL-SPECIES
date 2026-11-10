import { Simulation } from "./simulation.js";
import { mean, stdDev } from "./data-export.js";
import { downloadBlob } from "./data-export.js";

// ============================================================================
// EXPERIMENT PRESETS
// Scientific experiments researchers can run to test hypotheses
// ============================================================================

export const EXPERIMENTS = {
  "resource-scarcity": {
    name: "Resource Scarcity",
    description:
      "Limited food drives intense competition. Organisms evolve efficient metabolisms and foraging strategies under pressure.",
    simConfig: {
      seed: 42,
      width: 60,
      height: 60,
      initialPopulation: 200,
      initialEnergy: 40,
      foodRegenRate: 0.02,
      foodMaxPerCell: 50,
      foodSpawnChance: 0.01,
      pheromoneDecay: 0.02,
      maxTicks: 1000,
      dayLength: 500,
      nutrientDecay: 0.02,
      nutrientRegenBoost: 0.3,
      temperatureMin: 18,
      temperatureMax: 26,
      lightCycleLength: 500,
    },
    tickLimit: 1000,
  },
  "predator-prey": {
    name: "Predator-Prey Coevolution",
    description:
      "High aggression and strength select for predation. Prey evolve speed, vigilance, and defensive traits.",
    simConfig: {
      seed: 7,
      width: 80,
      height: 80,
      initialPopulation: 300,
      initialEnergy: 80,
      foodRegenRate: 0.05,
      foodMaxPerCell: 100,
      foodSpawnChance: 0.03,
      pheromoneDecay: 0.02,
      maxTicks: 1500,
      dayLength: 750,
      nutrientDecay: 0.01,
      nutrientRegenBoost: 0.5,
      temperatureMin: 15,
      temperatureMax: 30,
      lightCycleLength: 750,
    },
    tickLimit: 1500,
  },
  "multicellularity": {
    name: "Emergence of Multicellularity",
    description:
      "High adhesion and cooperation select for colony formation. Cells differentiate into roles and colonies reproduce by budding.",
    simConfig: {
      seed: 11,
      width: 100,
      height: 100,
      initialPopulation: 150,
      initialEnergy: 100,
      foodRegenRate: 0.08,
      foodMaxPerCell: 120,
      foodSpawnChance: 0.04,
      pheromoneDecay: 0.015,
      maxTicks: 2000,
      dayLength: 1000,
      nutrientDecay: 0.01,
      nutrientRegenBoost: 0.8,
      temperatureMin: 20,
      temperatureMax: 25,
      lightCycleLength: 1000,
    },
    tickLimit: 2000,
  },
  "cooperation": {
    name: "Evolution of Cooperation",
    description:
      "Group selection and altruism evolve when cooperation benefits the colony more than individual selfishness.",
    simConfig: {
      seed: 13,
      width: 80,
      height: 80,
      initialPopulation: 200,
      initialEnergy: 90,
      foodRegenRate: 0.06,
      foodMaxPerCell: 100,
      foodSpawnChance: 0.03,
      pheromoneDecay: 0.02,
      maxTicks: 1500,
      dayLength: 750,
      nutrientDecay: 0.01,
      nutrientRegenBoost: 0.6,
      temperatureMin: 18,
      temperatureMax: 24,
      lightCycleLength: 750,
    },
    tickLimit: 1500,
  },
  "mutation-rate": {
    name: "Evolution of Evolvability",
    description:
      "Mutation rate itself is an evolvable trait. Lineages that tune their mutation rate to environmental volatility outcompete static ones.",
    simConfig: {
      seed: 17,
      width: 60,
      height: 60,
      initialPopulation: 250,
      initialEnergy: 70,
      foodRegenRate: 0.04,
      foodMaxPerCell: 80,
      foodSpawnChance: 0.025,
      pheromoneDecay: 0.02,
      maxTicks: 1200,
      dayLength: 600,
      nutrientDecay: 0.015,
      nutrientRegenBoost: 0.4,
      temperatureMin: 10,
      temperatureMax: 35,
      lightCycleLength: 600,
    },
    tickLimit: 1200,
  },
  "adaptation": {
    name: "Environmental Adaptation",
    description:
      "Strong temperature gradients select for organisms that tolerate or avoid extreme conditions.",
    simConfig: {
      seed: 23,
      width: 100,
      height: 60,
      initialPopulation: 200,
      initialEnergy: 70,
      foodRegenRate: 0.05,
      foodMaxPerCell: 100,
      foodSpawnChance: 0.03,
      pheromoneDecay: 0.02,
      maxTicks: 1500,
      dayLength: 500,
      nutrientDecay: 0.01,
      nutrientRegenBoost: 0.5,
      temperatureMin: 5,
      temperatureMax: 40,
      lightCycleLength: 500,
    },
    tickLimit: 1500,
  },
};

export function getExperimentNames() {
  return Object.keys(EXPERIMENTS);
}

export function getExperiment(name) {
  return EXPERIMENTS[name];
}

// ============================================================================
// EXPERIMENT RUNNER
// Parameter sweeps × replicates with statistical summary
// ============================================================================

/** Cartesian product of parameter grid values */
function cartesianProduct(grid) {
  const keys = Object.keys(grid);
  if (keys.length === 0) return [{}];
  const firstKey = keys[0];
  const rest = Object.fromEntries(keys.slice(1).map((k) => [k, grid[k]]));
  const restProducts = cartesianProduct(rest);
  const result = [];
  for (const v of grid[firstKey]) {
    for (const rp of restProducts) {
      result.push({ [firstKey]: v, ...rp });
    }
  }
  return result;
}

/** Run a single replicate of an experiment */
function runReplicate(baseConfig, paramSet, seed, tickLimit) {
  const mergedConfig = { ...baseConfig, ...paramSet, seed };
  const sim = new Simulation(mergedConfig);
  const timeSeries = [];
  for (let i = 0; i < tickLimit; i++) {
    sim.step();
    timeSeries.push(sim.stats());
    if (sim.organisms.length === 0 && sim.captureState().colonies.length === 0) {
      break;
    }
  }
  return {
    replicate: 0, // set by caller
    paramSet,
    seed,
    finalStats: sim.stats(),
    timeSeries,
  };
}

/** Run a full experiment: parameter grid × replicates */
export function runExperiment(config) {
  const paramSets = cartesianProduct(config.parameterGrid);
  const runs = [];
  let replicateIndex = 0;
  for (const paramSet of paramSets) {
    for (let r = 0; r < config.replicates; r++) {
      const seed = config.baseConfig.seed + 1000 * replicateIndex + r;
      const result = runReplicate(config.baseConfig, paramSet, seed, config.tickLimit);
      result.replicate = replicateIndex;
      runs.push(result);
      replicateIndex++;
    }
  }
  const numericFields = [
    "population", "colonyCount", "totalBirths", "totalDeaths",
    "totalApoptosis", "totalKills", "totalColonyBuds", "totalColonyDeaths",
    "avgEnergy", "avgAge", "avgSize", "avgStrength", "avgAggression",
    "avgAltruism", "avgCooperation", "avgMutationRate", "speciesCount",
  ];
  const summary = {};
  for (const field of numericFields) {
    const values = runs.map((r) => r.finalStats[field]);
    summary[field] = {
      mean: mean(values),
      std: stdDev(values),
      min: Math.min(...values),
      max: Math.max(...values),
      values,
    };
  }
  return {
    name: config.name,
    config,
    runs,
    summary,
    completedAt: new Date().toISOString(),
  };
}

export function experimentResultToCsv(result) {
  const keys = [
    "population", "colonyCount", "totalBirths", "totalDeaths",
    "totalApoptosis", "totalKills", "totalColonyBuds", "totalColonyDeaths",
    "avgEnergy", "avgAge", "avgSize", "avgStrength", "avgAggression",
    "avgAltruism", "avgCooperation", "avgMutationRate", "speciesCount",
  ];
  let out = "statistic,mean,std,min,max\n";
  for (const k of keys) {
    const s = result.summary[k];
    if (s) {
      out += [k, s.mean.toFixed(4), s.std.toFixed(4), s.min.toFixed(4), s.max.toFixed(4)].join(",") + "\n";
    }
  }
  return out;
}

export function downloadExperimentCsv(result) {
  downloadBlob(experimentResultToCsv(result), `experiment_${result.name}_summary.csv`, "text/csv");
}

export function downloadExperimentJson(result) {
  downloadBlob(JSON.stringify(result, null, 2), `experiment_${result.name}.json`, "application/json");
}
