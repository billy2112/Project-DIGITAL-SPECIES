import { clamp } from "./rng.js";
import { DEFAULT_LAYOUT } from "./genome.js";
import { Brain } from "./brain.js";
import { mutateGenome, crossoverGenome } from "./genome.js";
export class Organism {
    id;
    x;
    y;
    energy;
    age = 0;
    generation = 1;
    dead = false;
    genome;
    brain;
    memory;
    parentId;
    colonyId = null;
    role = "free";
    memoryCount = 0;
    memoryWriteIdx = 0;
    lastPercept = null;
    lastOutput = null;
    constructor(id, x, y, energy, genome, parentId = null, generation = 1, colonyId = null, role = "free", layout = DEFAULT_LAYOUT) {
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
    perceive(world) {
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
        world.forNearby(this.x, this.y, vision, (ox, oy, kind, energy) => {
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
            }
            else if (kind === "organism") {
                orgVision += 1;
                if (d < nearestOrgDist && d > 0.5) {
                    nearestOrgDist = d;
                    nearestOrgDx = dx / Math.max(1, vision);
                    nearestOrgDy = dy / Math.max(1, vision);
                    nearestOrgEnergy = energy / maxE;
                    nearestOrgSize = Math.min(1, energy / 100);
                }
            }
        });
        const area = Math.PI * vision * vision;
        const inputs = new Float32Array(14);
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
        this.lastPercept = inputs;
        return inputs;
    }
    think(inputs) {
        const out = new Float32Array(8);
        this.brain.forward(inputs, out);
        this.lastOutput = out;
        return out;
    }
    act(outputs, world, rng) {
        const t = this.genome.traits;
        const events = [];
        const attacks = [];
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
        }
        if (memoryWrite > 0.5) {
            this.memoryWrite(clamp(this.energy / 200, 0, 1));
        }
        if (attack > 0.6) {
            world.forNearby(this.x, this.y, Math.max(1, t.size * 2), (ox, oy, kind, energy) => {
                if (kind === "organism") {
                    const d = Math.hypot(ox - this.x, oy - this.y);
                    if (d < 1.2 && energy > 0) {
                        const victimSize = Math.min(1, energy / 100);
                        const killChance = t.strength * 0.6 +
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
            });
        }
        if (reproduce > 0.8 &&
            this.energy > t.reproductionThreshold &&
            this.age > 50) {
            const childEnergy = t.reproductionCost;
            this.energy -= childEnergy;
            const child = Organism.reproduce(this, childEnergy, rng, world.nextOrganismId(), false);
            world.addOrganism(child);
            const cx = this.clampPos(this.x + rng.range(-1, 1), world.width);
            const cy = this.clampPos(this.y + rng.range(-1, 1), world.height);
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
    tickMetabolism() {
        const t = this.genome.traits;
        const sizePenalty = t.size * 0.1;
        this.energy -= t.baseMaintenance + t.thinkCost * this.brain.hidden + sizePenalty;
        this.age += 1;
        if (this.energy <= 0 || this.age >= t.maxAge) {
            this.dead = true;
        }
    }
    learn(reward) {
        if (!this.lastPercept || !this.lastOutput)
            return;
        const t = this.genome.traits;
        this.brain.hebbianLearn(this.lastPercept, this.lastOutput, reward, t.mutationRate * 0.5 + 0.01, 0.0005);
    }
    memoryMean() {
        if (this.memoryCount === 0)
            return 0;
        let s = 0;
        for (let i = 0; i < this.memoryCount; i++)
            s += this.memory[i];
        return s / this.memoryCount;
    }
    memoryWrite(value) {
        const cap = this.memory.length;
        this.memory[this.memoryWriteIdx] = value;
        this.memoryWriteIdx = (this.memoryWriteIdx + 1) % cap;
        if (this.memoryCount < cap)
            this.memoryCount++;
    }
    clampPos(v, limit) {
        return ((v % limit) + limit) % limit;
    }
    static reproduce(parent, childEnergy, rng, childId, sexual = false, otherParent = null, generationOffset = 1, colonyId = null, role = "free") {
        let childGenome;
        if (sexual && otherParent) {
            childGenome = crossoverGenome(parent.genome, otherParent.genome, rng);
            childGenome = mutateGenome(childGenome, rng);
        }
        else {
            childGenome = mutateGenome(parent.genome, rng);
        }
        const generation = Math.max(parent.generation, otherParent?.generation ?? 0) +
            generationOffset;
        return new Organism(childId, parent.x, parent.y, childEnergy, childGenome, parent.id, generation, colonyId, role, DEFAULT_LAYOUT);
    }
    static sexualReproduce(a, b, rng, childId, colonyId = null, role = "free") {
        const childEnergy = (a.genome.traits.reproductionCost +
            b.genome.traits.reproductionCost) *
            0.5;
        const child = Organism.reproduce(a, childEnergy, rng, childId, true, b, 1, colonyId, role);
        return child;
    }
    getState() {
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
}
