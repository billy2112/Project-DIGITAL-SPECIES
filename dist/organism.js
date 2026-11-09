import { clamp } from "./rng.js";
import { DEFAULT_LAYOUT } from "./genome.js";
import { Brain } from "./brain.js";
import { mutateGenome } from "./genome.js";
export class Organism {
    id;
    x;
    y;
    energy;
    age = 0;
    dead = false;
    genome;
    brain;
    memory;
    memoryCount = 0;
    memoryWriteIdx = 0;
    lastPercept = null;
    lastOutput = null;
    constructor(id, x, y, energy, genome, layout = DEFAULT_LAYOUT) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.energy = energy;
        this.genome = genome;
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
                }
            }
        });
        const area = Math.PI * vision * vision;
        const inputs = new Float32Array(12);
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
        this.lastPercept = inputs;
        return inputs;
    }
    think(inputs) {
        const out = new Float32Array(6);
        this.brain.forward(inputs, out);
        this.lastOutput = out;
        return out;
    }
    act(outputs, world, rng) {
        const t = this.genome.traits;
        const events = [];
        const dx = outputs[0];
        const dy = outputs[1];
        const consume = outputs[2];
        const reproduce = outputs[3];
        const signal = outputs[4];
        const memoryWrite = outputs[5];
        const moveDist = Math.hypot(dx, dy) * t.speed;
        const nx = this.clampPos(this.x + dx * t.speed, world.width);
        const ny = this.clampPos(this.y + dy * t.speed, world.height);
        this.energy -= t.moveCost * moveDist;
        this.x = nx;
        this.y = ny;
        if (signal > 0.5) {
            const fx = Math.floor(this.x);
            const fy = Math.floor(this.y);
            world.depositPheromone(fx, fy, 1.0);
            this.energy -= 0.5;
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
        if (reproduce > 0.8 &&
            this.energy > t.reproductionThreshold &&
            this.age > 50) {
            const childEnergy = t.reproductionCost;
            this.energy -= childEnergy;
            const child = Organism.reproduce(this, childEnergy, rng, world.nextOrganismId());
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
            });
        }
        return events;
    }
    tickMetabolism() {
        const t = this.genome.traits;
        this.energy -= t.baseMaintenance + t.thinkCost * this.brain.hidden;
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
    static reproduce(parent, childEnergy, rng, childId) {
        const childGenome = mutateGenome(parent.genome, rng);
        return new Organism(childId, parent.x, parent.y, childEnergy, childGenome, DEFAULT_LAYOUT);
    }
    getState() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            energy: this.energy,
            age: this.age,
            maxAge: this.genome.traits.maxAge,
            dead: this.dead,
            genome: this.genome,
        };
    }
}
