# EXPERIMENTS.md — Project DIGITAL SPECIES

## Available Experiments

Six preconfigured experiments are available via the `runExperiment(name)` API in `src/experiments.ts`. Each experiment records its seed, configuration, initial conditions, and outcomes for reproducibility.

### 1. Resource Scarcity (`resource-scarcity`)

**Hypothesis:** Limited food drives intense competition, selecting for efficient metabolisms and foraging strategies.

**Configuration:** Small world (60×60), low food regen (0.02), low initial energy (40), 200 organisms.

**What to observe:** Population crash followed by stabilization at carrying capacity; evolution of lower maintenance costs; increased movement efficiency.

### 2. Predator-Prey Coevolution (`predator-prey`)

**Hypothesis:** High aggression and strength select for predation; prey evolve speed and vigilance.

**Configuration:** Larger world (80×80), 300 organisms, initial aggression/strength biased upward.

**What to observe:** Boom-bust population cycles; evolution of speed (prey) and strength (predators); spatial segregation.

### 3. Emergence of Multicellularity (`multicellularity`)

**Hypothesis:** High adhesion and cooperation select for colony formation, cell differentiation, and colony-level reproduction.

**Configuration:** Large world (100×100), high food regen, initial adhesion/cooperation biased upward.

**What to observe:** Colony formation; role differentiation (gatherer/reproducer/defender/signaler); colony budding; apoptosis for colony benefit.

### 4. Evolution of Cooperation (`cooperation`)

**Hypothesis:** Group selection and altruism evolve when cooperation benefits the colony more than individual selfishness.

**Configuration:** 80×80 world, initial altruism and group selection weight biased upward.

**What to observe:** High cooperation levels; colony stability; defector lineages emerging and being suppressed.

### 5. Evolution of Evolvability (`mutation-rate`)

**Hypothesis:** Mutation rate itself is an evolvable trait; lineages that tune mutation rate to environmental volatility outcompete static ones.

**Configuration:** Variable temperature (10–35°C), 250 organisms, evolvable mutation rate enabled.

**What to observe:** Mutation rate increasing in volatile environments; lineages with adaptive mutation rates persisting longer.

### 6. Environmental Adaptation (`adaptation`)

**Hypothesis:** Strong temperature gradients select for organisms that tolerate or avoid extreme conditions.

**Configuration:** Extreme temperature range (5–40°C), 100×60 world, day/night cycle.

**What to observe:** Spatial segregation by temperature tolerance; evolution of movement toward optimal temperatures.

## Running Experiments

### Via TypeScript API

```typescript
import { runExperiment, getExperimentNames, compareExperiments } from './src/experiments.js';

// List available experiments
const names = getExperimentNames();

// Run a single experiment
const result = runExperiment('multicellularity');

// Access results
console.log(result.finalStats.population);
console.log(result.finalStats.speciesCount);
console.log(result.events.length); // event log

// Compare two experiments
const comparison = compareExperiments('resource-scarcity', 'cooperation');
console.log(comparison.comparison.population); // { a, b, diff }
```

### Experiment Result Structure

```typescript
{
  name: string;
  seed: number;
  ticks: number;
  initialStats: SimStats;
  finalStats: SimStats;
  events: Array<{ tick, type, organismId, ... }>;
  saveData: string; // JSON serialization of final state
}
```

### SimStats Fields

`tick`, `day`, `population`, `colonyCount`, `avgColonySize`, `totalBirths`, `totalSexualBirths`, `totalColonyBuds`, `totalDeaths`, `totalApoptosis`, `totalKills`, `totalColonyDeaths`, `totalEnergy`, `avgEnergy`, `avgAge`, `avgSize`, `avgStrength`, `avgAggression`, `avgAltruism`, `avgMutationRate`, `avgCooperation`, `speciesCount`.

## Reproducibility

Every experiment records:
- Software version (see CHANGELOG.md)
- Seed and full configuration
- Initial conditions
- RNG state at save point
- All stochastic events

Loading a save via `loadFromJSON()` and continuing produces statistically identical results to an uninterrupted run (floating-point rounding aside).

## Adding New Experiments

Add a new entry to the `EXPERIMENTS` record in `src/experiments.ts`:

```typescript
"my-experiment": {
  name: "My Experiment",
  description: "Hypothesis being tested.",
  simConfig: {
    seed: 99,
    width: 50,
    height: 50,
    initialPopulation: 100,
    initialEnergy: 60,
    // ... all WorldConfig + SimulationConfig fields
  },
  tickLimit: 500,
  organismOverrides: (org, rng) => {
    // Optional: bias initial genomes
  },
},
```

## Scientific Integrity

Experiments test hypotheses; they do not guarantee outcomes. Extinction, stasis, and simplification are valid scientific results. Do not interpret lack of complexity increase as failure — it is data.
