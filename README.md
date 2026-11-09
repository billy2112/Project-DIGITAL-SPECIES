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

## How it works

- A 2D toroidal world regenerates food and diffuses pheromones.
- Each tick every organism perceives its environment, runs its neural brain, acts,
  pays metabolism, and learns from the energy reward.
- Organisms reproduce asexually when energy is high; the child genome is mutated
  (weights + traits), so lineages diverge and new species emerge.
- Species are counted by clustering organisms whose genomes are close.

## Run

```bash
npm install
npm run typecheck
npm test

# Headless run, prints final stats
npm start -- --ticks 500 --population 1000

# Live terminal visualization
npm run sim
```

### CLI options

| Option | Default | Description |
|--------|---------|-------------|
| `--seed` | random | PRNG seed |
| `--ticks` | 1000 | Number of ticks |
| `--width` / `--height` | 60 / 30 | World size |
| `--population` | 300 | Initial organisms |
| `--live` | true | Terminal visualization |

## Legend (live view)

`, . *` = food (low → high)   `. : O @` = organism (weak → strong)   `~` = pheromone

## Scripts

- `npm run typecheck` — TypeScript strict check
- `npm test` — test suite
- `npm start` — headless simulation
- `npm run sim` — live terminal visualization
