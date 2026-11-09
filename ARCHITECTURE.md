# ARCHITECTURE.md — Project DIGITAL SPECIES

## Overview

Project DIGITAL SPECIES is a deterministic, modular artificial-life research platform. The system simulates a digital biosphere containing artificial organisms whose behavior, morphology, intelligence, social structures, and evolutionary trajectories emerge from interacting rules — not from hardcoded behavior.

## Technology Stack

- **Language:** TypeScript (strict mode), compiled to ES2022 modules
- **Runtime:** Node.js (CLI/headless), Browser (Three.js WebGL renderer)
- **Build:** TypeScript compiler (`tsc`)
- **Test:** `tsx` + Node `assert`
- **3D Graphics:** Three.js (InstancedMesh, OrbitControls)
- **Deployment:** GitHub Pages (static HTML/JS)

## Directory Layout

```
src/
  rng.ts          — Deterministic PRNG (mulberry32), serializable state
  genome.ts       — DNA (A/C/G/T), traits, morphotype, crossover/mutation, serialization
  brain.ts        — Feedforward neural network with Hebbian learning
  organism.ts     — Organism: perception, think, act, metabolism, reproduction, serialization
  world.ts        — Toroidal world: food, nutrients, pheromones, temperature, light
  colony.ts       — Colony: multicellular groups, cell roles, budding, serialization
  simulation.ts   — Simulation engine: fixed-timestep, spatial grid, colonies, predation, serialization
  experiments.ts  — Experiment presets and runner
  serialization.ts — Save/load orchestration
web3d.js          — Three.js 3D renderer (imports from dist/)
web.js            — Legacy 2D canvas renderer
test/index.ts     — Test suite
dist/             — Compiled JS (served by GitHub Pages)
```

## Core Architecture

### Simulation Engine (`simulation.ts`)

Fixed-timestep, tick-based simulation. Each tick executes six phases:

1. **Perceive/Think/Act** — Free organisms sense environment, run neural network, act (move/eat/reproduce/attack/signal).
2. **Colony Processing** — Energy pooling (tithing), centroid recomputation, role behaviors (reproducer/defender/signal), apoptosis (programmed cell death), colony budding.
3. **Colony Formation** — Free organisms with high adhesion bond into colonies (fraternal transition).
4. **Predation** — Aggression-based kills between free organisms.
5. **Metabolism + Death** — Energy consumption, death from starvation/aging, decomposition (nutrient recycling).
6. **World Processes** — Food regeneration, pheromone decay, nutrient decay, day/night cycle update.

### Determinism

- Seeded PRNG (mulberry32) with serializable state (`getState()`/`setState()`)
- All randomness flows through `RNG`; `Math.random()` is avoided in simulation code
- Save/load captures full state including RNG state for reproducible continuation
- Known nondeterminism: none in simulation core; `Math.random()` used only in `dna3d.ts` for visual glow assignment (renderer-only, does not affect simulation)

### Entity Model

- **Organism:** Autonomous agent with genome, brain (NN), memory, energy, age, generation, colony membership, cell role
- **Genome:** Neural weights + evolvable traits + DNA sequence (A/C/G/T)
- **Colony:** Multicellular group with shared energy, cell roles, centroid, budding reproduction
- **World:** Toroidal grid with food, nutrients, pheromones, temperature, light fields
- **Brain:** Feedforward NN (16 inputs → 20 hidden → 8 outputs) with Hebbian learning

### Spatial Indexing

Fixed-grid spatial partitioning (`GRID_CELL = 3`) for O(1) neighbor queries. Used by perception, predation, and colony formation.

### Serialization

Full state capture/restore via `captureState()`/`restoreState()` on `Simulation`, with `serialize()`/`deserialize()` on `Genome`, `Organism`, `Colony`, `World`, and `RNG`. Save format is versioned JSON.

## Module Dependencies

```
rng.ts      → (base, no deps)
genome.ts   → rng.ts
brain.ts    → rng.ts, genome.ts
organism.ts → rng.ts, genome.ts, brain.ts, world.ts, colony.ts
world.ts    → rng.ts, organism.ts (type only)
colony.ts   → rng.ts, organism.ts, genome.ts
simulation.ts → rng.ts, world.ts, organism.ts, colony.ts, genome.ts
experiments.ts → simulation.ts, world.ts, rng.ts, genome.ts, organism.ts, colony.ts
serialization.ts → simulation.ts, organism.ts, colony.ts, world.ts, rng.ts
web3d.js    → dist/simulation.js, dist/genome.js, dist/dna3d.js (Three.js from CDN)
```

## Rendering Architecture (`web3d.js`)

Three.js InstancedMesh renderer grouped by morphotype (DNA body plan). Each unique morphology gets one InstancedMesh; organisms of the same morphotype are instances. Colony bond lines drawn as LineSegments. Food rendered as instanced boxes tinted by nutrient level.

Renderer is decoupled from simulation: the sim runs independently of whether the 3D view is open.

## Key Design Decisions

1. **DNA as functional genotype:** DNA regions directly determine morphology (body plan, color, bioluminescence) and inform traits. Not merely a visual identifier.
2. **Evolution of evolvability:** Mutation rate and learning rate are themselves evolvable traits subject to selection.
3. **Major transitions:** Colonies represent the transition from independent cells to multicellular individuals with shared energy, division of labor, and colony-level reproduction (budding).
4. **No hardcoded behavior:** All behavior emerges from NN outputs + trait values + environmental conditions.
5. **Separation of concerns:** Simulation logic is pure TypeScript (no DOM/Three.js); renderer imports compiled simulation from `dist/`.
