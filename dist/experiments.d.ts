import { Simulation } from "./simulation.js";
import { RNG } from "./rng.js";
import { Organism } from "./organism.js";
export interface ExperimentConfig {
    name: string;
    description: string;
    simConfig: Parameters<typeof Simulation>[0];
    tickLimit: number;
    organismOverrides?: (org: Organism, rng: RNG) => void;
}
export interface ExperimentResult {
    name: string;
    seed: number;
    ticks: number;
    initialStats: ReturnType<Simulation["stats"]>;
    finalStats: ReturnType<Simulation["stats"]>;
    events: Array<{
        tick: number;
        type: string;
        organismId: number;
        [key: string]: any;
    }>;
    saveData: string;
}
export declare const EXPERIMENTS: Record<string, ExperimentConfig>;
export declare function getExperimentNames(): string[];
export declare function getExperiment(name: string): ExperimentConfig | undefined;
export declare function runExperiment(name: string, onEvent?: (tick: number, event: any) => void): ExperimentResult;
export declare function compareExperiments(nameA: string, nameB: string): {
    resultA: ExperimentResult;
    resultB: ExperimentResult;
    comparison: Record<string, {
        a: number;
        b: number;
        diff: number;
    }>;
};
