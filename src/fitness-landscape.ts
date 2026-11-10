import { Organism } from "./organism.js";
import { Simulation } from "./simulation.js";
import { mean, stdDev } from "./data-export.js";
import { buildPhylogeny } from "./phylogeny.js";

// ============================================================================
// FITNESS LANDSCAPE ANALYZER
// 
// Scientific basis: fitness landscapes map genotype → fitness. Key metrics:
// - Epistasis: deviation from additivity of mutational effects
// - Ruggedness: number of local peaks / correlation structure
// - Accessibility: fraction of mutational paths to higher fitness
// - Navigability: ease of evolutionary movement across landscape
//
// References: Wright 1932, Kauffman & Weinberger NK model, Weinreich et al.
// ============================================================================

export interface FitnessLandscapeResult {
  genotypeCount: number;
  meanFitness: number;
  fitnessVariance: number;
  ruggedness: number;           // correlation of fitness between 1-mutant neighbors
  epistasis: number;            // average deviation from additivity
  localPeaks: number;           // genotypes with no fitter 1-mutant neighbor
  globalPeakFitness: number;
  accessibility: number;        // fraction of monotonic paths to global peak
  navigability: number;         // ease of evolutionary navigation
  distanceMatrix: number[][];   // pairwise genotype distances
  fitnessValues: number[];      // fitness per genotype
  genotypes: string[];          // genotype strings (dna)
}

export function analyzeFitnessLandscape(sim: Simulation): FitnessLandscapeResult {
  const alive = sim.organisms.filter((o) => !o.dead);
  const genotypes: string[] = [];
  const fitnessValues: number[] = [];
  const idToIdx = new Map<number, number>();

  // Build genotype → fitness map from living organisms
  for (const o of alive) {
    const g = o.genome;
    let dna = "";
    for (let i = 0; i < g.dna.length; i++) dna += "ACGT"[g.dna[i]];
    genotypes.push(dna);
    fitnessValues.push(o.energy);
    idToIdx.set(o.id, genotypes.length - 1);
  }

  const n = genotypes.length;
  const meanFitness = mean(fitnessValues);
  const fitnessVariance = stdDev(fitnessValues) ** 2;

  // Distance matrix (Hamming distance normalized)
  const distanceMatrix: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      let d = 0;
      for (let k = 0; k < genotypes[i].length; k++) {
        if (genotypes[i][k] !== genotypes[j][k]) d++;
      }
      row.push(d / genotypes[i].length);
    }
    distanceMatrix.push(row);
  }

  // Ruggedness: correlation between fitness of 1-mutant neighbors
  // High ruggedness = low correlation (fitness changes unpredictably)
  let neighborPairs = 0;
  let neighborFitnessCorrSum = 0;
  let localPeaks = 0;

  for (let i = 0; i < n; i++) {
    const fitterNeighbors: number[] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      // Check if 1-mutant neighbor (Hamming distance = 1/L)
      const d = distanceMatrix[i][j];
      if (d > 0 && d <= 1.0 / genotypes[0].length + 0.001) {
        neighborPairs++;
        neighborFitnessCorrSum += fitnessValues[i] * fitnessValues[j];
        if (fitnessValues[j] > fitnessValues[i]) fitterNeighbors.push(j);
      }
    }
    if (fitterNeighbors.length === 0) localPeaks++;
  }

  const ruggedness = neighborPairs > 0
    ? 1.0 - Math.abs(neighborFitnessCorrSum / neighborPairs - meanFitness * meanFitness) / (fitnessVariance + 1e-9)
    : 0;

  // Epistasis: deviation from additivity using regression on single mutations
  // Simplified: variance of fitness effects conditional on background
  let epistasisSum = 0;
  let epistasisCount = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const d = distanceMatrix[i][j];
      if (d > 0 && d <= 1.0 / genotypes[0].length + 0.001) {
        const effect = fitnessValues[j] - fitnessValues[i];
        epistasisSum += Math.abs(effect);
        epistasisCount++;
      }
    }
  }
  const epistasis = epistasisCount > 0 ? epistasisSum / epistasisCount : 0;

  // Accessibility: fraction of monotonic paths from random genotypes to global peak
  const globalPeakIdx = fitnessValues.indexOf(Math.max(...fitnessValues));
  const globalPeakFitness = fitnessValues[globalPeakIdx];
  let accessiblePaths = 0;
  let totalPaths = 0;

  // For each genotype, check if there's a monotonic path to global peak
  // (greedy: always move to fitter neighbor)
  for (let start = 0; start < n; start++) {
    if (start === globalPeakIdx) continue;
    let current = start;
    let steps = 0;
    let reached = false;
    while (current !== globalPeakIdx && steps < n) {
      let bestNeighbor = -1;
      let bestFitness = fitnessValues[current];
      for (let j = 0; j < n; j++) {
        if (j === current) continue;
        const d = distanceMatrix[current][j];
        if (d > 0 && d <= 1.0 / genotypes[0].length + 0.001 && fitnessValues[j] > bestFitness) {
          bestFitness = fitnessValues[j];
          bestNeighbor = j;
        }
      }
      if (bestNeighbor === -1) break;
      current = bestNeighbor;
      steps++;
      if (current === globalPeakIdx) reached = true;
    }
    totalPaths++;
    if (reached) accessiblePaths++;
  }

  const accessibility = totalPaths > 0 ? accessiblePaths / totalPaths : 0;

  // Navigability: inverse of ruggedness-weighted path length
  const navigability = accessibility * (1 - ruggedness * 0.5);

  return {
    genotypeCount: n,
    meanFitness,
    fitnessVariance,
    ruggedness: Math.max(0, Math.min(1, ruggedness)),
    epistasis,
    localPeaks,
    globalPeakFitness,
    accessibility: Math.max(0, Math.min(1, accessibility)),
    navigability: Math.max(0, Math.min(1, navigability)),
    distanceMatrix,
    fitnessValues,
    genotypes,
  };
}

export function fitnessLandscapeToCsv(result: FitnessLandscapeResult): string {
  let out = "genotype,fitness\n";
  for (let i = 0; i < result.genotypes.length; i++) {
    out += result.genotypes[i] + "," + result.fitnessValues[i].toFixed(6) + "\n";
  }
  return out;
}

export function fitnessLandscapeSummary(result: FitnessLandscapeResult): string {
  return [
    "Fitness Landscape Analysis",
    "==========================",
    `Genotypes: ${result.genotypeCount}`,
    `Mean Fitness: ${result.meanFitness.toFixed(4)}`,
    `Fitness Variance: ${result.fitnessVariance.toFixed(6)}`,
    `Ruggedness: ${result.ruggedness.toFixed(4)} (0=smooth, 1=rugged)`,
    `Epistasis (avg effect size): ${result.epistasis.toFixed(4)}`,
    `Local Peaks: ${result.localPeaks}`,
    `Global Peak Fitness: ${result.globalPeakFitness.toFixed(4)}`,
    `Accessibility: ${result.accessibility.toFixed(4)} (fraction monotonic paths to peak)`,
    `Navigability: ${result.navigability.toFixed(4)}`,
    "",
  ].join("\n");
}
