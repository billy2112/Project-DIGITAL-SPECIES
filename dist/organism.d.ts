import { RNG } from "./rng.js";
import { Genome, BrainLayout } from "./genome.js";
import { Brain } from "./brain.js";
import { World } from "./world.js";
import { CellRole } from "./colony.js";
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
    generation: number;
    dead: boolean;
    genome: Genome;
    parentId: number | null;
    colonyId: number | null;
    role: CellRole;
    size: number;
    strength: number;
}
export interface ReproductionEvent {
    parentId: number;
    childId: number;
    x: number;
    y: number;
    sexual: boolean;
    otherParentId?: number;
}
export interface AttackEvent {
    attackerId: number;
    victimId: number;
    x: number;
    y: number;
    energyGained: number;
}
export declare class Organism {
    readonly id: number;
    x: number;
    y: number;
    energy: number;
    age: number;
    generation: number;
    dead: boolean;
    readonly genome: Genome;
    readonly brain: Brain;
    readonly memory: Float32Array;
    readonly parentId: number | null;
    colonyId: number | null;
    role: CellRole;
    private memoryCount;
    private memoryWriteIdx;
    private lastPercept;
    private lastOutput;
    constructor(id: number, x: number, y: number, energy: number, genome: Genome, parentId?: number | null, generation?: number, colonyId?: number | null, role?: CellRole, layout?: BrainLayout);
    perceive(world: World): Float32Array;
    think(inputs: Float32Array): Float32Array;
    act(outputs: Float32Array, world: World, rng: RNG): {
        events: ReproductionEvent[];
        attacks: AttackEvent[];
    };
    tickMetabolism(world?: World | null): void;
    learn(reward: number): void;
    private memoryMean;
    private memoryWrite;
    private clampPos;
    static reproduce(parent: Organism, childEnergy: number, rng: RNG, childId: number, sexual?: boolean, otherParent?: Organism | null, generationOffset?: number, colonyId?: number | null, role?: CellRole): Organism;
    static sexualReproduce(a: Organism, b: Organism, rng: RNG, childId: number, colonyId?: number | null, role?: CellRole): Organism;
    getState(): OrganismState;
    serialize(): {
        id: number;
        x: number;
        y: number;
        energy: number;
        age: number;
        generation: number;
        dead: boolean;
        parentId: number | null;
        colonyId: number | null;
        role: CellRole;
        genome: GenomeJSON;
        memory: number[];
    };
    static deserialize(data: {
        id: number;
        x: number;
        y: number;
        energy: number;
        age: number;
        generation: number;
        dead: boolean;
        parentId: number | null;
        colonyId: number | null;
        role: CellRole;
        genome: GenomeJSON;
        memory: number[];
    }): Organism;
}
