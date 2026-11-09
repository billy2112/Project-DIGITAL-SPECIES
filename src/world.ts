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
  nutrientDecay: number;
  nutrientRegenBoost: number;
  temperatureMin: number;
  temperatureMax: number;
  lightCycleLength: number;
}

export const WORLD_DEFAULTS: WorldConfig = {
  width: 100,
  height: 100,
  foodRegenRate: 0.05,
  foodMaxPerCell: 100,
  foodSpawnChance: 0.02,
  pheromoneDecay: 0.02,
  energyRewardPerFood: 1,
  nutrientDecay: 0.01,
  nutrientRegenBoost: 0.5,
  temperatureMin: 15,
  temperatureMax: 30,
  lightCycleLength: 1000,
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
  private nutrients: Float32Array;
  private temperature: Float32Array;
  private light: Float32Array;
  private config: WorldConfig;
  private organismIdCounter = 0;
  private dayPhase = 0;

  constructor(config: Partial<WorldConfig> = {}, rng?: RNG) {
    this.config = { ...WORLD_DEFAULTS, ...config };
    this.width = this.config.width;
    this.height = this.config.height;
    const size = this.width * this.height;
    this.food = new Float32Array(size);
    this.pheromone = new Float32Array(size);
    this.nutrients = new Float32Array(size);
    this.temperature = new Float32Array(size);
    this.light = new Float32Array(size);
    const r = rng ?? new RNG(Date.now());
    for (let i = 0; i < size; i++) {
      this.food[i] = r.random() * this.config.foodMaxPerCell;
      const y = i / this.width;
      this.temperature[i] =
        this.config.temperatureMin +
        (this.config.temperatureMax - this.config.temperatureMin) *
          (0.5 + 0.5 * Math.sin((y * Math.PI) / this.height));
      this.light[i] = 0.5;
    }
  }

  idx(x: number, y: number): number {
    const xi = Math.floor(((x % this.width) + this.width) % this.width);
    const yi = Math.floor(((y % this.height) + this.height) % this.height);
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

  nutrientsAt(x: number, y: number): number {
    return this.nutrients[this.idx(x, y)];
  }

  decompose(x: number, y: number, amount: number): void {
    const i = this.idx(x, y);
    this.nutrients[i] = Math.min(
      this.config.foodMaxPerCell * 2,
      this.nutrients[i] + amount,
    );
  }

  absorbNutrients(x: number, y: number, amount: number): number {
    const i = this.idx(x, y);
    const available = this.nutrients[i];
    const take = Math.min(available, amount);
    this.nutrients[i] = Math.max(0, available - take);
    return take;
  }

  decayNutrients(): void {
    const size = this.width * this.height;
    for (let i = 0; i < size; i++) {
      this.nutrients[i] *= 1 - this.config.nutrientDecay;
      if (this.nutrients[i] < 0.001) this.nutrients[i] = 0;
    }
  }

  temperatureAt(x: number, y: number): number {
    return this.temperature[this.idx(x, y)];
  }

  lightAt(x: number, y: number): number {
    return this.light[this.idx(x, y)];
  }

  updateEnvironment(tick: number): void {
    const phase = (tick % this.config.lightCycleLength) / this.config.lightCycleLength;
    this.dayPhase = phase;
    const lightLevel = 0.5 + 0.5 * Math.sin((phase - 0.25) * 2 * Math.PI);
    const size = this.width * this.height;
    for (let i = 0; i < size; i++) {
      this.light[i] = Math.max(0, Math.min(1, lightLevel));
    }
  }

  regenerateFood(rng: RNG): void {
    const size = this.width * this.height;
    for (let i = 0; i < size; i++) {
      const nutrientBoost = this.nutrients[i] * this.config.nutrientRegenBoost;
      if (this.food[i] < this.config.foodMaxPerCell) {
        this.food[i] += this.config.foodRegenRate + nutrientBoost;
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

  getSnapshot(): {
    food: Float32Array;
    pheromone: Float32Array;
    nutrients: Float32Array;
    temperature: Float32Array;
    light: Float32Array;
  } {
    return {
      food: new Float32Array(this.food),
      pheromone: new Float32Array(this.pheromone),
      nutrients: new Float32Array(this.nutrients),
      temperature: new Float32Array(this.temperature),
      light: new Float32Array(this.light),
    };
  }

  // ---- Serialization ----

  serialize(): {
    width: number;
    height: number;
    config: WorldConfig;
    food: number[];
    pheromone: number[];
    nutrients: number[];
    temperature: number[];
    light: number[];
    dayPhase: number;
  } {
    return {
      width: this.width,
      height: this.height,
      config: { ...this.config },
      food: Array.from(this.food),
      pheromone: Array.from(this.pheromone),
      nutrients: Array.from(this.nutrients),
      temperature: Array.from(this.temperature),
      light: Array.from(this.light),
      dayPhase: this.dayPhase,
    };
  }

  static deserialize(data: {
    width: number;
    height: number;
    config: WorldConfig;
    food: number[];
    pheromone: number[];
    nutrients: number[];
    temperature: number[];
    light: number[];
    dayPhase: number;
  }): World {
    const world = new World(data.config);
    world.width = data.width;
    world.height = data.height;
    for (let i = 0; i < data.food.length; i++) {
      world.food[i] = data.food[i];
      world.pheromone[i] = data.pheromone[i];
      world.nutrients[i] = data.nutrients[i];
      world.temperature[i] = data.temperature[i];
      world.light[i] = data.light[i];
    }
    world.dayPhase = data.dayPhase;
    return world;
  }
}
