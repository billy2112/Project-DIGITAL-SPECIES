# ROADMAP.md — Project DIGITAL SPECIES

## Completed (Phase 1–3)

- Deterministic seeded simulation engine (mulberry32 PRNG)
- DNA genome (A/C/G/T) with functional genotype→phenotype mapping
- Hebbian neural network with reward-modulated learning
- Organism perception, metabolism, reproduction (asexual + sexual)
- Toroidal world with food, pheromones, temperature, light cycles
- Decomposition and nutrient recycling
- Multicellular colonies with cell roles, energy pooling, budding
- Apoptosis (programmed cell death) and internal conflict
- Predation, aggression, strength traits
- DNA-driven 3D morphology (blob/segmented/star/spiral/rays)
- Three.js InstancedMesh renderer with colony bond lines
- Save/load serialization with reproducible RNG state
- Experiment framework (6 presets)
- Test suite, typecheck, CI-ready build

## In Progress / Next (Phase 4)

- [ ] Species phylogenetic trees and ancestry tracking
- [ ] Food web distinction (producers/consumers/scavengers)
- [ ] Symbiosis (mutualism, commensalism, parasitism)
- [ ] Sensory system diversification (vision, chemical, etc.)
- [ ] Communication signal evolution (sender-receiver meaning)
- [ ] Scientific observatory dashboard with interactive graphs
- [ ] Save file management UI (multiple slots, autosave)
- [ ] Experiment A/B comparison tool

## Planned (Phase 5–7)

- [ ] Non-periodic boundary conditions (islands, oceans, barriers)
- [ ] Mineral/water resources distinct from food
- [ ] Seasonal cycles and climate variation
- [ ] Disease/pathogen model
- [ ] Evolvable neural topology (variable neuron count, connectivity)
- [ ] Recurrent neural networks (internal temporal state)
- [ ] Memory network (working memory beyond ring buffer)
- [ ] Tool-like environmental interactions
- [ ] Cultural transmission / social learning
- [ ] Web Workers for background simulation
- [ ] Million-entity benchmark configurations

## Out of Scope / Research Hypotheses

- **Civilization-like behavior:** Not programmed; only environmental mechanisms provided. Emergent social structures are a hypothesis, not a goal.
- **Human-like language:** Not implemented; communication signals evolve only if selection supports them.
- **Guaranteed complexity increase:** Explicitly rejected. Simplification and extinction are valid outcomes.

## Acceptance Criteria Tracking

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Organisms reproduce | Done |
| 2 | Mutations change inherited traits | Done |
| 3 | Genetic changes affect phenotypes | Done |
| 4 | Natural selection changes populations | Done |
| 5 | Real energy constraints | Done |
| 6 | Learning changes future behavior | Done |
| 7 | Death from environmental/biological causes | Done |
| 8 | Resources consumed and regenerated | Done |
| 9 | Predation has measurable consequences | Done |
| 10 | Colonies have cooperative mechanics | Done |
| 11 | Cell differentiation affects functionality | Done |
| 12 | Colony reproduction transmits information | Done |
| 13 | Species classifications are data-driven | Done |
| 14 | Environmental changes affect evolution | Done |
| 15 | 3D renderer represents actual state | Done |
| 16 | Metrics from simulation data | Done |
| 17 | Experiments reproducible | Done |
| 18 | Save files restore state | Done |
| 19 | Historical data inspectable | Partial (events logged, no replay UI) |
| 20 | Large population benchmarks | Partial (tested to 3000) |
| 21 | Automated tests for subsystems | Done |
| 22 | Documentation describes implementation | Done |
