import { RNG, clamp } from "./rng.js";
import { Genome, DEFAULT_LAYOUT, BrainLayout } from "./genome.js";
import { Brain } from "./brain.js";
import { World } from "./world.js";
import { mutateGenome, crossoverGenome, serializeGenome, deserializeGenome } from "./genome.js";
import { CellRole } from "./colony.js";

export interface Percept {
  inputs: Float32Array;
  energy: number;
}

export interface OrganismState {
  id: number;
  x: number;
  y: number;
  energy: number;
  age: number;
  maxAge: number;
  generation: number;
  dead: boolean;
  genome: Genome;
  parentId: number | null;
  colonyId: number | null;
  role: CellRole;
  size: number;
  strength: number;
}

export interface ReproductionEvent {
  parentId: number;
  childId: number;
  x: number;
  y: number;
  sexual: boolean;
  otherParentId?: number;
}

export interface AttackEvent {
  attackerId: number;
  victimId: number;
  x: number;
  y: number;
  energyGained: number;
}

export class Organism {
  readonly id: number;
  x: number;
  y: number;
  energy: number;
  age = 0;
  generation = 1;
  dead = false;
  readonly genome: Genome;
  readonly brain: Brain;
  readonly memory: Float32Array;
  readonly parentId: number | null;
  colonyId: number | null = null;
  role: CellRole = "free";
  private memoryCount = 0;
  private memoryWriteIdx = 0;
  private lastPercept: Float32Array | null = null;
  private lastOutput: Float32Array | null = null;

  constructor(
    id: number,
    x: number,
    y: number,
    energy: number,
    genome: Genome,
    parentId: number | null = null,
    generation = 1,
    colonyId: number | null = null,
    role: CellRole = "free",
    layout: BrainLayout = DEFAULT_LAYOUT,
  ) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.energy = energy;
    this.genome = genome;
    this.parentId = parentId;
    this.generation = generation;
    this.colonyId = colonyId ?? null;
    this.role = role ?? "free";
    this.brain = new Brain(genome, layout);
    this.memory = new Float32Array(Math.max(1, genome.traits.memoryCapacity));
  }

  perceive(world: World): Float32Array {
    const t = this.genome.traits;
    const vision = t.visionRange;
    const maxE = 200;
    const maxFood = 100;

    const fx = Math.floor(this.x);
    const fy = Math.floor(this.y);
    const cellFood = world.foodAt(fx, fy) / maxFood;

    let foodVision = 0;
    let nearestFoodDist = Infinity;
    let nearestFoodDx = 0;
    let nearestFoodDy = 0;
    let orgVision = 0;
    let nearestOrgDist = Infinity;
    let nearestOrgDx = 0;
    let nearestOrgDy = 0;
    let nearestOrgEnergy = 0;
    let nearestOrgSize = 0;

    world.forNearby(
      this.x,
      this.y,
      vision,
      (ox, oy, kind, energy) => {
        const dx = ox - this.x;
        const dy = oy - this.y;
        const d = Math.hypot(dx, dy);
        if (kind === "food") {
          foodVision += 1;
          if (d < nearestFoodDist) {
            nearestFoodDist = d;
            nearestFoodDx = dx / Math.max(1, vision);
            nearestFoodDy = dy / Math.max(1, vision);
          }
        } else if (kind === "organism") {
          orgVision += 1;
          if (d < nearestOrgDist && d > 0.5) {
            nearestOrgDist = d;
            nearestOrgDx = dx / Math.max(1, vision);
            nearestOrgDy = dy / Math.max(1, vision);
            nearestOrgEnergy = energy / maxE;
            nearestOrgSize = Math.min(1, energy / 100);
          }
        }
      },
    );

    const area = Math.PI * vision * vision;
    const inputs = new Float32Array(16);
    inputs[0] = clamp(this.energy / maxE, 0, 1);
    inputs[1] = clamp(this.age / t.maxAge, 0, 1);
    inputs[2] = clamp(cellFood, 0, 1);
    inputs[3] = clamp(foodVision / Math.max(1, area / 4), 0, 1);
    inputs[4] = nearestFoodDx;
    inputs[5] = nearestFoodDy;
    inputs[6] = nearestOrgDx;
    inputs[7] = nearestOrgDy;
    inputs[8] = nearestOrgEnergy;
    inputs[9] = clamp(orgVision / Math.max(1, area / 4), 0, 1);
    inputs[10] = this.memoryMean();
    inputs[11] = world.pheromoneAt(fx, fy);
    inputs[12] = nearestOrgSize;
    inputs[13] = t.bioluminescence;
    inputs[14] = clamp((world.temperatureAt(this.x, this.y) - 15) / 15, 0, 1);
    inputs[15] = world.lightAt(this.x, this.y);

    this.lastPercept = inputs;
    return inputs;
  }

  think(inputs: Float32Array): Float32Array {
    const out = new Float32Array(8);
    this.brain.forward(inputs, out);
    this.lastOutput = out;
    return out;
  }

  act(
    outputs: Float32Array,
    world: World,
    rng: RNG,
  ): { events: ReproductionEvent[]; attacks: AttackEvent[] } {
    const t = this.genome.traits;
    const events: ReproductionEvent[] = [];
    const attacks: AttackEvent[] = [];

    const dx = outputs[0];
    const dy = outputs[1];
    const consume = outputs[2];
    const reproduce = outputs[3];
    const signal = outputs[4];
    const memoryWrite = outputs[5];
    const attack = outputs[6];
    const light = outputs[7];

    const moveDist = Math.hypot(dx, dy) * t.speed;
    const nx = this.clampPos(this.x + dx * t.speed, world.width);
    const ny = this.clampPos(this.y + dy * t.speed, world.height);
    this.energy -= t.moveCost * moveDist * (0.5 + t.size);
    this.x = nx;
    this.y = ny;

    if (light > 0.5) {
      const fx = Math.floor(this.x);
      const fy = Math.floor(this.y);
      world.depositPheromone(fx, fy, t.bioluminescence * 0.5);
      this.energy -= 0.3 * t.bioluminescence;
    }

    if (consume > 0.2) {
      const fx = Math.floor(this.x);
      const fy = Math.floor(this.y);
      const available = world.foodAt(fx, fy);
      const eat = Math.min(available, consume * 30);
      if (eat > 0) {
        world.consumeFood(fx, fy, eat);
        this.energy += eat * 0.8;
      }
      // Absorb nutrients from decomposition at this cell
      const nAvailable = world.nutrientsAt(fx, fy);
      const nTake = Math.min(nAvailable, consume * 10);
      if (nTake > 0) {
        world.absorbNutrients(fx, fy, nTake);
        this.energy += nTake * 0.6;
      }
    }

    if (memoryWrite > 0.5) {
      this.memoryWrite(clamp(this.energy / 200, 0, 1));
    }

    if (attack > 0.6) {
      world.forNearby(
        this.x,
        this.y,
        Math.max(1, t.size * 2),
        (ox, oy, kind, energy) => {
          if (kind === "organism") {
            const d = Math.hypot(ox - this.x, oy - this.y);
            if (d < 1.2 && energy > 0) {
              const victimSize = Math.min(1, energy / 100);
              const killChance =
                t.strength * 0.6 +
                (t.size - victimSize) * 0.3 +
                t.aggression * 0.1;
              if (rng.random() < killChance) {
                const gain = energy * 0.5;
                this.energy += gain;
                attacks.push({
                  attackerId: this.id,
                  victimId: -1,
                  x: ox,
                  y: oy,
                  energyGained: gain,
                });
              }
            }
          }
        },
      );
    }

    if (
      reproduce > 0.8 &&
      this.energy > t.reproductionThreshold &&
      this.age > 50
    ) {
      const childEnergy = t.reproductionCost;
      this.energy -= childEnergy;
      const child = Organism.reproduce(
        this,
        childEnergy,
        rng,
        world.nextOrganismId(),
        false,
      );
      world.addOrganism(child);
      const cx = this.clampPos(
        this.x + rng.range(-1, 1),
        world.width,
      );
      const cy = this.clampPos(
        this.y + rng.range(-1, 1),
        world.height,
      );
      child.x = cx;
      child.y = cy;
      events.push({
        parentId: this.id,
        childId: child.id,
        x: cx,
        y: cy,
        sexual: false,
      });
    }

    return { events, attacks };
  }

  tickMetabolism(world: World | null = null): void {
    const t = this.genome.traits;
    const sizePenalty = t.size * 0.1;
    // Temperature stress: deviating from optimal (22.5) raises maintenance cost
    let tempMultiplier = 1;
    if (world) {
      const temp = world.temperatureAt(this.x, this.y);
      const optimal = 22.5;
      const tolerance = 7.5;
      const stress = Math.max(0, Math.abs(temp - optimal) - tolerance) / tolerance;
      tempMultiplier = 1 + stress * 0.5;
    }
    tempMultiplier = Math.min(Math.max(tempMultiplier, 0), 5);
    this.energy -=
      (t.baseMaintenance + t.thinkCost * this.brain.hidden + sizePenalty) *
      tempMultiplier;
    if (!Number.isFinite(this.energy) || this.energy < 0) this.energy = 0;
    this.age += 1;
    if (this.energy <= 0 || this.age >= t.maxAge) {
      this.dead = true;
    }
  }

  learn(reward: number): void {
    if (!this.lastPercept || !this.lastOutput) return;
    const t = this.genome.traits;
    this.brain.hebbianLearn(
      this.lastPercept,
      this.lastOutput,
      reward,
      t.mutationRate * 0.5 + 0.01,
      0.0005,
    );
  }

  private memoryMean(): number {
    if (this.memoryCount === 0) return 0;
    let s = 0;
    for (let i = 0; i < this.memoryCount; i++) s += this.memory[i];
    return s / this.memoryCount;
  }

  private memoryWrite(value: number): void {
    const cap = this.memory.length;
    this.memory[this.memoryWriteIdx] = value;
    this.memoryWriteIdx = (this.memoryWriteIdx + 1) % cap;
    if (this.memoryCount < cap) this.memoryCount++;
  }

  private clampPos(v: number, limit: number): number {
    if (!Number.isFinite(v)) return 0;
    return ((v % limit) + limit) % limit;
  }

  static reproduce(
    parent: Organism,
    childEnergy: number,
    rng: RNG,
    childId: number,
    sexual = false,
    otherParent: Organism | null = null,
    generationOffset = 1,
    colonyId: number | null = null,
    role: CellRole = "free",
  ): Organism {
    let childGenome: Genome;
    if (sexual && otherParent) {
      childGenome = crossoverGenome(parent.genome, otherParent.genome, rng);
      childGenome = mutateGenome(childGenome, rng);
    } else {
      childGenome = mutateGenome(parent.genome, rng);
    }
    const generation =
      Math.max(parent.generation, otherParent?.generation ?? 0) +
      generationOffset;
    return new Organism(
      childId,
      parent.x,
      parent.y,
      childEnergy,
      childGenome,
      parent.id,
      generation,
      colonyId,
      role,
      DEFAULT_LAYOUT,
    );
  }

  static sexualReproduce(
    a: Organism,
    b: Organism,
    rng: RNG,
    childId: number,
    colonyId: number | null = null,
    role: CellRole = "free",
  ): Organism {
    const childEnergy = (a.genome.traits.reproductionCost +
      b.genome.traits.reproductionCost) *
      0.5;
    const child = Organism.reproduce(
      a,
      childEnergy,
      rng,
      childId,
      true,
      b,
      1,
      colonyId,
      role,
    );
    return child;
  }

  getState(): OrganismState {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      energy: this.energy,
      age: this.age,
      maxAge: this.genome.traits.maxAge,
      generation: this.generation,
      dead: this.dead,
      genome: this.genome,
      parentId: this.parentId,
      colonyId: this.colonyId,
      role: this.role,
      size: this.genome.traits.size,
      strength: this.genome.traits.strength,
    };
  }

  // ---- Serialization ----

  serialize(): {
    id: number;
    x: number;
    y: number;
    energy: number;
    age: number;
    generation: number;
    dead: boolean;
    parentId: number | null;
    colonyId: number | null;
    role: CellRole;
    genome: GenomeJSON;
    memory: number[];
  } {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      energy: this.energy,
      age: this.age,
      generation: this.generation,
      dead: this.dead,
      parentId: this.parentId,
      colonyId: this.colonyId,
      role: this.role,
      genome: serializeGenome(this.genome),
      memory: Array.from(this.memory),
    };
  }

  static deserialize(data: {
    id: number;
    x: number;
    y: number;
    energy: number;
    age: number;
    generation: number;
    dead: boolean;
    parentId: number | null;
    colonyId: number | null;
    role: CellRole;
    genome: GenomeJSON;
    memory: number[];
  }): Organism {
    const genome = deserializeGenome(data.genome);
    const org = new Organism(
      data.id,
      data.x,
      data.y,
      data.energy,
      genome,
      data.parentId,
      data.generation,
      data.colonyId,
      data.role,
      DEFAULT_LAYOUT
    );
    org.age = data.age;
    org.dead = data.dead;
    org.memory = new Float32Array(data.memory);
    return org;
  }
}
