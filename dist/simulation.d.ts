import { RNG } from "./rng.js";
import { World } from "./world.js";
import { Organism } from "./organism.js";
export interface SimStats {
    tick: number;
    population: number;
    totalBirths: number;
    totalSexualBirths: number;
    totalDeaths: number;
    totalKills: number;
    totalEnergy: number;
    avgEnergy: number;
    avgAge: number;
    avgSize: number;
    avgStrength: number;
    avgAggression: number;
    avgAltruism: number;
    speciesCount: number;
    day: number;
}
export interface SimEvent {
    type: "birth" | "death" | "kill";
    tick: number;
    organismId: number;
    parentId?: number;
    otherParentId?: number;
    sexual?: boolean;
    x: number;
    y: number;
    energyGained?: number;
}
export interface SimulationConfig {
    seed: number;
    width: number;
    height: number;
    initialPopulation: number;
    initialEnergy: number;
    foodRegenRate: number;
    foodMaxPerCell: number;
    foodSpawnChance: number;
    pheromoneDecay: number;
    maxTicks: number;
    dayLength: number;
}
export declare const SIM_DEFAULTS: SimulationConfig;
export declare class Simulation {
    readonly rng: RNG;
    readonly world: World;
    readonly organisms: Organism[];
    readonly events: SimEvent[];
    private tick;
    private totalBirths;
    private totalSexualBirths;
    private totalDeaths;
    private totalKills;
    private nextId;
    private config;
    private gridOrg;
    constructor(config?: Partial<SimulationConfig>);
    get currentTick(): number;
    get simConfig(): SimulationConfig;
    get day(): number;
    private seedPopulation;
    step(): SimEvent[];
    run(maxTicks?: number, onEvent?: (ev: SimEvent) => void): SimStats;
    stats(): SimStats;
    private countSpecies;
    getState(): {
        tick: number;
        day: number;
        organisms: import("./organism.js").OrganismState[];
        snapshot: {
            food: Float32Array;
            pheromone: Float32Array;
        };
    };
    getOrganismColor(org: Organism): string;
}
