# Project DIGITAL SPECIES — Artificial Life Research Platform

A deterministic, scientifically grounded artificial life simulator and evolution laboratory.
Behavior, morphology, intelligence, and social structure emerge from interacting rules —
nothing is hardcoded. Organisms reproduce, mutate, compete, cooperate, and form multicellular
colonies. The system supports save/load, reproducible experiments, and a 3D DNA-generated
visualizer.

## Core Features

- **DNA genome** (A/C/G/T) encoding morphology, color, bioluminescence, and 24 quantitative traits
- **Neural network** (16→20→8) with Hebbian + reward-modulated learning
- **Metabolism:** basal, movement, neural computation, sensing, signaling, reproduction, temperature stress
- **Reproduction:** asexual (mutation) and sexual (crossover + mutation)
- **Multicellularity:** colonies with shared energy, division of labor (5 roles), budding, apoptosis
- **Predation:** aggression/strength-based kills
- **Environment:** temperature gradient, day/night cycle, food regeneration, nutrient recycling from decomposition
- **Species detection** by genome-distance clustering
- **Evolution of evolvability:** mutation rate and learning rate are evolvable traits

## Advanced Features

- **Save/load:** full simulation state serialization including RNG state; reproducible continuation
- **Experiments:** 6 preconfigured experiments (resource scarcity, predator-prey, multicellularity, cooperation, mutation-rate evolution, environmental adaptation) with A/B comparison
- **3D visualizer:** DNA-generated organism morphologies (blob/segmented/star/spiral/rays), colony bond lines, role-based coloring, organism inspector
- **Mobile compatible:** responsive UI, touch controls, WebGL hardening

## Quick Start

```bash
npm install
npm run typecheck
npm test

# Headless run (prints final stats)
npm start -- --ticks 500 --population 1000

# Save/load test
npx tsx -e "import { Simulation } from './src/simulation.js'; import { saveToJSON, loadFromJSON } from './src/serialization.js'; const s = new Simulation({seed:1,width:40,height:40,initialPopulation:50}); const s2 = loadFromJSON(saveToJSON(s)); console.log('Restored:', s2.stats().population);"

# Run an experiment
npx tsx -e "import { runExperiment } from './src/experiments.js'; console.log(JSON.stringify(runExperiment('multicellularity').finalStats, null, 2))"
```

### CLI Options

| Option | Default | Description |
|--------|---------|-------------|
| `--seed` | random | PRNG seed |
| `--ticks` | 1000 | Number of ticks |
| `--width` / `--height` | 60 / 30 | World size |
| `--population` | 300 | Initial organisms |
| `--live` | true | Terminal visualization |

## Documentation

| File | Contents |
|------|----------|
| `ARCHITECTURE.md` | System design, module dependencies, rendering architecture |
| `SCIENTIFIC_MODEL.md` | Biological foundations, abstractions, limitations, references |
| `ROADMAP.md` | Completed, in-progress, planned features; acceptance criteria |
| `EXPERIMENTS.md` | Experiment presets, running, reproducibility, adding new experiments |
| `PERFORMANCE.md` | Benchmarks, bottlenecks, optimization recommendations |
| `CHANGELOG.md` | Release history |

## Live Site

https://billy2112.github.io/Project-DIGITAL-SPECIES/ (GitHub Pages, served from `main`)

## Scripts

- `npm run typecheck` — TypeScript strict check
- `npm test` — test suite
- `npm start` — headless simulation
- `npm run sim` — live terminal visualization

## Scientific Integrity

Simulated organisms are not conscious or sentient. Simulated intelligence is not equivalent to animal or human intelligence. All metrics are calculated from actual simulation data. Extinction, stasis, and simplification are valid evolutionary outcomes — complexity increase is not guaranteed.
