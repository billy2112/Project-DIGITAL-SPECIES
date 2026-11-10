export interface ConfidenceInterval {
    lower: number;
    upper: number;
    level: number;
}
export interface TestResult {
    statistic: number;
    pValue: number;
    significant: boolean;
    effectSize: number;
    interpretation: string;
}
export interface GroupComparison {
    groupA: string;
    groupB: string;
    meanA: number;
    meanB: number;
    diff: number;
    test: TestResult;
    ci: ConfidenceInterval;
}
/** Bootstrap confidence interval for a mean */
export declare function bootstrapCI(data: number[], nBootstrap?: number, level?: number): ConfidenceInterval;
/** Two-sample permutation test for difference in means */
export declare function permutationTest(groupA: number[], groupB: number[], nPermutations?: number): TestResult;
/** Compare two experimental groups with full statistics */
export declare function compareGroups(groupA: number[], groupB: number[], labelA: string, labelB: string): GroupComparison;
/** Aggregate multiple experiment replicates into summary statistics */
export interface ReplicateSummary {
    parameterSet: string;
    nReplicates: number;
    mean: number;
    std: number;
    se: number;
    ci95: ConfidenceInterval;
    min: number;
    max: number;
    cv: number;
}
export declare function summarizeReplicates(values: number[]): ReplicateSummary;
/** Benjamini-Hochberg FDR correction for multiple comparisons */
export declare function fdrCorrection(pValues: number[]): number[];
/** Correlation (Pearson) between two variables with significance */
export interface CorrelationResult {
    r: number;
    pValue: number;
    significant: boolean;
}
export declare function correlation(x: number[], y: number[]): CorrelationResult;
