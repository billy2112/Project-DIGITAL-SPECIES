import { RNG } from "./rng.js";
import { World } from "./world.js";
import { Organism } from "./organism.js";
import { CellRole, Colony } from "./colony.js";
import {
  Genome,
  createRandomGenome,
  genomeDistance,
  genomeHashColor,
  crossoverGenome,
  mutateGenome,
} from "./genome.js";

export interface SimStats {
  tick: number;
  day: number;
  population: number;
  colonyCount: number;
  avgColonySize: number;
  totalBirths: number;
  totalSexualBirths: number;
  totalColonyBuds: number;
  totalDeaths: number;
  totalApoptosis: number;
  totalKills: number;
  totalColonyDeaths: number;
  totalEnergy: number;
  avgEnergy: number;
  avgAge: number;
  avgSize: number;
  avgStrength: number;
  avgAggression: number;
  avgAltruism: number;
  avgMutationRate: number;
  avgCooperation: number;
  speciesCount: number;
}

export interface SimEvent {
  type:
    | "birth"
    | "death"
    | "kill"
    | "apoptosis"
    | "colony_bud"
    | "colony_death";
  tick: number;
  organismId: number;
  colonyId?: number;
  parentId?: number;
  otherParentId?: number;
  sexual?: boolean;
  x: number;
  y: number;
  energyGained?: number;
  cellCount?: number;
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
  dayLength: number;
}

export const SIM_DEFAULTS: SimulationConfig = {
  seed: Date.now(),
  width: 100,
  height: 100,
  initialPopulation: 300,
  initialEnergy: 60,
  foodRegenRate: 0.05,
  foodMaxPerCell: 100,
  foodSpawnChance: 0.02,
  pheromoneDecay: 0.02,
  maxTicks: 10000,
  dayLength: 1000,
};

const GRID_CELL = 3;

export class Simulation {
  readonly rng: RNG;
  readonly world: World;
  readonly organisms: Organism[] = [];
  readonly colonies: Map<number, Colony> = new Map();
  readonly events: SimEvent[] = [];
  private organismColony = new Map<number, number>();
  private tick = 0;
  private totalBirths = 0;
  private totalSexualBirths = 0;
  private totalColonyBuds = 0;
  private totalDeaths = 0;
  private totalApoptosis = 0;
  private totalKills = 0;
  private totalColonyDeaths = 0;
  private nextId = 0;
  private nextColonyId = 0;
  private config: SimulationConfig;

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
    this.nextColonyId = 0;
    this.seedPopulation(this.config.initialPopulation, this.config.initialEnergy);
  }

  get currentTick(): number {
    return this.tick;
  }

  get simConfig(): SimulationConfig {
    return this.config;
  }

  get day(): number {
    return Math.floor(this.tick / this.config.dayLength) + 1;
  }

  private seedPopulation(count: number, energy: number): void {
    for (let i = 0; i < count; i++) {
      const genome = createRandomGenome(this.rng);
      const x = this.rng.range(0, this.config.width);
      const y = this.rng.range(0, this.config.height);
      const id = this.nextId++;
      const org = new Organism(id, x, y, energy, genome);
      this.organisms.push(org);
    }
  }

  private spatialGrid(alive: Organism[]): Map<string, number[]> {
    const grid = new Map<string, number[]>();
    for (let i = 0; i < alive.length; i++) {
      const o = alive[i];
      const gx = Math.floor(o.x / GRID_CELL);
      const gy = Math.floor(o.y / GRID_CELL);
      const key = `${gx},${gy}`;
      let arr = grid.get(key);
      if (!arr) { arr = []; grid.set(key, arr); }
      arr.push(i);
    }
    return grid;
  }

  private forEachNearbyOrganism(
    alive: Organism[],
    grid: Map<string, number[]>,
    x: number,
    y: number,
    range: number,
    cb: (o: Organism) => void,
  ): void {
    const r = Math.ceil(range / GRID_CELL);
    const gx = Math.floor(x / GRID_CELL);
    const gy = Math.floor(y / GRID_CELL);
    const seen = new Set<number>();
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const arr = grid.get(`${gx + dx},${gy + dy}`);
        if (!arr) continue;
        for (const idx of arr) {
          if (seen.has(idx)) continue;
          seen.add(idx);
          const o = alive[idx];
          if (Math.hypot(o.x - x, o.y - y) <= range) cb(o);
        }
      }
    }
  }

  private findColonyPartner(
    o: Organism,
    alive: Organism[],
    grid: Map<string, number[]>,
    bonded: Set<number>,
  ): Organism | null {
    const gt = o.genome.traits;
    let best: Organism | null = null;
    let bestD = 1.6;
    this.forEachNearbyOrganism(alive, grid, o.x, o.y, 1.6, (p) => {
      if (p.id === o.id || p.dead || p.colonyId !== null || bonded.has(p.id)) return;
      const pt = p.genome.traits;
      const d = Math.hypot(p.x - o.x, p.y - o.y);
      const affinity = (gt.adhesion + pt.adhesion) * 0.5;
      if (d <= 1.6 && affinity > 0.4 && d < bestD) { bestD = d; best = p; }
    });
    return best;
  }

  private getOrganismById(id: number): Organism | undefined {
    return this.organisms.find((o) => o.id === id);
  }

  step(): SimEvent[] {
    const events: SimEvent[] = [];
    const tick = this.tick;
    const alive = this.organisms.filter((o) => !o.dead);
    const grid = this.spatialGrid(alive);

    // ---- Phase A: individual perceive/think/act (free organisms) ----
    const births: { parent: Organism; child: Organism; x: number; y: number; sexual: boolean; other?: number }[] = [];
    const attacks: { attacker: Organism; victimId: number; x: number; y: number; gain: number }[] = [];

    for (const org of alive) {
      const inputs = org.perceive(this.world);
      const outputs = org.think(inputs);
      const result = org.act(outputs, this.world, this.rng);
      for (const b of result.events) {
        // individual asexual birth handled here
        const child = this.getOrganismById(b.childId);
        if (child) {
          births.push({ parent: org, child, x: b.x, y: b.y, sexual: false, other: b.parentId });
        }
      }
      // attack intents: org.act already resolved kills via world.forNearby returning victim ids -1 placeholder;
      // we handle predation separately in Phase D using aggression.
      org.learn(0);
    }

    // ---- Phase B: colony processing ----
    // Build member -> colony lookup
    const orgColony = this.organismColony;
    const coloniesByOrg = new Map<number, Colony>();
    for (const [orgId, cid] of orgColony) {
      const c = this.colonies.get(cid);
      const o = this.getOrganismById(orgId);
      if (c && o && !o.dead) coloniesByOrg.set(orgId, c);
    }

    // Energy pooling: members tithe cooperation fraction to colony pool
    const colonyGain = new Map<number, number>();
    for (const [orgId, c] of coloniesByOrg) {
      const o = this.getOrganismById(orgId)!;
      const t = o.genome.traits;
      const tithe = o.energy * t.cooperation * 0.15;
      if (tithe > 0) {
        o.energy -= tithe;
        colonyGain.set(c.id, (colonyGain.get(c.id) ?? 0) + tithe);
      }
    }
    for (const [cid, gain] of colonyGain) {
      const c = this.colonies.get(cid)!;
      c.energy += gain;
    }

    // Recompute centroids and apply role behaviors + adhesion centripetal force
    for (const c of this.colonies.values()) {
      if (c.dead || c.memberIds.length === 0) continue;
      c.recomputeCentroid((id) => {
        const o = this.getOrganismById(id);
        return o ? { x: o.x, y: o.y } : { x: c.x, y: c.y };
      });
      c.age += 1;

      const membersAlive = c.memberIds.filter((id) => {
        const o = this.getOrganismById(id);
        return o && !o.dead;
      });
      if (membersAlive.length === 0) {
        c.dead = true;
        this.totalColonyDeaths++;
        events.push({ type: "colony_death", tick: tick, colonyId: c.id, organismId: -1, x: c.x, y: c.y });
        continue;
      }

      // Determine needed roles: at least 1 reproducer, 1 gatherer if large
      const roleCounts: Record<CellRole, number> = { free:0, gatherer:0, reproducer:0, defender:0, signal:0 };
      for (const id of membersAlive) {
        const o = this.getOrganismById(id)!;
        roleCounts[o.role] = (roleCounts[o.role] ?? 0) + 1;
      }

      // Apoptosis: old/low-energy cells self-sacrifice for the colony
      for (const id of [...membersAlive]) {
        const o = this.getOrganismById(id)!;
        if (o.dead) continue;
        const t = o.genome.traits;
        const colonyNeed = c.energy < c.budThreshold() * 0.5;
        const apoptosisChance = t.apoptosisTendency * 0.02 + (o.energy <= 5 ? 0.3 : 0) + (colonyNeed ? 0.05 : 0);
        if (this.rng.random() < apoptosisChance && membersAlive.length > 2) {
          c.energy += o.energy * 0.7; // energy returned to colony
          o.energy = 0;
          o.dead = true;
          this.totalApoptosis++;
          this.totalDeaths++;
          events.push({
            type: "apoptosis", tick: tick, organismId: o.id, colonyId: c.id,
            x: o.x, y: o.y,
          });
          c.removeMember(id);
          orgColony.delete(id);
        }
      }

      // Role behaviors
      for (const id of c.memberIds) {
        const o = this.getOrganismById(id);
        if (!o || o.dead) continue;
        const t = o.genome.traits;
        const role = o.role;

        // centripetal adhesion: colony keeps members together
        const cForce = t.adhesion * 0.15;
        const dx = c.x - o.x;
        const dy = c.y - o.y;
        const d = Math.hypot(dx, dy) || 1;
        o.x += (dx / d) * cForce;
        o.y += (dy / d) * cForce;
        o.x = ((o.x % this.config.width) + this.config.width) % this.config.width;
        o.y = ((o.y % this.config.height) + this.config.height) % this.config.height;

        if (role === "reproducer" && c.energy > c.budThreshold() * 0.6 && o.energy > t.reproductionCost * 2) {
          // invest colony energy into a new cell
          const invest = t.reproductionCost * 1.5;
          if (c.energy >= invest) {
            c.energy -= invest;
            o.energy -= t.reproductionCost * 0.5;
            const child = Organism.reproduce(
              o, t.reproductionCost * 0.8, this.rng, this.nextId++, false, null, 1, c.id, "gatherer",
            );
            this.organisms.push(child);
            c.addMember(child.id, "gatherer");
            orgColony.set(child.id, c.id);
            this.totalBirths++;
            this.totalColonyBuds++;
            events.push({
              type: "birth", tick: tick, organismId: child.id, colonyId: c.id,
              parentId: o.id, sexual: false, x: child.x, y: child.y,
            });
          }
        } else if (role === "defender") {
          // attack nearby non-colony organisms
          this.forEachNearbyOrganism(alive, grid, o.x, o.y, Math.max(1, t.size * 2 + 1), (victim) => {
            if (victim.id === o.id || victim.dead) return;
            if (orgColony.has(victim.id)) return;
            const vt = victim.genome.traits;
            const killChance = t.strength * 0.5 + (t.size - Math.min(1, victim.energy / 100)) * 0.3 + t.aggression * 0.2 - vt.strength * 0.2;
            if (this.rng.random() < killChance) {
              const gain = victim.energy * 0.4;
              o.energy += gain;
              victim.dead = true;
              this.totalDeaths++;
              this.totalKills++;
              c.removeMember(victim.id);
              orgColony.delete(victim.id);
              events.push({ type: "kill", tick: tick, organismId: victim.id, colonyId: c.id, parentId: o.id, x: victim.x, y: victim.y, energyGained: gain });
            }
          });
        } else if (role === "signal") {
          const fx = Math.floor(o.x);
          const fy = Math.floor(o.y);
          this.world.depositPheromone(fx, fy, t.bioluminescence * 0.6 + 0.2);
          o.energy -= 0.2 * t.bioluminescence;
        }
      }

      // Colony-level reproduction: budding (major transition)
      if (c.energy > c.budThreshold() && membersAlive.length >= 3 && this.rng.random() < 0.03) {
        const budCells = c.budCellCount(this.rng);
        const budEnergy = c.energy * 0.4;
        c.energy -= budEnergy;
        const childColony = new Colony(this.nextColonyId++, -1, budEnergy);
        childColony.generation = c.generation + 1;
        this.colonies.set(childColony.id, childColony);
        // move members to daughter colony
        for (let i = 0; i < budCells && i < membersAlive.length; i++) {
          const id = membersAlive[i];
          const o = this.getOrganismById(id);
          if (!o) continue;
          c.removeMember(id);
          orgColony.delete(id);
          childColony.addMember(id, o.role === "free" ? "gatherer" : o.role);
          orgColony.set(id, childColony.id);
          // offset position slightly
          o.x = ((o.x + this.rng.range(-2, 2)) % this.config.width + this.config.width) % this.config.width;
          o.y = ((o.y + this.rng.range(-2, 2)) % this.config.height + this.config.height) % this.config.height;
        }
        childColony.recomputeCentroid((id) => {
          const o = this.getOrganismById(id);
          return o ? { x: o.x, y: o.y } : { x: childColony.x, y: childColony.y };
        });
        this.totalColonyBuds++;
        events.push({
          type: "colony_bud", tick: tick, colonyId: c.id, organismId: -1,
          x: childColony.x, y: childColony.y, cellCount: childColony.memberIds.length,
        });
      }
    }

    // ---- Phase C: colony formation (free organisms bond) ----
    const freeAlive = alive.filter((o) => o.colonyId === null);
    const bonded = new Set<number>();
    for (const o of freeAlive) {
      if (bonded.has(o.id) || o.dead) continue;
      const gt = o.genome.traits;
      if (gt.adhesion < 0.25) continue;
      const partner = this.findColonyPartner(o, alive, grid, bonded);
      if (partner) {
        bonded.add(o.id);
        bonded.add(partner.id);
        const colony = new Colony(this.nextColonyId++, o.id, (o.energy + partner.energy) * 0.5);
        colony.generation = Math.max(o.generation, partner.generation) + 1;
        o.energy = colony.energy;
        partner.energy = colony.energy;
        colony.addMember(o.id, gt.cellRolePreference > 0.5 ? "reproducer" : "gatherer");
        const pt = partner.genome.traits;
        colony.addMember(partner.id, pt.cellRolePreference > 0.5 ? "reproducer" : "gatherer");
        o.colonyId = colony.id;
        partner.colonyId = colony.id;
        o.role = colony.getRole(o.id);
        partner.role = colony.getRole(partner.id);
        this.colonies.set(colony.id, colony);
        this.organismColony.set(o.id, colony.id);
        this.organismColony.set(partner.id, colony.id);
      }
    }

    // ---- Phase D: individual predation (aggression-based kills between free organisms) ----
    for (let i = 0; i < alive.length; i++) {
      const a = alive[i];
      if (a.dead || a.colonyId !== null) continue;
      const ta = a.genome.traits;
      if (ta.aggression <= 0.1) continue;
      for (let j = i + 1; j < alive.length; j++) {
        const b = alive[j];
        if (b.dead || b.colonyId !== null) continue;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > Math.max(1, ta.size * 2 + 0.5)) continue;
        const tb = b.genome.traits;
        const victimSize = Math.min(1, b.energy / 100);
        const killChance = ta.strength * 0.5 + (ta.size - victimSize) * 0.3 + ta.aggression * 0.2 - tb.strength * 0.2;
        if (this.rng.random() < killChance) {
          const gain = b.energy * 0.4;
          a.energy += gain;
          b.dead = true;
          this.totalDeaths++;
          this.totalKills++;
          events.push({ type: "kill", tick: tick, organismId: b.id, parentId: a.id, x: b.x, y: b.y, energyGained: gain });
        }
      }
    }

    // ---- Phase E: individual metabolism + death ----
    const survivors: Organism[] = [];
    for (const org of alive) {
      if (org.dead) continue;
      const before = org.energy;
      org.tickMetabolism();
      const after = org.energy;
      const reward = (after - before) * 0.1;
      org.learn(reward);
      if (org.dead) {
        this.totalDeaths++;
        events.push({ type: "death", tick: tick, organismId: org.id, x: org.x, y: org.y });
      } else {
        survivors.push(org);
      }
    }
    this.organisms.length = 0;
    this.organisms.push(...survivors);

    // ---- Phase F: world processes ----
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
      if (this.organisms.length === 0 && this.colonies.size === 0) break;
    }
    return this.stats();
  }

  stats(): SimStats {
    const alive = this.organisms.filter((o) => !o.dead);
    let totalEnergy = 0, totalAge = 0, totalSize = 0, totalStrength = 0, totalAggression = 0, totalAltruism = 0;
    let totalMutationRate = 0, totalCooperation = 0;
    for (const org of alive) {
      totalEnergy += org.energy;
      totalAge += org.age;
      totalSize += org.genome.traits.size;
      totalStrength += org.genome.traits.strength;
      totalAggression += org.genome.traits.aggression;
      totalAltruism += org.genome.traits.altruism;
      totalMutationRate += org.genome.traits.evolvableMutationRate;
      totalCooperation += org.genome.traits.cooperation;
    }
    const n = alive.length;
    const colonyList = [...this.colonies.values()].filter((c) => !c.dead);
    let totalColonySize = 0;
    for (const c of colonyList) totalColonySize += c.memberIds.length;

    return {
      tick: this.tick,
      day: this.day,
      population: n,
      colonyCount: colonyList.length,
      avgColonySize: colonyList.length > 0 ? totalColonySize / colonyList.length : 0,
      totalBirths: this.totalBirths,
      totalSexualBirths: this.totalSexualBirths,
      totalColonyBuds: this.totalColonyBuds,
      totalDeaths: this.totalDeaths,
      totalApoptosis: this.totalApoptosis,
      totalKills: this.totalKills,
      totalColonyDeaths: this.totalColonyDeaths,
      totalEnergy,
      avgEnergy: n > 0 ? totalEnergy / n : 0,
      avgAge: n > 0 ? totalAge / n : 0,
      avgSize: n > 0 ? totalSize / n : 0,
      avgStrength: n > 0 ? totalStrength / n : 0,
      avgAggression: n > 0 ? totalAggression / n : 0,
      avgAltruism: n > 0 ? totalAltruism / n : 0,
      avgMutationRate: n > 0 ? totalMutationRate / n : 0,
      avgCooperation: n > 0 ? totalCooperation / n : 0,
      speciesCount: this.countSpecies(),
    };
  }

  private countSpecies(): number {
    const alive = this.organisms.filter((o) => !o.dead);
    if (alive.length === 0) return 0;
    let species = 0;
    const visited = new Set<number>();
    const THRESHOLD = 0.55;
    for (const org of alive) {
      if (visited.has(org.id)) continue;
      species++;
      const stack = [org.id];
      visited.add(org.id);
      while (stack.length) {
        const cur = stack.pop()!;
        const curOrg = this.organisms.find((o) => o.id === cur)!;
        for (const other of alive) {
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
      day: this.day,
      organisms: this.organisms.map((o) => o.getState()),
      colonies: [...this.colonies.values()].map((c) => c.getState()),
      snapshot: this.world.getSnapshot(),
    };
  }

  getOrganismColor(org: Organism): string {
    return genomeHashColor(org.genome);
  }
}
