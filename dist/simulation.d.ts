import { RNG } from "./rng.js";
import { World } from "./world.js";
import { Organism } from "./organism.js";
import { Colony } from "./colony.js";
export interface SimStats {
    tick: number;
    day: number;
    population: number;
    colonyCount: number;
    avgColonySize: number;
    totalBirths: number;
    totalSexualBirths: number;
    totalColonyBuds: number;
    totalDeaths: number;
    totalApoptosis: number;
    totalKills: number;
    totalColonyDeaths: number;
    totalEnergy: number;
    avgEnergy: number;
    avgAge: number;
    avgSize: number;
    avgStrength: number;
    avgAggression: number;
    avgAltruism: number;
    avgMutationRate: number;
    avgCooperation: number;
    speciesCount: number;
}
export interface SimEvent {
    type: "birth" | "death" | "kill" | "apoptosis" | "colony_bud" | "colony_death";
    tick: number;
    organismId: number;
    colonyId?: number;
    parentId?: number;
    otherParentId?: number;
    sexual?: boolean;
    x: number;
    y: number;
    energyGained?: number;
    cellCount?: number;
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
    readonly colonies: Map<number, Colony>;
    readonly events: SimEvent[];
    private organismColony;
    private tick;
    private totalBirths;
    private totalSexualBirths;
    private totalColonyBuds;
    private totalDeaths;
    private totalApoptosis;
    private totalKills;
    private totalColonyDeaths;
    private nextId;
    private nextColonyId;
    private config;
    constructor(config?: Partial<SimulationConfig>);
    get currentTick(): number;
    get simConfig(): SimulationConfig;
    get day(): number;
    private seedPopulation;
    private spatialGrid;
    private forEachNearbyOrganism;
    private findColonyPartner;
    private getOrganismById;
    step(): SimEvent[];
    run(maxTicks?: number, onEvent?: (ev: SimEvent) => void): SimStats;
    stats(): SimStats;
    private countSpecies;
    getState(): {
        tick: number;
        day: number;
        organisms: import("./organism.js").OrganismState[];
        colonies: import("./colony.js").ColonyState[];
        snapshot: {
            food: Float32Array;
            pheromone: Float32Array;
        };
    };
    getOrganismColor(org: Organism): string;
}
