import { RNG } from "./rng.js";
import { World } from "./world.js";
import { Organism } from "./organism.js";
import { createRandomGenome, genomeDistance, genomeHashColor, } from "./genome.js";
export const SIM_DEFAULTS = {
    seed: Date.now(),
    width: 100,
    height: 100,
    initialPopulation: 400,
    initialEnergy: 60,
    foodRegenRate: 0.05,
    foodMaxPerCell: 100,
    foodSpawnChance: 0.02,
    pheromoneDecay: 0.02,
    maxTicks: 10000,
    dayLength: 1000,
};
export class Simulation {
    rng;
    world;
    organisms = [];
    events = [];
    tick = 0;
    totalBirths = 0;
    totalSexualBirths = 0;
    totalDeaths = 0;
    totalKills = 0;
    nextId = 0;
    config;
    gridOrg = new Map();
    constructor(config = {}) {
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
    get currentTick() {
        return this.tick;
    }
    get simConfig() {
        return this.config;
    }
    get day() {
        return Math.floor(this.tick / this.config.dayLength) + 1;
    }
    seedPopulation(count, energy) {
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
    step() {
        const events = [];
        const t = this.tick;
        // Perceive + think + act for each alive organism
        for (const org of this.organisms) {
            if (org.dead)
                continue;
            const inputs = org.perceive(this.world);
            const outputs = org.think(inputs);
            const result = org.act(outputs, this.world, this.rng);
            for (const b of result.events) {
                this.totalBirths++;
                if (b.sexual)
                    this.totalSexualBirths++;
                events.push({
                    type: "birth",
                    tick: t,
                    organismId: b.childId,
                    parentId: b.parentId,
                    otherParentId: b.otherParentId,
                    sexual: b.sexual,
                    x: b.x,
                    y: b.y,
                });
            }
            org.learn(0);
        }
        // Sexual reproduction: pairs nearby with high energy
        const alive = this.organisms.filter((o) => !o.dead);
        for (let i = 0; i < alive.length; i++) {
            const a = alive[i];
            if (a.dead)
                continue;
            const ta = a.genome.traits;
            if (a.energy < ta.reproductionThreshold * 1.3 || a.age < 80)
                continue;
            for (let j = i + 1; j < alive.length; j++) {
                const b = alive[j];
                if (b.dead)
                    continue;
                const tb = b.genome.traits;
                if (b.energy < tb.reproductionThreshold * 1.3 || b.age < 80)
                    continue;
                const d = Math.hypot(a.x - b.x, a.y - b.y);
                if (d < 1.5) {
                    const childEnergy = (ta.reproductionCost + tb.reproductionCost) * 0.5;
                    a.energy -= childEnergy * 0.5;
                    b.energy -= childEnergy * 0.5;
                    const child = Organism.sexualReproduce(a, b, this.rng, this.nextId++);
                    this.organisms.push(child);
                    this.world.addOrganism(child);
                    this.totalBirths++;
                    this.totalSexualBirths++;
                    events.push({
                        type: "birth",
                        tick: t,
                        organismId: child.id,
                        parentId: a.id,
                        otherParentId: b.id,
                        sexual: true,
                        x: child.x,
                        y: child.y,
                    });
                    i = j; // skip b this round
                    break;
                }
            }
        }
        // Predation / attack resolution
        for (let i = 0; i < alive.length; i++) {
            const a = alive[i];
            if (a.dead)
                continue;
            const ta = a.genome.traits;
            if (ta.aggression <= 0.1)
                continue;
            for (let j = i + 1; j < alive.length; j++) {
                const b = alive[j];
                if (b.dead)
                    continue;
                const d = Math.hypot(a.x - b.x, a.y - b.y);
                if (d > Math.max(1, ta.size * 2 + 0.5))
                    continue;
                const tb = b.genome.traits;
                const victimSize = Math.min(1, b.energy / 100);
                const killChance = ta.strength * 0.5 +
                    (ta.size - victimSize) * 0.3 +
                    ta.aggression * 0.2 -
                    tb.strength * 0.2;
                if (this.rng.random() < killChance) {
                    const gain = b.energy * 0.4;
                    a.energy += gain;
                    b.dead = true;
                    this.totalDeaths++;
                    this.totalKills++;
                    events.push({
                        type: "kill",
                        tick: t,
                        organismId: b.id,
                        parentId: a.id,
                        x: b.x,
                        y: b.y,
                        energyGained: gain,
                    });
                }
            }
        }
        // Metabolism + death
        const survivors = [];
        for (const org of this.organisms) {
            if (org.dead)
                continue;
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
            }
            else {
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
    run(maxTicks, onEvent) {
        const ticks = maxTicks ?? this.config.maxTicks;
        for (let i = 0; i < ticks; i++) {
            const events = this.step();
            for (const ev of events) {
                onEvent?.(ev);
            }
            if (this.organisms.length === 0)
                break;
        }
        return this.stats();
    }
    stats() {
        let totalEnergy = 0;
        let totalAge = 0;
        let totalSize = 0;
        let totalStrength = 0;
        let totalAggression = 0;
        let totalAltruism = 0;
        for (const org of this.organisms) {
            totalEnergy += org.energy;
            totalAge += org.age;
            totalSize += org.genome.traits.size;
            totalStrength += org.genome.traits.strength;
            totalAggression += org.genome.traits.aggression;
            totalAltruism += org.genome.traits.altruism;
        }
        const n = this.organisms.length;
        return {
            tick: this.tick,
            population: n,
            totalBirths: this.totalBirths,
            totalSexualBirths: this.totalSexualBirths,
            totalDeaths: this.totalDeaths,
            totalKills: this.totalKills,
            totalEnergy,
            avgEnergy: n > 0 ? totalEnergy / n : 0,
            avgAge: n > 0 ? totalAge / n : 0,
            avgSize: n > 0 ? totalSize / n : 0,
            avgStrength: n > 0 ? totalStrength / n : 0,
            avgAggression: n > 0 ? totalAggression / n : 0,
            avgAltruism: n > 0 ? totalAltruism / n : 0,
            speciesCount: this.countSpecies(),
            day: this.day,
        };
    }
    countSpecies() {
        if (this.organisms.length === 0)
            return 0;
        let species = 0;
        const visited = new Set();
        const THRESHOLD = 0.55;
        for (const org of this.organisms) {
            if (visited.has(org.id))
                continue;
            species++;
            const stack = [org.id];
            visited.add(org.id);
            while (stack.length) {
                const cur = stack.pop();
                const curOrg = this.organisms.find((o) => o.id === cur);
                for (const other of this.organisms) {
                    if (visited.has(other.id))
                        continue;
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
            snapshot: this.world.getSnapshot(),
        };
    }
    getOrganismColor(org) {
        return genomeHashColor(org.genome);
    }
}
