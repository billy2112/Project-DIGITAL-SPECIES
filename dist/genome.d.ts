import { RNG } from "./rng.js";
export interface GenomeTraits {
    baseMaintenance: number;
    moveCost: number;
    thinkCost: number;
    reproductionThreshold: number;
    reproductionCost: number;
    mutationRate: number;
    visionRange: number;
    memoryCapacity: number;
    maxAge: number;
    speed: number;
}
export declare const TRAIT_DEFAULTS: GenomeTraits;
export declare const TRAIT_MIN: GenomeTraits;
export declare const TRAIT_MAX: GenomeTraits;
export interface Genome {
    weights: Float32Array;
    traits: GenomeTraits;
}
export interface BrainLayout {
    inputs: number;
    hidden: number;
    outputs: number;
}
export declare const DEFAULT_LAYOUT: BrainLayout;
export declare function weightCount(layout: BrainLayout): number;
export declare function createRandomGenome(rng: RNG, layout?: BrainLayout): Genome;
export declare function cloneGenome(g: Genome): Genome;
export declare function mutateGenome(parent: Genome, rng: RNG): Genome;
export declare function genomeDistance(a: Genome, b: Genome): number;
