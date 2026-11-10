import { Simulation } from "./simulation.js";
import { SimStats } from "./simulation.js";
export interface ExperimentConfig {
    name: string;
    description: string;
    baseConfig: Parameters<typeof Simulation>[0];
    parameterGrid: Record<string, any[]>;
    tickLimit: number;
    replicates: number;
}
export interface SingleRunResult {
    replicate: number;
    paramSet: Record<string, any>;
    seed: number;
    finalStats: SimStats;
    timeSeries: SimStats[];
}
export interface ExperimentResult {
    name: string;
    config: ExperimentConfig;
    runs: SingleRunResult[];
    summary: Record<string, {
        mean: number;
        std: number;
        min: number;
        max: number;
        values: number[];
    }>;
    completedAt: string;
}
/** Run a full experiment: parameter grid × replicates */
export declare function runExperiment(config: ExperimentConfig): ExperimentResult;
export declare function experimentResultToCsv(result: ExperimentResult): string;
export declare function downloadExperimentCsv(result: ExperimentResult): void;
export declare function downloadExperimentJson(result: ExperimentResult): void;
