import { RNG } from "./rng.js";
import { World } from "./world.js";
import { Organism } from "./organism.js";
import { Genome, createRandomGenome, genomeDistance } from "./genome.js";

export interface SimStats {
  tick: number;
  population: number;
  totalBirths: number;
  totalDeaths: number;
  totalEnergy: number;
  avgEnergy: number;
  avgAge: number;
  speciesCount: number;
}

export interface SimEvent {
  type: "birth" | "death";
  tick: number;
  organismId: number;
  parentId?: number;
  x: number;
  y: number;
}

export interface SimulationConfig {
  seed: number;
  width: number;
  height: number;
  initialPopulation: number;
  initialEnergy: number;
  foodRegenRate: number;
  foodMaxPerCell: number;
  foodSpawnChance: number;
  pheromoneDecay: number;
  maxTicks: number;
}

export const SIM_DEFAULTS: SimulationConfig = {
  seed: Date.now(),
  width: 100,
  height: 100,
  initialPopulation: 500,
  initialEnergy: 60,
  foodRegenRate: 0.05,
  foodMaxPerCell: 100,
  foodSpawnChance: 0.02,
  pheromoneDecay: 0.02,
  maxTicks: 10000,
};

export class Simulation {
  readonly rng: RNG;
  readonly world: World;
  readonly organisms: Organism[] = [];
  readonly events: SimEvent[] = [];
  private tick = 0;
  private totalBirths = 0;
  private totalDeaths = 0;
  private nextId = 0;
  private config: SimulationConfig;
  private gridOrg: Map<number, number[]> = new Map();

  get currentTick(): number {
    return this.tick;
  }

  get simConfig(): SimulationConfig {
    return this.config;
  }

  constructor(config: Partial<SimulationConfig> = {}) {
    this.config = { ...SIM_DEFAULTS, ...config };
    this.rng = new RNG(this.config.seed);
    this.world = new World({
      width: this.config.width,
      height: this.config.height,
      foodRegenRate: this.config.foodRegenRate,
      foodMaxPerCell: this.config.foodMaxPerCell,
      foodSpawnChance: this.config.foodSpawnChance,
      pheromoneDecay: this.config.pheromoneDecay,
    });
    this.nextId = 0;
    this.seedPopulation(this.config.initialPopulation, this.config.initialEnergy);
  }

  private seedPopulation(count: number, energy: number): void {
    for (let i = 0; i < count; i++) {
      const genome = createRandomGenome(this.rng);
      const x = this.rng.range(0, this.config.width);
      const y = this.rng.range(0, this.config.height);
      const id = this.nextId++;
      const org = new Organism(id, x, y, energy, genome);
      this.organisms.push(org);
      this.world.addOrganism(org);
    }
  }

  step(): SimEvent[] {
    const events: SimEvent[] = [];
    const t = this.tick;

    // Perceive + think + act for each alive organism
    for (const org of this.organisms) {
      if (org.dead) continue;
      const inputs = org.perceive(this.world);
      const outputs = org.think(inputs);
      const births = org.act(outputs, this.world, this.rng);
      for (const b of births) {
        this.totalBirths++;
        events.push({
          type: "birth",
          tick: t,
          organismId: b.childId,
          parentId: b.parentId,
          x: b.x,
          y: b.y,
        });
      }
      // reward signal: energy change will be computed after metabolism
      org.learn(0);
    }

    // Metabolism + death
    const survivors: Organism[] = [];
    for (const org of this.organisms) {
      if (org.dead) continue;
      const before = org.energy;
      org.tickMetabolism();
      const after = org.energy;
      const reward = (after - before) * 0.1;
      org.learn(reward);

      if (org.dead) {
        this.totalDeaths++;
        events.push({
          type: "death",
          tick: t,
          organismId: org.id,
          x: org.x,
          y: org.y,
        });
      } else {
        survivors.push(org);
      }
    }
    this.organisms.length = 0;
    this.organisms.push(...survivors);

    // World processes
    this.world.regenerateFood(this.rng);
    this.world.decayPheromones();

    this.tick++;
    return events;
  }

  run(maxTicks?: number, onEvent?: (ev: SimEvent) => void): SimStats {
    const ticks = maxTicks ?? this.config.maxTicks;
    for (let i = 0; i < ticks; i++) {
      const events = this.step();
      for (const ev of events) {
        onEvent?.(ev);
      }
      if (this.organisms.length === 0) break;
    }
    return this.stats();
  }

  stats(): SimStats {
    let totalEnergy = 0;
    let totalAge = 0;
    for (const org of this.organisms) {
      totalEnergy += org.energy;
      totalAge += org.age;
    }
    const n = this.organisms.length;
    return {
      tick: this.tick,
      population: n,
      totalBirths: this.totalBirths,
      totalDeaths: this.totalDeaths,
      totalEnergy,
      avgEnergy: n > 0 ? totalEnergy / n : 0,
      avgAge: n > 0 ? totalAge / n : 0,
      speciesCount: this.countSpecies(),
    };
  }

  private countSpecies(): number {
    if (this.organisms.length === 0) return 0;
    let species = 0;
    const visited = new Set<number>();
    const THRESHOLD = 0.5;
    for (const org of this.organisms) {
      if (visited.has(org.id)) continue;
      species++;
      const stack = [org.id];
      visited.add(org.id);
      while (stack.length) {
        const cur = stack.pop()!;
        const curOrg = this.organisms.find((o) => o.id === cur)!;
        for (const other of this.organisms) {
          if (visited.has(other.id)) continue;
          if (genomeDistance(curOrg.genome, other.genome) < THRESHOLD) {
            visited.add(other.id);
            stack.push(other.id);
          }
        }
      }
    }
    return species;
  }

  getState() {
    return {
      tick: this.tick,
      organisms: this.organisms.map((o) => o.getState()),
      snapshot: this.world.getSnapshot(),
    };
  }
}