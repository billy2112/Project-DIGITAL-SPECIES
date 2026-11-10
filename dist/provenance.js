export const SOFTWARE_NAME = "Project DIGITAL SPECIES";
export const SOFTWARE_VERSION = "2.0.0";
export const SIMULATION_VERSION = "2.0.0";
export function createProvenanceRecord(sim, startTime, runtimeMs, results, knownLimitations = []) {
    const config = sim.simConfig;
    const state = sim.captureState();
    const dataHash = hashObject({ config, state, totals: state.totals });
    return {
        software: SOFTWARE_NAME,
        softwareVersion: SOFTWARE_VERSION,
        simulationVersion: SIMULATION_VERSION,
        seed: config.seed,
        config: { ...config },
        initialConditions: {
            initialPopulation: config.initialPopulation,
            initialEnergy: config.initialEnergy,
            width: config.width,
            height: config.height,
        },
        parameters: {
            foodRegenRate: config.foodRegenRate,
            foodMaxPerCell: config.foodMaxPerCell,
            foodSpawnChance: config.foodSpawnChance,
            pheromoneDecay: config.pheromoneDecay,
            maxTicks: config.maxTicks,
            dayLength: config.dayLength,
            nutrientDecay: config.nutrientDecay,
            nutrientRegenBoost: config.nutrientRegenBoost,
            temperatureMin: config.temperatureMin,
            temperatureMax: config.temperatureMax,
            lightCycleLength: config.lightCycleLength,
        },
        runtimeMs,
        startTime,
        endTime: new Date().toISOString(),
        results,
        knownLimitations,
        dataHash,
    };
}
export function validateSaveFile(data) {
    const errors = [];
    if (!data) {
        errors.push("Empty save file");
        return { valid: false, errors };
    }
    if (data.version !== 1)
        errors.push(`Unsupported save version: ${data.version}`);
    if (!data.state)
        errors.push("Missing simulation state");
    if (!data.state.config)
        errors.push("Missing configuration");
    if (!data.state.organisms)
        errors.push("Missing organisms");
    if (!data.state.world)
        errors.push("Missing world state");
    if (!Number.isInteger(data.state.tick))
        errors.push("Invalid tick");
    if (!Array.isArray(data.state.organisms))
        errors.push("Organisms not an array");
    return { valid: errors.length === 0, errors };
}
export function createSaveFileMetadata(sim) {
    const state = sim.captureState();
    const organismCount = state.organisms.length;
    const colonyCount = state.colonies.length;
    const checksum = hashObject({ tick: state.tick, organismCount, colonyCount, totals: state.totals });
    return {
        formatVersion: "1.0.0",
        createdAt: new Date().toISOString(),
        simulationTick: state.tick,
        organismCount,
        colonyCount,
        checksum,
    };
}
export function formatProvenanceForExport(prov) {
    return JSON.stringify(prov, null, 2);
}
export function formatExperimentReport(prov, stats, noveltyEvents, phylogenyStats) {
    let out = "# Project DIGITAL SPECIES — Experiment Report\n\n";
    out += "## Provenance\n";
    out += `- Software: ${prov.software} v${prov.softwareVersion}\n`;
    out += `- Simulation: v${prov.simulationVersion}\n`;
    out += `- Seed: ${prov.seed}\n`;
    out += `- Start: ${prov.startTime}\n`;
    out += `- End: ${prov.endTime}\n`;
    out += `- Runtime: ${prov.runtimeMs} ms\n`;
    out += `- Data Hash: ${prov.dataHash}\n\n`;
    out += "## Configuration\n";
    for (const [k, v] of Object.entries(prov.parameters)) {
        out += `- ${k}: ${v}\n`;
    }
    out += `\n`;
    out += "## Initial Conditions\n";
    for (const [k, v] of Object.entries(prov.initialConditions)) {
        out += `- ${k}: ${v}\n`;
    }
    out += `\n`;
    out += "## Results\n";
    for (const [k, v] of Object.entries(stats)) {
        out += `- ${k}: ${v}\n`;
    }
    out += `\n`;
    out += "## Novelty Events (" + noveltyEvents.length + ")\n";
    for (const ev of noveltyEvents) {
        out += `- Tick ${ev.tick}: ${ev.description} (${ev.severity})\n`;
    }
    out += `\n`;
    out += "## Phylogeny\n";
    out += `- Total organisms: ${phylogenyStats.totalOrganisms}\n`;
    out += `- Total lineages: ${phylogenyStats.totalLineages}\n`;
    out += `- Max depth: ${phylogenyStats.maxDepth}\n\n`;
    out += "## Known Limitations\n";
    for (const lim of prov.knownLimitations) {
        out += `- ${lim}\n`;
    }
    return out;
}
function hashObject(obj) {
    let h = 2166136261 >>> 0;
    const str = JSON.stringify(obj);
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = (h * 16777619) >>> 0;
    }
    return "0x" + h.toString(16).padStart(8, "0");
}
