# SCIENTIFIC_MODEL.md — Project DIGITAL SPECIES

## Biological and Evolutionary Foundations

This document describes the scientific model implemented in Project DIGITAL SPECIES, distinguishing established biological mechanisms from computational approximations and experimental hypotheses.

## 1. Genome → Phenotype Mapping

### Implemented

- **DNA sequence:** Each organism carries a 192-nucleotide sequence (A/C/G/T), organized as 64 codons.
- **Codon regions:** Specific codon ranges map to morphology (body plan, segment count, limb pairs, thickness, curvature, color HSL, glow intensity, scale).
- **Traits:** 24 quantitative traits covering metabolism, movement, sensing, reproduction, social behavior, and evolvability.
- **Trait inheritance:** Asexual reproduction mutates parent genome; sexual reproduction crosses over weights and DNA, then mutates.
- **Gene expression:** DNA regions determine morphotype; traits are quantitative values with min/max bounds.

### Abstractions

- No explicit promoters, regulatory regions, or gene duplication/deletion (planned).
- Traits are independent quantitative values rather than products of gene regulatory networks.
- No chromosomal organization (linear DNA only).

### Scientific Basis

Modeled after genotype-phenotype maps in experimental evolution (e.g., Avida, digital genetics). The codon-based morphology mapping draws from FormGrow-style developmental encoding.

## 2. Neural Networks and Learning

### Implemented

- **Feedforward NN:** 16 sensory inputs → 20 hidden neurons → 8 behavioral outputs.
- **Hebbian learning:** Connection weights updated by `Δw = lr · reward · input · activation`, modulated by reward signal.
- **Weight decay:** Gradual decay prevents unbounded weight growth.
- **Outputs:** Move X/Y, consume, reproduce, signal, write memory, attack, bioluminesce.
- **Inputs:** Energy, age, local food, food direction, nearest organism direction/energy/size, organism count, memory mean, pheromone, temperature, light.

### Abstractions

- Fixed topology (no evolving network structure).
- No recurrent connections (no internal temporal dynamics beyond ring-buffer memory).
- Learning rate is evolvable but not backpropagation-based.

### Scientific Basis

Hebbian learning ("cells that fire together wire together") with reward modulation is a standard computational model of associative and reinforcement learning.

## 3. Metabolism and Energy Economy

### Implemented

- **Basal maintenance:** Per-tick energy cost scaling with brain size and body size.
- **Movement:** Cost proportional to distance moved and body size.
- **Neural computation:** Cost proportional to hidden layer size.
- **Consumption:** Eating food gains energy at 80% efficiency; absorbing nutrients gains at 60% efficiency.
- **Reproduction:** Asexual/sexual reproduction costs energy from parent(s).
- **Signaling:** Pheromone deposit and bioluminescence cost energy.
- **Temperature stress:** Deviating from optimal temperature (22.5) increases maintenance cost.
- **Death states:** Starvation (energy ≤ 0) and senescence (age ≥ maxAge).

### Trade-offs

- Larger body → better defense/predation but higher maintenance.
- Larger brain → more hidden neurons → higher maintenance but same learning capacity (fixed topology).
- Higher speed → faster movement but higher movement cost.
- Higher aggression/strength → better predation but no direct cost (trade-off via allocation of trait budget).

### Abstractions

- No explicit health/damage/repair system (death is binary from energy/age).
- No dormancy state (organisms are active or dead).
- No disease/pathogen model.

### Scientific Basis

Dynamic energy budget (DEB) theory: organisms allocate acquired energy to maintenance, growth, movement, and reproduction.

## 4. Reproduction and Life Cycle

### Implemented

- **Asexual reproduction:** Single parent, mutation of genome, child inherits ~50% of parent's energy as starting energy.
- **Sexual reproduction:** Two nearby high-energy parents, crossover + mutation, combined energy cost.
- **Colony budding:** Colonies with sufficient energy and members produce daughter colonies (major transition).
- **Generations:** Tracked per organism and colony.
- **Senescence:** Death at maxAge.

### Abstractions

- No explicit developmental stages (birth → adult is immediate).
- No gestation/pregnancy (reproduction is instantaneous).
- No mating rituals or courtship (sexual reproduction is proximity + energy based).

### Scientific Basis

Asexual and sexual reproduction models are standard in evolutionary computation. Colony budding models the fraternal transition in multicellularity (DISHTINY framework).

## 5. Multicellularity and Colonies

### Implemented

- **Cell adhesion:** Organisms with high adhesion bond into colonies.
- **Shared energy pool:** Colony members tithe a cooperation fraction of energy to the colony pool.
- **Division of labor:** Five roles — gatherer, reproducer, defender, signaler, free.
- **Role behaviors:**
  - Gatherer: standard foraging
  - Reproducer: invests colony energy to produce new colony cells
  - Defender: attacks nearby non-colony organisms
  - Signaler: deposits pheromones
- **Colony reproduction:** Budding — daughter colony formed with subset of parent cells and energy.
- **Apoptosis:** Cells self-sacrifice, returning energy to colony pool.

### Abstractions

- No morphogen gradients or positional gene expression within colonies.
- No tissue formation beyond role assignment.
- No within-colony genetic heterogeneity (all cells can have different genomes).

### Internal Conflict (Implemented)

- **Cheating cells:** High-aggression cells can exploit colony resources without contributing.
- **Defector lineages:** Sexual reproduction can produce genotypes that free-ride on cooperation.
- **Apoptosis enforcement:** Colony can remove low-energy cells.

### Scientific Basis

Major transitions in individuality (Michod & Szathmary), DISHTINY framework for fraternal transitions, multilevel selection theory.

## 6. Natural Selection Mechanisms

### Implemented

- **Environmental selection:** Temperature stress affects metabolism; food availability affects survival.
- **Resource competition:** Finite food regenerates; organisms compete for local cells.
- **Predation pressure:** Aggression/strength-based kills.
- **Group selection:** Colony-level reproduction favors cooperative groups.
- **Density-dependent selection:** Colony formation depends on local density.

### Abstractions

- No explicit sexual selection/mate choice.
- No frequency-dependent selection beyond density effects.
- No kin selection beyond colony membership.

### Scientific Basis

Multilevel selection theory; selection operates at organism and colony levels simultaneously.

## 7. Open-Endedness Features

### Implemented

- **Evolution of evolvability:** Mutation rate and learning rate are evolvable traits.
- **Novel trait emergence:** DNA mutations produce new morphologies and trait combinations.
- **Major transitions:** Colony formation and budding represent evolutionary transitions in individuality.
- **No guaranteed progress:** Extinction, stasis, and simplification are all possible outcomes.

### Scientific Basis

Open-ended evolution (OEE) framework: Type 2 OEE (evolution of evolvability) and Type 3 OEE (ongoing major transitions).

## 8. Species Classification

### Implemented

- **Genome distance clustering:** Organisms grouped into species by weighted genome distance (neural weights + traits + DNA Hamming distance).
- **Threshold:** 0.55 normalized distance (configurable).

### Abstractions

- No reproductive compatibility testing.
- No ecological species concept.
- No phylogenetic tree generation (planned).

### Scientific Basis

Genetic distance-based species concepts used in microbial ecology and DNA barcoding.

## 9. Environmental Model

### Implemented

- **Temperature gradient:** Spatially varying temperature (sinusoidal across Y axis).
- **Day/night cycle:** Sinusoidal light intensity over configurable cycle length.
- **Food regeneration:** Cells regenerate food at configurable rate, boosted by local nutrients.
- **Nutrient recycling:** Dead organisms decompose, returning energy as nutrients; nutrients boost food regen.
- **Pheromones:** Diffusive chemical signals that decay over time.

### Abstractions

- No water/mineral resources (food/nutrients subsume these).
- No terrain/obstacles (torus is uniform).
- No seasonal cycles beyond day/night.
- No climate change (temperature gradient is static).

### Scientific Basis

Resource-consumer models with nutrient recycling; environmental gradients as selective pressures.

## 10. Known Limitations and Simplifications

| Aspect | Implementation | Scientific Status |
|--------|---------------|-------------------|
| Neural topology | Fixed feedforward | Abstraction; no evolving structure |
| Development | DNA → static morphotype | Abstraction; no dynamic development |
| Disease | None | Not implemented |
| Water/minerals | Food/nutrients subsume | Simplification |
| Terrain | Uniform torus | Simplification |
| Seasons | Day/night only | Abstraction |
| Sexual selection | Proximity + energy | Simplification |
| Phylogenetics | None | Planned |

## References

- Michod, R. E. (1999). *Darwinian Dynamics*. Princeton University Press.
- Szathmary, E., & Smith, J. M. (1995). The major evolutionary transitions. *Nature*, 374, 227–232.
- Ofria, C., & Wilke, C. O. (2004). Avida: A software platform for research in computational evolutionary biology. *ALife*, 10(2), 191–229.
- Moreno, A., & Ofria, C. (2019). DISHTINY: A framework for studying major evolutionary transitions. *ALife*, 25(1), 1–20.
- Kauffman, S. A. (1993). *The Origins of Order*. Oxford University Press.
- Adami, C. (2006). Digital genetics: unraveling the genetic basis of evolution. *Nature Reviews Genetics*, 7, 109–118.
