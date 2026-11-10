import { Simulation } from "./simulation.js";
export interface FitnessLandscapeResult {
    genotypeCount: number;
    meanFitness: number;
    fitnessVariance: number;
    ruggedness: number;
    epistasis: number;
    localPeaks: number;
    globalPeakFitness: number;
    accessibility: number;
    navigability: number;
    distanceMatrix: number[][];
    fitnessValues: number[];
    genotypes: string[];
}
export declare function analyzeFitnessLandscape(sim: Simulation): FitnessLandscapeResult;
export declare function fitnessLandscapeToCsv(result: FitnessLandscapeResult): string;
export declare function fitnessLandscapeSummary(result: FitnessLandscapeResult): string;
