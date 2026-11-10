import { RNG } from "./rng.js";
import type { Organism } from "./organism.js";
export interface WorldConfig {
    width: number;
    height: number;
    foodRegenRate: number;
    foodMaxPerCell: number;
    foodSpawnChance: number;
    pheromoneDecay: number;
    energyRewardPerFood: number;
    nutrientDecay: number;
    nutrientRegenBoost: number;
    temperatureMin: number;
    temperatureMax: number;
    lightCycleLength: number;
}
export declare const WORLD_DEFAULTS: WorldConfig;
export type CellKind = "empty" | "food" | "organism";
export interface NearbyEntry {
    x: number;
    y: number;
    kind: CellKind;
    energy: number;
}
export declare class World {
    readonly width: number;
    readonly height: number;
    private food;
    private pheromone;
    private nutrients;
    private temperature;
    private light;
    private config;
    private organismIdCounter;
    private dayPhase;
    constructor(config?: Partial<WorldConfig>, rng?: RNG);
    idx(x: number, y: number): number;
    foodAt(x: number, y: number): number;
    consumeFood(x: number, y: number, amount: number): number;
    pheromoneAt(x: number, y: number): number;
    depositPheromone(x: number, y: number, amount: number): void;
    nutrientsAt(x: number, y: number): number;
    decompose(x: number, y: number, amount: number): void;
    absorbNutrients(x: number, y: number, amount: number): number;
    decayNutrients(): void;
    temperatureAt(x: number, y: number): number;
    lightAt(x: number, y: number): number;
    updateEnvironment(tick: number): void;
    regenerateFood(rng: RNG): void;
    decayPheromones(): void;
    forNearby(x: number, y: number, range: number, cb: (ox: number, oy: number, kind: CellKind, energy: number) => void): void;
    nextOrganismId(): number;
    addOrganism(org: Organism): void;
    getSnapshot(): {
        food: Float32Array;
        pheromone: Float32Array;
        nutrients: Float32Array;
        temperature: Float32Array;
        light: Float32Array;
    };
    serialize(): {
        width: number;
        height: number;
        config: WorldConfig;
        food: number[];
        pheromone: number[];
        nutrients: number[];
        temperature: number[];
        light: number[];
        dayPhase: number;
    };
    static deserialize(data: {
        width: number;
        height: number;
        config: WorldConfig;
        food: number[];
        pheromone: number[];
        nutrients: number[];
        temperature: number[];
        light: number[];
        dayPhase: number;
    }): World;
}
