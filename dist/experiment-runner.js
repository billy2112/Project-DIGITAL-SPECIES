import { Simulation } from "./simulation.js";
import { mean, stdDev } from "./data-export.js";
/** Cartesian product of parameter grid values */
function cartesianProduct(grid) {
    const keys = Object.keys(grid);
    if (keys.length === 0)
        return [{}];
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
    const mergedConfig = {
        ...baseConfig,
        ...paramSet,
        seed,
    };
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
    // Compute summary statistics across all runs for each numeric final-stat field
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
        name,
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
// Import downloadBlob from data-export
import { downloadBlob } from "./data-export.js";
