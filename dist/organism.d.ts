import { RNG } from "./rng.js";
import { Genome, BrainLayout } from "./genome.js";
import { Brain } from "./brain.js";
import { World } from "./world.js";
export interface Percept {
    inputs: Float32Array;
    energy: number;
}
export interface OrganismState {
    id: number;
    x: number;
    y: number;
    energy: number;
    age: number;
    maxAge: number;
    dead: boolean;
    genome: Genome;
}
export interface ReproductionEvent {
    parentId: number;
    childId: number;
    x: number;
    y: number;
}
export declare class Organism {
    readonly id: number;
    x: number;
    y: number;
    energy: number;
    age: number;
    dead: boolean;
    readonly genome: Genome;
    readonly brain: Brain;
    readonly memory: Float32Array;
    private memoryCount;
    private memoryWriteIdx;
    private lastPercept;
    private lastOutput;
    constructor(id: number, x: number, y: number, energy: number, genome: Genome, layout?: BrainLayout);
    perceive(world: World): Float32Array;
    think(inputs: Float32Array): Float32Array;
    act(outputs: Float32Array, world: World, rng: RNG): ReproductionEvent[];
    tickMetabolism(): void;
    learn(reward: number): void;
    private memoryMean;
    private memoryWrite;
    private clampPos;
    static reproduce(parent: Organism, childEnergy: number, rng: RNG, childId: number): Organism;
    getState(): OrganismState;
}
