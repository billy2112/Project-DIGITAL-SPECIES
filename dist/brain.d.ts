import { Genome, BrainLayout } from "./genome.js";
export declare class Brain {
    readonly inputs: number;
    readonly hidden: number;
    readonly outputs: number;
    readonly weights: Float32Array;
    constructor(genome: Genome, layout?: BrainLayout);
    private ihOffset;
    private bhOffset;
    private hoOffset;
    forward(input: Float32Array, out: Float32Array): void;
    hebbianLearn(input: Float32Array, output: Float32Array, reward: number, lr: number, decay: number): void;
    static weightCount(layout?: BrainLayout): number;
}
