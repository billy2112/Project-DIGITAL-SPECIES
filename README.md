# Project DIGITAL SPECIES — Artificial Life Simulator

A digital ecosystem containing thousands of artificial organisms. Behavior is not
programmed individually — rules are defined and complex behavior emerges.

## Organism model

Each organism carries:
- **Memory** — a fixed-size ring buffer of recent energy states
- **Energy** — gained by eating food, spent on movement, thinking, signalling, reproduction
- **Goals** — encoded as output actions (move, eat, reproduce, signal, write memory)
- **Environmental perception** — local food/organism/pheromone sensing within a vision range
- **Learning** — Hebbian learning on a small neural network, modulated by reward
- **Reproduction and mutation** — asexual reproduction with genetic mutation of weights and traits
- **Limited computational resources** — per-tick energy budget constrains thinking and action

## Advanced ALife features (research-driven)

- **DNA genome** — every organism carries an A/C/G/T DNA sequence. DNA regions encode morphology (body plan, color, bioluminescence) and traits via a FormGrow-inspired codon mapping.
- **Major transitions in individuality** — organisms with high adhesion bond into multicellular colonies. Colonies share energy, coordinate, and reproduce by **budding propagules** — the colony becomes the unit of selection (fraternal transition, DISHTINY-style).
- **Division of labor** — colony cells differentiate into roles: gatherer, reproducer, defender, signaler. Role is encoded in DNA and expressed as distinct 3D morphology.
- **Evolution of evolvability** — the mutation rate and learning rate are themselves evolvable traits (Tokyo Type 2 open-endedness); lineages that mutate adaptively outcompete static ones.
- **Altruism & apoptosis** — cells self-sacrifice (apoptosis) to return energy to the colony; cooperation governs energy tithing to the colony pool.
- **Predation** — aggression/strength determine kill probability between organisms and colonies.
- **Group selection** — groupSelectionWeight balances individual vs colony-level fitness.
- **Species** — counted by clustering organisms whose genomes are close.

## 3D web interface

The live site renders organisms as DNA-generated 3D models (Three.js, InstancedMesh):
- Each organism's body plan (blob / segmented / star / spiral / rays), segments, limbs, color, and glow are procedurally generated from its DNA.
- Colony members are linked by bond lines; cell color encodes role (gatherer/reproducer/defender/signal).
- Tap an organism to inspect its DNA, genes, role, colony, and generation.

## Run

```bash
npm install
npm run typecheck
npm test

# Headless run, prints final stats
npm start -- --ticks 500 --population 1000

# Live 3D web interface (served by any static host / GitHub Pages)
# open index.html in a browser
```

### CLI options

| Option | Default | Description |
|--------|---------|-------------|
| `--seed` | random | PRNG seed |
| `--ticks` | 1000 | Number of ticks |
| `--width` / `--height` | 60 / 30 | World size |
| `--population` | 300 | Initial organisms |
| `--live` | true | Terminal visualization |

## Scripts

- `npm run typecheck` — TypeScript strict check
- `npm test` — test suite
- `npm start` — headless simulation

## Live site

https://billy2112.github.io/Project-DIGITAL-SPECIES/ (GitHub Pages, served from `main`)
