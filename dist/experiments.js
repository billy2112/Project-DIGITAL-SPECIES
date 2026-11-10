import { Simulation } from "./simulation.js";
export const EXPERIMENTS = {
    "resource-scarcity": {
        name: "Resource Scarcity",
        description: "Limited food drives intense competition. Organisms evolve efficient metabolisms and foraging strategies under pressure.",
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
        description: "High aggression and strength select for predation. Prey evolve speed, vigilance, and defensive traits.",
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
        organismOverrides: (org, rng) => {
            // Bias initial population toward higher aggression/strength
            org.genome.traits.aggression = Math.max(org.genome.traits.aggression, rng.range(0.3, 0.7));
            org.genome.traits.strength = Math.max(org.genome.traits.strength, rng.range(0.2, 0.6));
        },
    },
    "multicellularity": {
        name: "Emergence of Multicellularity",
        description: "High adhesion and cooperation select for colony formation. Cells differentiate into roles and colonies reproduce by budding.",
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
        organismOverrides: (org, rng) => {
            org.genome.traits.adhesion = Math.max(org.genome.traits.adhesion, rng.range(0.6, 0.9));
            org.genome.traits.cooperation = Math.max(org.genome.traits.cooperation, rng.range(0.5, 0.8));
        },
    },
    "cooperation": {
        name: "Evolution of Cooperation",
        description: "Group selection and altruism evolve when cooperation benefits the colony more than individual selfishness.",
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
        organismOverrides: (org, rng) => {
            org.genome.traits.altruism = Math.max(org.genome.traits.altruism, rng.range(0.4, 0.8));
            org.genome.traits.groupSelectionWeight = Math.max(org.genome.traits.groupSelectionWeight, rng.range(0.3, 0.7));
        },
    },
    "mutation-rate": {
        name: "Evolution of Evolvability",
        description: "Mutation rate itself is an evolvable trait. Lineages that tune their mutation rate to environmental volatility outcompete static ones.",
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
        description: "Strong temperature gradients select for organisms that can tolerate or avoid extreme conditions.",
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
export function runExperiment(name, onEvent) {
    const config = EXPERIMENTS[name];
    if (!config) {
        throw new Error(`Unknown experiment: ${name}`);
    }
    const sim = new Simulation(config.simConfig);
    // Apply organism overrides if specified
    if (config.organismOverrides) {
        for (const org of sim.organisms) {
            config.organismOverrides(org, sim.rng);
        }
    }
    const initialStats = sim.stats();
    const events = [];
    let ticksRun = 0;
    for (let i = 0; i < config.tickLimit; i++) {
        const stepEvents = sim.step();
        ticksRun = i + 1;
        for (const ev of stepEvents) {
            events.push({
                tick: ev.tick,
                type: ev.type,
                organismId: ev.organismId,
                ...(ev.colonyId !== undefined ? { colonyId: ev.colonyId } : {}),
                ...(ev.parentId !== undefined ? { parentId: ev.parentId } : {}),
                ...(ev.otherParentId !== undefined ? { otherParentId: ev.otherParentId } : {}),
                ...(ev.sexual !== undefined ? { sexual: ev.sexual } : {}),
                ...(ev.x !== undefined ? { x: ev.x } : {}),
                ...(ev.y !== undefined ? { y: ev.y } : {}),
                ...(ev.energyGained !== undefined ? { energyGained: ev.energyGained } : {}),
                ...(ev.cellCount !== undefined ? { cellCount: ev.cellCount } : {}),
            });
            onEvent?.(ev.tick, ev);
        }
        if (sim.organisms.length === 0 && sim.colonies.size === 0) {
            break;
        }
    }
    const finalStats = sim.stats();
    const saveData = JSON.stringify(sim.captureState(), null, 2);
    return {
        name,
        seed: config.simConfig.seed,
        ticks: ticksRun,
        initialStats,
        finalStats,
        events,
        saveData,
    };
}
export function compareExperiments(nameA, nameB) {
    const resultA = runExperiment(nameA);
    const resultB = runExperiment(nameB);
    const keys = [
        "population",
        "colonyCount",
        "totalBirths",
        "totalDeaths",
        "totalKills",
        "totalColonyBuds",
        "totalApoptosis",
        "avgEnergy",
        "avgSize",
        "avgStrength",
        "avgAggression",
        "avgAltruism",
        "avgCooperation",
        "avgMutationRate",
        "speciesCount",
    ];
    const comparison = {};
    for (const key of keys) {
        const a = resultA.finalStats[key];
        const b = resultB.finalStats[key];
        if (typeof a === "number" && typeof b === "number") {
            comparison[key] = { a, b, diff: b - a };
        }
    }
    return { resultA, resultB, comparison };
}
