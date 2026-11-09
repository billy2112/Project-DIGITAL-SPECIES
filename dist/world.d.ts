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
    private config;
    private organismIdCounter;
    constructor(config?: Partial<WorldConfig>);
    idx(x: number, y: number): number;
    foodAt(x: number, y: number): number;
    consumeFood(x: number, y: number, amount: number): number;
    pheromoneAt(x: number, y: number): number;
    depositPheromone(x: number, y: number, amount: number): void;
    regenerateFood(rng: RNG): void;
    decayPheromones(): void;
    forNearby(x: number, y: number, range: number, cb: (ox: number, oy: number, kind: CellKind, energy: number) => void): void;
    nextOrganismId(): number;
    addOrganism(org: Organism): void;
    getSnapshot(): {
        food: Float32Array;
        pheromone: Float32Array;
    };
}
