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
    size: number;
    strength: number;
    aggression: number;
    altruism: number;
    bioluminescence: number;
}
export interface Morphotype {
    bodyPlan: "blob" | "segmented" | "star" | "spiral" | "rays";
    segmentCount: number;
    limbPairs: number;
    thickness: number;
    curvature: number;
    colorHue: number;
    colorSat: number;
    colorLum: number;
    glowHue: number;
    glowIntensity: number;
    scale: number;
}
export declare const DNA_LENGTH = 192;
export declare const TRAIT_DEFAULTS: GenomeTraits;
export declare const TRAIT_MIN: GenomeTraits;
export declare const TRAIT_MAX: GenomeTraits;
export interface Genome {
    weights: Float32Array;
    traits: GenomeTraits;
    dna: Uint8Array;
    dnaVersion: number;
}
export interface BrainLayout {
    inputs: number;
    hidden: number;
    outputs: number;
}
export declare const DEFAULT_LAYOUT: BrainLayout;
export declare function weightCount(layout: BrainLayout): number;
export declare function dnaToMorphotype(dna: Uint8Array): Morphotype;
export declare function createRandomGenome(rng: RNG, layout?: BrainLayout): Genome;
export declare function cloneGenome(g: Genome): Genome;
export declare function crossoverGenome(a: Genome, b: Genome, rng: RNG): Genome;
export declare function mutateGenome(parent: Genome, rng: RNG): Genome;
export declare function genomeDistance(a: Genome, b: Genome): number;
export declare function genomeHashColor(g: Genome): string;
export declare function dnaString(dna: Uint8Array): string;
export declare function dnaFromString(s: string): Uint8Array;
