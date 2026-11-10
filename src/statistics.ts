import { mean, stdDev } from "./data-export.js";
import { RNG } from "./rng.js";

// ============================================================================
// STATISTICAL ANALYSIS MODULE
//
// Scientific rigor for evolutionary experiments:
// - Confidence intervals (bootstrap + analytical)
// - Significance testing (permutation tests, t-tests)
// - Effect size (Cohen's d)
// - Replicate aggregation
// - Multiple comparison correction
//
// References: Efron & Tibshirani bootstrap, Cohen's d, Benjamini-Hochberg
// ============================================================================

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
export function bootstrapCI(
  data: number[],
  nBootstrap: number = 2000,
  level: number = 0.95
): ConfidenceInterval {
  const n = data.length;
  if (n === 0) return { lower: 0, upper: 0, level };
  const rng = new RNG(42);
  const bootstraps: number[] = [];
  for (let b = 0; b < nBootstrap; b++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += data[rng.int(0, n - 1)];
    }
    bootstraps.push(sum / n);
  }
  bootstraps.sort((a, b) => a - b);
  const alpha = 1 - level;
  const lowerIdx = Math.floor((alpha / 2) * nBootstrap);
  const upperIdx = Math.floor((1 - alpha / 2) * nBootstrap);
  return {
    lower: bootstraps[Math.max(0, lowerIdx)],
    upper: bootstraps[Math.min(nBootstrap - 1, upperIdx)],
    level,
  };
}

/** Two-sample permutation test for difference in means */
export function permutationTest(
  groupA: number[],
  groupB: number[],
  nPermutations: number = 5000
): TestResult {
  const nA = groupA.length;
  const nB = groupB.length;
  if (nA === 0 || nB === 0) {
    return { statistic: 0, pValue: 1, significant: false, effectSize: 0, interpretation: "Insufficient data" };
  }
  const meanA = mean(groupA);
  const meanB = mean(groupB);
  const observedDiff = meanA - meanB;

  const pooled = [...groupA, ...groupB];
  const n = pooled.length;
  const rng = new RNG(42);
  let extremeCount = 0;

  for (let p = 0; p < nPermutations; p++) {
    // Shuffle pooled
    for (let i = n - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [pooled[i], pooled[j]] = [pooled[j], pooled[i]];
    }
    const permA = pooled.slice(0, nA);
    const permB = pooled.slice(nA);
    const permDiff = mean(permA) - mean(permB);
    if (Math.abs(permDiff) >= Math.abs(observedDiff)) extremeCount++;
  }

  const pValue = (extremeCount + 1) / (nPermutations + 1);
  const pooledSD = stdDev(pooled);
  const cohenD = pooledSD > 0 ? observedDiff / pooledSD : 0;

  let interpretation = "No significant difference";
  if (pValue < 0.001) interpretation = "Highly significant (p < 0.001)";
  else if (pValue < 0.01) interpretation = "Very significant (p < 0.01)";
  else if (pValue < 0.05) interpretation = "Significant (p < 0.05)";
  else if (pValue < 0.1) interpretation = "Marginally significant (p < 0.1)";

  return {
    statistic: observedDiff,
    pValue,
    significant: pValue < 0.05,
    effectSize: cohenD,
    interpretation,
  };
}

/** Compare two experimental groups with full statistics */
export function compareGroups(
  groupA: number[],
  groupB: number[],
  labelA: string,
  labelB: string
): GroupComparison {
  const meanA = mean(groupA);
  const meanB = mean(groupB);
  const diff = meanA - meanB;
  const test = permutationTest(groupA, groupB);
  const ciA = bootstrapCI(groupA);
  const ciB = bootstrapCI(groupB);
  // CI for difference (conservative: overlap of individual CIs)
  const ci: ConfidenceInterval = {
    lower: Math.min(ciA.lower - ciB.upper, ciB.lower - ciA.upper),
    upper: Math.max(ciA.upper - ciB.lower, ciB.upper - ciA.lower),
    level: 0.95,
  };
  return {
    groupA: labelA,
    groupB: labelB,
    meanA,
    meanB,
    diff,
    test,
    ci,
  };
}

/** Aggregate multiple experiment replicates into summary statistics */
export interface ReplicateSummary {
  parameterSet: string;
  nReplicates: number;
  mean: number;
  std: number;
  se: number;           // standard error
  ci95: ConfidenceInterval;
  min: number;
  max: number;
  cv: number;           // coefficient of variation
}

export function summarizeReplicates(
  values: number[]
): ReplicateSummary {
  const n = values.length;
  const m = mean(values);
  const s = stdDev(values);
  const se = n > 0 ? s / Math.sqrt(n) : 0;
  const ci = bootstrapCI(values);
  const cv = m !== 0 ? s / Math.abs(m) : 0;
  return {
    parameterSet: "",
    nReplicates: n,
    mean: m,
    std: s,
    se,
    ci95: ci,
    min: Math.min(...values),
    max: Math.max(...values),
    cv,
  };
}

/** Benjamini-Hochberg FDR correction for multiple comparisons */
export function fdrCorrection(pValues: number[]): number[] {
  const n = pValues.length;
  const indexed = pValues.map((p, i) => ({ p, i }));
  indexed.sort((a, b) => a.p - b.p);
  const adjusted = new Array(n).fill(1);
  for (let i = n - 1; i >= 0; i--) {
    const rank = i + 1;
    adjusted[indexed[i].i] = Math.min(1, (indexed[i].p * n) / rank);
  }
  // Enforce monotonicity
  for (let i = n - 2; i >= 0; i--) {
    adjusted[indexed[i].i] = Math.min(adjusted[indexed[i].i], adjusted[indexed[i + 1].i]);
  }
  return adjusted;
}

/** Correlation (Pearson) between two variables with significance */
export interface CorrelationResult {
  r: number;
  pValue: number;
  significant: boolean;
}

export function correlation(x: number[], y: number[]): CorrelationResult {
  const n = x.length;
  if (n < 3) return { r: 0, pValue: 1, significant: false };
  const mx = mean(x);
  const my = mean(y);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - mx) * (y[i] - my);
    dx += (x[i] - mx) ** 2;
    dy += (y[i] - my) ** 2;
  }
  const denom = Math.sqrt(dx * dy);
  const r = denom > 0 ? num / denom : 0;
  // t-test for correlation: t = r * sqrt((n-2)/(1-r^2))
  const t = Math.abs(r) * Math.sqrt((n - 2) / Math.max(1 - r * r, 1e-9));
  // Approximate p-value (rough)
  const pValue = 2 * (1 - normalCDF(t));
  return { r, pValue, significant: pValue < 0.05 };
}

function normalCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

function erf(x: number): number {
  // Abramowitz-Stegun approximation
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}
