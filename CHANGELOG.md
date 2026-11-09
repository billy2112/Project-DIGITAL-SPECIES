# CHANGELOG.md — Project DIGITAL SPECIES

## [Unreleased]

### Added

- Decomposition & nutrient recycling: dead organisms return energy as nutrients; nutrients boost food regeneration; organisms can absorb nutrients directly.
- Environmental gradients: temperature field (sinusoidal across Y axis) and day/night light cycle; temperature stress affects metabolism.
- Organism perception expanded: temperature and light sensory inputs (16 inputs total).
- Save/load serialization: full simulation state capture/restore including RNG state, organisms, colonies, world fields, totals, and events.
- Experiment framework: 6 preconfigured experiments (resource scarcity, predator-prey, multicellularity, cooperation, mutation-rate evolution, environmental adaptation) with A/B comparison.
- WebGL hardening for mobile: lower shadow map resolution (512²), antialias off, pixel ratio cap, try/catch around renderer, error overlay with Reset retry.
- Deterministic RNG: refactored to serializable state (`getState()`/`setState()`); `Math.random()` removed from simulation core.
- Documentation: ARCHITECTURE.md, SCIENTIFIC_MODEL.md, ROADMAP.md, EXPERIMENTS.md, PERFORMANCE.md, CHANGELOG.md.

### Fixed

- Critical: `web3d.js` foodInstances array was never populated — food invisible in 3D view.
- Critical: `World.idx()` used non-integer positions as array indices → undefined → NaN temperature → NaN energy → mass extinction.
- Critical: `Math.max(0, NaN)` returns NaN; replaced with `Number.isFinite` checks for energy clamping.
- Critical: `RNG.getState()` returned signed 32-bit int but `setState()` expected unsigned; round-trip mismatch broke determinism after save/load.
- Tablet UI responsiveness: O(n²) colony bond rendering → O(n) with ID map; bond lines capped at 2048; HUD throttled to 6 FPS.
- Black canvas on mobile: defensive render loop with error surface.

### Changed

- `World` constructor accepts optional `RNG` for deterministic initial food.
- `Organism.tickMetabolism()` accepts `World` for temperature stress calculation.
- `Brain.DEFAULT_LAYOUT` inputs expanded 14 → 16 (added temperature, light).
- `RNG` refactored from closure-based to explicit `state` property for serialization.
- Default world population reduced to 100 for mobile performance.

### Removed

- `Math.random()` from simulation code (was in `World` constructor for initial food).

## [1.0.0] — Initial Release

- Deterministic artificial life simulator
- DNA genome, Hebbian NN, organism metabolism, reproduction
- Toroidal world with food and pheromones
- Multicellular colonies with budding and apoptosis
- DNA-driven 3D morphology and Three.js renderer
- Test suite and GitHub Pages deployment
