import { RNG } from "./rng.js";
import type { Organism } from "./organism.js";

export interface WorldConfig {
  width: number;
  height: number;
  foodRegenRate: number;
  foodMaxPerCell: number;
  foodSpawnChance: number;
  pheromoneDecay: number;
  energyRewardPerFood: number;
}

export const WORLD_DEFAULTS: WorldConfig = {
  width: 100,
  height: 100,
  foodRegenRate: 0.05,
  foodMaxPerCell: 100,
  foodSpawnChance: 0.02,
  pheromoneDecay: 0.02,
  energyRewardPerFood: 1,
};

export type CellKind = "empty" | "food" | "organism";

export interface NearbyEntry {
  x: number;
  y: number;
  kind: CellKind;
  energy: number;
}

export class World {
  readonly width: number;
  readonly height: number;
  private food: Float32Array;
  private pheromone: Float32Array;
  private config: WorldConfig;
  private organismIdCounter = 0;

  constructor(config: Partial<WorldConfig> = {}) {
    this.config = { ...WORLD_DEFAULTS, ...config };
    this.width = this.config.width;
    this.height = this.config.height;
    const size = this.width * this.height;
    this.food = new Float32Array(size);
    this.pheromone = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      this.food[i] = Math.random() * this.config.foodMaxPerCell;
    }
  }

  idx(x: number, y: number): number {
    const xi = ((x % this.width) + this.width) % this.width;
    const yi = ((y % this.height) + this.height) % this.height;
    return yi * this.width + xi;
  }

  foodAt(x: number, y: number): number {
    return this.food[this.idx(x, y)];
  }

  consumeFood(x: number, y: number, amount: number): number {
    const i = this.idx(x, y);
    const available = this.food[i];
    const take = Math.min(available, amount);
    this.food[i] = Math.max(0, available - take);
    return take;
  }

  pheromoneAt(x: number, y: number): number {
    return this.pheromone[this.idx(x, y)];
  }

  depositPheromone(x: number, y: number, amount: number): void {
    const i = this.idx(x, y);
    this.pheromone[i] = Math.min(1, this.pheromone[i] + amount);
  }

  regenerateFood(rng: RNG): void {
    const size = this.width * this.height;
    for (let i = 0; i < size; i++) {
      if (this.food[i] < this.config.foodMaxPerCell) {
        this.food[i] += this.config.foodRegenRate;
        if (this.food[i] > this.config.foodMaxPerCell) {
          this.food[i] = this.config.foodMaxPerCell;
        }
      }
      if (rng.random() < this.config.foodSpawnChance) {
        this.food[i] = Math.min(
          this.config.foodMaxPerCell,
          this.food[i] + rng.range(1, 20),
        );
      }
    }
  }

  decayPheromones(): void {
    const size = this.width * this.height;
    for (let i = 0; i < size; i++) {
      this.pheromone[i] *= 1 - this.config.pheromoneDecay;
      if (this.pheromone[i] < 0.001) this.pheromone[i] = 0;
    }
  }

  forNearby(
    x: number,
    y: number,
    range: number,
    cb: (ox: number, oy: number, kind: CellKind, energy: number) => void,
  ): void {
    const r = Math.floor(range);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        const d = Math.hypot(dx, dy);
        if (d > range) continue;
        const i = this.idx(nx, ny);
        if (this.food[i] > 0) {
          cb(nx, ny, "food", this.food[i]);
        }
      }
    }
  }

  nextOrganismId(): number {
    return ++this.organismIdCounter;
  }

  addOrganism(org: Organism): void {
    // placeholder; simulation owns the organism list
  }

  getSnapshot(): { food: Float32Array; pheromone: Float32Array } {
    return {
      food: new Float32Array(this.food),
      pheromone: new Float32Array(this.pheromone),
    };
  }
}
