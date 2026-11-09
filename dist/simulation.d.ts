import { RNG } from "./rng.js";
import { World } from "./world.js";
import { Organism } from "./organism.js";
export interface SimStats {
    tick: number;
    population: number;
    totalBirths: number;
    totalDeaths: number;
    totalEnergy: number;
    avgEnergy: number;
    avgAge: number;
    speciesCount: number;
}
export interface SimEvent {
    type: "birth" | "death";
    tick: number;
    organismId: number;
    parentId?: number;
    x: number;
    y: number;
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
}
export declare const SIM_DEFAULTS: SimulationConfig;
export declare class Simulation {
    readonly rng: RNG;
    readonly world: World;
    readonly organisms: Organism[];
    readonly events: SimEvent[];
    private tick;
    private totalBirths;
    private totalDeaths;
    private nextId;
    private config;
    private gridOrg;
    get currentTick(): number;
    get simConfig(): SimulationConfig;
    constructor(config?: Partial<SimulationConfig>);
    private seedPopulation;
    step(): SimEvent[];
    run(maxTicks?: number, onEvent?: (ev: SimEvent) => void): SimStats;
    stats(): SimStats;
    private countSpecies;
    getState(): {
        tick: number;
        organisms: import("./organism.js").OrganismState[];
        snapshot: {
            food: Float32Array;
            pheromone: Float32Array;
        };
    };
}
